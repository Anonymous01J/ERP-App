import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useMemo } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Button, Appbar, useTheme, Switch, Divider, Menu, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { NumericInput } from '@components/ui/NumericInput';
import { CustomCard } from '@components/ui/CustomCard';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { ProductoPresentacion, BobinaGrande } from '../../core/powersync/types';

interface BobinaActivaRow extends BobinaGrande {
  tipo_papel_nombre: string | null;
}

interface PedidoProduccionRow {
  id_pedido: string;
  razon_social: string;
  estado: string;
  fecha_entrega_estimada: string;
  id_producto: string;
  cantidad_solicitada: number;
  cantidad_producida: number | null;
  producto_nombre: string;
}

export function RegistrarProduccionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  const [menuVisible, setMenuVisible] = useState(false);
  const [bobinaSeleccionada, setBobinaSeleccionada] = useState<BobinaActivaRow | null>(null);
  
  // Estado de cantidades por presentación: { id_producto: cantidad }
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  
  const [vincularPedido, setVincularPedido] = useState(false);
  const [pedidosVinculados, setPedidosVinculados] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Consultas PowerSync
  const { data: bobinas = [] } = useQuery<BobinaActivaRow>(`
    SELECT bg.id, bg.id_tipo_papel, bg.peso_actual_kg, bg.peso_inicial_kg, bg.estado, tp.nombre as tipo_papel_nombre
    FROM bobinas_grandes bg
    LEFT JOIN tipos_papel tp ON bg.id_tipo_papel = tp.id
    WHERE bg.estado IN ('disponible', 'en_uso')
    ORDER BY bg.fecha_llegada ASC
  `);

  const { data: presentaciones = [] } = useQuery<ProductoPresentacion>(`
    SELECT id, nombre, peso_real_g 
    FROM productos_presentacion 
    WHERE estado = 'activo'
    ORDER BY peso_nominal_g ASC
  `);

  // Obtener pedidos pendientes o en producción con sus detalles
  const { data: pedidosData = [] } = useQuery<PedidoProduccionRow>(`
    SELECT 
      p.id as id_pedido, 
      c.razon_social, 
      p.estado,
      p.fecha_entrega_estimada,
      dp.id_producto, 
      dp.cantidad_solicitada, 
      dp.cantidad_producida,
      prod.nombre as producto_nombre
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    JOIN detalles_pedido dp ON dp.id_pedido = p.id
    LEFT JOIN productos_presentacion prod ON prod.id = dp.id_producto
    WHERE p.estado IN ('pendiente', 'en_produccion') AND dp.id_producto IS NOT NULL
    ORDER BY p.fecha_entrega_estimada ASC
  `);

  // Procesar pedidos para mostrar opciones agrupadas, ya vienen ordenados por fecha
  const pedidosPendientes = useMemo(() => {
    const agrupados: Record<string, any> = {};
    for (const row of pedidosData) {
      if (!agrupados[row.id_pedido]) {
        agrupados[row.id_pedido] = {
          id: row.id_pedido,
          cliente: row.razon_social,
          fecha_entrega: row.fecha_entrega_estimada,
          detalles: [],
          necesidades: {} // { id_producto: faltante }
        };
      }
      const faltante = Math.max(0, row.cantidad_solicitada - (row.cantidad_producida || 0));
      if (faltante > 0) {
        agrupados[row.id_pedido].detalles.push(`${faltante}x ${row.producto_nombre}`);
        agrupados[row.id_pedido].necesidades[row.id_producto] = faltante;
      }
    }
    // Convertir a arreglo y mantener el orden por fecha
    return Object.values(agrupados)
      .filter(p => p.detalles.length > 0)
      .sort((a, b) => new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime());
  }, [pedidosData]);

  const totalRollos = Object.values(cantidades).reduce((acc, curr) => acc + curr, 0);

  const handleCantidadesChange = (idProducto: string, val: number) => {
    setCantidades(prev => ({ ...prev, [idProducto]: val }));
  };

  const handleTogglePedido = (id: string) => {
    if (pedidosVinculados.includes(id)) {
      setPedidosVinculados(pedidosVinculados.filter(p => p !== id));
    } else {
      setPedidosVinculados([...pedidosVinculados, id]);
    }
  };

  const handleAutoAsignar = () => {
    if (totalRollos === 0) {
      Toast.show({ type: 'info', text1: 'Ingresa cantidades primero', text2: 'No hay rollos para asignar.' });
      return;
    }

    // Simulamos el consumo para ver a qué pedidos llegamos a cubrir
    const virtuales = { ...cantidades };
    const seleccionados = new Set<string>();

    for (const pedido of pedidosPendientes) {
      let sirvio = false;
      for (const idProd of Object.keys(pedido.necesidades)) {
        if (virtuales[idProd] && virtuales[idProd] > 0) {
          const asignar = Math.min(virtuales[idProd], pedido.necesidades[idProd]);
          if (asignar > 0) {
            virtuales[idProd] -= asignar;
            sirvio = true;
          }
        }
      }
      if (sirvio) {
        seleccionados.add(pedido.id);
      }
    }

    setPedidosVinculados(Array.from(seleccionados));
    Toast.show({ type: 'success', text1: 'Asignación Automática', text2: `Se seleccionaron ${seleccionados.size} pedidos prioritarios.` });
  };

  const handleGuardar = async () => {
    if (!bobinaSeleccionada || totalRollos === 0) return;
    setSaving(true);
    
    try {
      const now = new Date().toISOString();
      let totalKgConsumidos = 0;

      await powerSync.writeTransaction(async (tx) => {
        // Iterar sobre cada presentación que se produjo
        for (const prod of presentaciones) {
        const qTotal = cantidades[prod.id] || 0;
        if (qTotal <= 0) continue;

        let qRestante = qTotal;

        // 1. Asignar a Pedidos seleccionados (si aplica)
        if (vincularPedido && pedidosVinculados.length > 0) {
          for (const idPedido of pedidosVinculados) {
            if (qRestante <= 0) break;
            
            // Buscar cuánto necesita este pedido de este producto
            const pedidoRow = pedidosData.find(p => p.id_pedido === idPedido && p.id_producto === prod.id);
            if (pedidoRow) {
              const faltante = Math.max(0, pedidoRow.cantidad_solicitada - (pedidoRow.cantidad_producida || 0));
              const asignar = Math.min(qRestante, faltante);
              
              if (asignar > 0) {
                // Actualizar detalle de pedido
                await tx.execute(
                  `UPDATE detalles_pedido SET cantidad_producida = COALESCE(cantidad_producida, 0) + ? WHERE id_pedido = ? AND id_producto = ?`,
                  [asignar, idPedido, prod.id]
                );

                // Insertar registro de producción
                const idProdDiaria = uuidv4();
                await tx.execute(
                  `INSERT INTO produccion_diaria (id, id_producto, id_pedido_destino, fecha, cantidad_rollos_total) VALUES (?, ?, ?, ?, ?)`,
                  [idProdDiaria, prod.id, idPedido, now, asignar]
                );

                // Registrar consumo
                const kgConsumidos = (asignar * (prod.peso_real_g || 0)) / 1000;
                totalKgConsumidos += kgConsumidos;
                await tx.execute(
                  `INSERT INTO consumo_bobinas (id, id_produccion, id_bobina, kg_consumidos) VALUES (?, ?, ?, ?)`,
                  [uuidv4(), idProdDiaria, bobinaSeleccionada.id, kgConsumidos]
                );

                qRestante -= asignar;

                // Actualizar estado del pedido (evaluar si ya se completó en base a los nuevos datos)
                // Usamos una subconsulta para ver si quedan detalles por producir
                const { rows } = await tx.execute(
                  `SELECT COUNT(*) as faltantes FROM detalles_pedido WHERE id_pedido = ? AND cantidad_producida < cantidad_solicitada`,
                  [idPedido]
                );
                const faltantes = rows?.item(0)?.faltantes || 0;
                const nuevoEstado = faltantes === 0 ? 'listo' : 'en_produccion';
                await tx.execute(`UPDATE pedidos SET estado = ? WHERE id = ?`, [nuevoEstado, idPedido]);
              }
            }
          }
        }

        // 2. Asignar el remanente al Stock General
        if (qRestante > 0) {
          // Actualizar stock de presentación
          await tx.execute(
            `UPDATE productos_presentacion SET stock_unidades_sueltas = COALESCE(stock_unidades_sueltas, 0) + ? WHERE id = ?`,
            [qRestante, prod.id]
          );

          // Insertar registro de producción
          const idProdDiaria = uuidv4();
          await tx.execute(
            `INSERT INTO produccion_diaria (id, id_producto, id_pedido_destino, fecha, cantidad_rollos_total) VALUES (?, ?, NULL, ?, ?)`,
            [idProdDiaria, prod.id, now, qRestante]
          );

          // Registrar consumo
          const kgConsumidos = (qRestante * (prod.peso_real_g || 0)) / 1000;
          totalKgConsumidos += kgConsumidos;
          await tx.execute(
            `INSERT INTO consumo_bobinas (id, id_produccion, id_bobina, kg_consumidos) VALUES (?, ?, ?, ?)`,
            [uuidv4(), idProdDiaria, bobinaSeleccionada.id, kgConsumidos]
          );
        }
      }

      // 3. Descontar kilos totales a la bobina
      if (totalKgConsumidos > 0) {
        const pesoActual = bobinaSeleccionada.peso_actual_kg ?? bobinaSeleccionada.peso_inicial_kg;
        const nuevoPeso = Math.max(0, pesoActual - totalKgConsumidos);
        const nuevoEstado = nuevoPeso <= 0 ? 'agotada' : 'en_uso';
        const fechaUso = bobinaSeleccionada.estado === 'disponible' ? now : bobinaSeleccionada.fecha_uso;
        const fechaGasto = nuevoEstado === 'agotada' ? now : bobinaSeleccionada.fecha_gasto;

        await tx.execute(
          `UPDATE bobinas_grandes SET peso_actual_kg = ?, estado = ?, fecha_uso = ?, fecha_gasto = ? WHERE id = ?`,
          [nuevoPeso, nuevoEstado, fechaUso, fechaGasto, bobinaSeleccionada.id]
        );
      }
    });

      Toast.show({ type: 'success', text1: 'Producción Registrada', text2: `Se consumieron ${totalKgConsumidos.toFixed(2)}kg teóricos.` });
      router.back();
    } catch (e) {
      console.error('Error guardando producción:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo registrar la producción.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={saving} />
        <Appbar.Content title="Registrar Producción" />
      </Appbar.Header>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={globalStyles.scrollContent}>
          
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>1. Origen y Material</Text>
              
              <Text variant="bodyMedium" style={{ marginBottom: 8, color: '#555' }}>Bobina Madre a Descontar</Text>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible(true)} 
                    style={styles.menuAnchor}
                    icon="chevron-down"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                  >
                    {bobinaSeleccionada 
                      ? `Bobina Tipo ${bobinaSeleccionada.tipo_papel_nombre ?? '?'} (${(bobinaSeleccionada.peso_actual_kg ?? bobinaSeleccionada.peso_inicial_kg).toFixed(1)}kg)` 
                      : 'Seleccionar Bobina'}
                  </Button>
                }
              >
                {bobinas.map(bob => (
                  <Menu.Item 
                    key={bob.id}
                    onPress={() => { setBobinaSeleccionada(bob); setMenuVisible(false); }} 
                    title={`Tipo ${bob.tipo_papel_nombre ?? '?'} (${(bob.peso_actual_kg ?? bob.peso_inicial_kg).toFixed(1)}kg disponibles)`}
                  />
                ))}
                {bobinas.length === 0 && (
                  <Menu.Item title="No hay bobinas activas" disabled />
                )}
              </Menu>
            </View>
          </CustomCard>

          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>2. Rollos Producidos</Text>
              
              {presentaciones.map((prod, index) => (
                <View key={prod.id}>
                  <View style={styles.inputRow}>
                    <View>
                      <Text variant="bodyLarge">{prod.nombre}</Text>
                      <Text variant="bodySmall" style={{ color: '#888' }}>{prod.peso_real_g}g reales</Text>
                    </View>
                    <NumericInput 
                      value={cantidades[prod.id] || 0} 
                      onChange={(val) => handleCantidadesChange(prod.id, val)} 
                    />
                  </View>
                  {index < presentaciones.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            </View>
          </CustomCard>

          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>3. Destino y Asignación</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text variant="bodyLarge">Vincular a Pedidos Pendientes</Text>
                  <Text variant="bodySmall" style={{ color: '#666' }}>Reserva el material de inmediato para despachos.</Text>
                </View>
                <Switch value={vincularPedido} onValueChange={setVincularPedido} color={theme.colors.primary} />
              </View>
              
              {vincularPedido && (
                <View style={{ marginTop: 16 }}>
                  {pedidosPendientes.length === 0 ? (
                    <Text variant="bodyMedium" style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
                      No hay pedidos pendientes actualmente.
                    </Text>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Pedidos Pendientes:</Text>
                        <Button 
                          mode="contained-tonal" 
                          icon="magic-staff" 
                          compact 
                          onPress={handleAutoAsignar}
                          style={{ borderRadius: 8 }}
                          labelStyle={{ fontSize: 12 }}
                        >
                          Auto-Asignar
                        </Button>
                      </View>
                      
                      {pedidosPendientes.map((p: any) => {
                        const d = new Date(p.fecha_entrega);
                        const isUrgente = (d.getTime() - new Date().getTime()) < (3 * 24 * 60 * 60 * 1000); // < 3 días
                        return (
                          <Checkbox.Item 
                            key={p.id} 
                            label={`${p.cliente} - Entregar: ${d.toLocaleDateString('es-VE')} \n(Faltan: ${p.detalles.join(', ')})`}
                            labelStyle={{ fontSize: 13, color: isUrgente ? theme.colors.error : '#333' }}
                            status={pedidosVinculados.includes(p.id) ? 'checked' : 'unchecked'}
                            onPress={() => handleTogglePedido(p.id)}
                            mode="android"
                          />
                        );
                      })}
                      
                      <View style={styles.infoBox}>
                        <Text variant="bodySmall" style={{ color: '#555', textAlign: 'center' }}>
                          Nota: La producción se asignará a los pedidos seleccionados hasta cubrir sus cuotas. Cualquier cantidad excedente pasará automáticamente al inventario libre.
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {!vincularPedido && (
                <View style={[styles.infoBox, { backgroundColor: '#f0fdf4' }]}>
                  <Text variant="bodySmall" style={{ color: '#16a34a', textAlign: 'center' }}>
                    Esta producción irá completa al Inventario Libre (Rollos sueltos).
                  </Text>
                </View>
              )}
            </View>
          </CustomCard>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[globalStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={globalStyles.saveButton}
          contentStyle={globalStyles.saveButtonContent}
          disabled={!bobinaSeleccionada || totalRollos === 0 || saving}
          loading={saving}
          icon="check-circle"
        >
          Guardar Producción
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  
  
  
  cardContent: { padding: 16 },
  
  menuAnchor: { marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  divider: { marginVertical: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoBox: { marginTop: 16, padding: 16, backgroundColor: '#E3F2FD', borderRadius: 8 },
  
  
  
});

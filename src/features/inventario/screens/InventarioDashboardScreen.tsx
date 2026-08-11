import React, { useState } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import {  View, StyleSheet, ScrollView, Alert , RefreshControl } from 'react-native';
import {
  SegmentedButtons, List, Text, Button, Divider,
  useTheme, Dialog, Portal, TextInput, ProgressBar, Menu, IconButton, Modal
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CustomCard } from '@ui/CustomCard';
import { usePowerSync, useQuery } from '@powersync/react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { TipoPapel, ProductoPresentacion, BobinaGrande } from '../../core/powersync/types';

interface BobinaActivaRow extends BobinaGrande {
  tipo_papel_nombre: string | null;
}

interface ProductoReventaRow {
  id: string;
  nombre_producto: string;
  descripcion: string | null;
  stock_unidades: number;
  precio_venta_usd: number;
  estado: string;
}

export function InventarioDashboardScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const [tab, setTab] = useState('bobinas');
  const [filtroOtros, setFiltroOtros] = useState('activo');
  
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // --- Dialog de merma ---
  const [dialogVisible, setDialogVisible] = useState(false);
  const [bobinaSeleccionada, setBobinaSeleccionada] = useState<BobinaActivaRow | null>(null);
  const [mermaKg, setMermaKg] = useState('');
  const [savingMerma, setSavingMerma] = useState(false);

  // --- Modal de Ajuste ---
  const [modalAjusteVisible, setModalAjusteVisible] = useState(false);
  const [productoAjuste, setProductoAjuste] = useState<any>(null);
  const [ajusteTipo, setAjusteTipo] = useState<'salida' | 'ingreso'>('salida');
  const [ajusteCantidad, setAjusteCantidad] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [savingAjuste, setSavingAjuste] = useState(false);

  // --- Modal Asignar Pedido ---
  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [productoAsignar, setProductoAsignar] = useState<any>(null);
  const [tipoProductoAsignar, setTipoProductoAsignar] = useState<'papel' | 'reventa'>('papel');
  const [pedidosCandidatos, setPedidosCandidatos] = useState<any[]>([]);
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState<string>('');
  const [cantidadAsignar, setCantidadAsignar] = useState('');
  const [savingAsignar, setSavingAsignar] = useState(false);

  // --- Queries ---
  const { data: bobinasActivas = [] } = useQuery<BobinaActivaRow>(`
    SELECT bg.id, bg.id_tipo_papel, bg.peso_inicial_kg, bg.peso_actual_kg,
           bg.merma_core_kg, bg.peso_muerto_kg, bg.costo_bobina,
           bg.fecha_llegada, bg.estado, bg.id_viaje_compra,
           tp.nombre as tipo_papel_nombre
    FROM bobinas_grandes bg
    LEFT JOIN tipos_papel tp ON bg.id_tipo_papel = tp.id
    WHERE bg.estado IN ('disponible', 'en_uso')
    ORDER BY bg.fecha_llegada ASC
  `);

  const { data: tiposPapel = [] } = useQuery<TipoPapel>(`
    SELECT id, nombre FROM tipos_papel WHERE estado = 'activo' ORDER BY nombre ASC
  `);

  const { data: presentaciones = [] } = useQuery<ProductoPresentacion>(`
    SELECT id, nombre, stock_unidades_sueltas, rollos_por_paquete, precio_USD
    FROM productos_presentacion
    WHERE estado = 'activo'
    ORDER BY peso_nominal_g ASC
  `);

  const { data: productosReventa = [] } = useQuery<ProductoReventaRow>(
    `SELECT id, nombre_producto, descripcion, stock_unidades, precio_venta_usd, estado
     FROM productos_reventa
     WHERE estado = ?
     ORDER BY nombre_producto ASC`,
    [filtroOtros]
  );

  // Agrupar kilos por tipo de papel dinámicamente
  const kgPorTipo = tiposPapel.map(tp => {
    const total = bobinasActivas
      .filter(b => b.id_tipo_papel === tp.id)
      .reduce((acc, b) => acc + (b.peso_actual_kg ?? b.peso_inicial_kg ?? 0), 0);
    return { id: tp.id, nombre: tp.nombre, total };
  });

  const handleAbrirMerma = (bobina: BobinaActivaRow) => {
    setBobinaSeleccionada(bobina);
    setMermaKg('');
    setDialogVisible(true);
  };

  const toggleAccordion = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleEditProducto = (id: string) => {
    router.push(`/(screens)/registrar-producto?id=${id}`);
  };

  const handleToggleEstadoProducto = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await powerSync.execute(`UPDATE productos_reventa SET estado = ? WHERE id = ?`, [nuevoEstado, id]);
      Toast.show({ type: 'success', text1: `Producto ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}` });
    } catch(e) {
      Toast.show({ type: 'error', text1: 'Error al cambiar estado' });
    }
  };

  const handleHistorialProducto = (id: string) => {
    router.push(`/(screens)/historial-productos?id_producto=${id}`);
  };

  const handleOpenAjuste = (producto: any) => {
    setProductoAjuste(producto);
    setAjusteTipo('salida');
    setAjusteCantidad('');
    setAjusteMotivo('');
    setModalAjusteVisible(true);
  };

  const handleSaveAjuste = async () => {
    const qty = parseInt(ajusteCantidad);
    if (isNaN(qty) || qty <= 0) {
      Toast.show({ type: 'error', text1: 'Cantidad inválida', text2: 'Ingresa un número mayor a 0.' });
      return;
    }
    if (!ajusteMotivo.trim()) {
      Toast.show({ type: 'error', text1: 'Motivo requerido', text2: 'Por favor, indica el motivo del ajuste.' });
      return;
    }
    if (ajusteTipo === 'salida' && qty > productoAjuste.stock_unidades) {
      Toast.show({ type: 'error', text1: 'Stock insuficiente', text2: 'No puedes retirar más de lo que hay en stock.' });
      return;
    }

    setSavingAjuste(true);
    try {
      const now = new Date().toISOString();
      const nuevoStock = ajusteTipo === 'salida' 
        ? productoAjuste.stock_unidades - qty 
        : productoAjuste.stock_unidades + qty;

      await powerSync.writeTransaction(async (tx) => {
        await tx.execute(`UPDATE productos_reventa SET stock_unidades = ? WHERE id = ?`, [nuevoStock, productoAjuste.id]);
        await tx.execute(
          `INSERT INTO historial_productos (id, id_producto, cantidad, tipo, origen, referencia_id, entidad_relacionada, fecha)
           VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
          [uuidv4(), productoAjuste.id, qty, ajusteTipo, 'ajuste_manual', ajusteMotivo, now]
        );
      });

      Toast.show({ type: 'success', text1: 'Ajuste guardado', text2: `Stock actualizado a ${nuevoStock}.` });
      setModalAjusteVisible(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al ajustar stock' });
    } finally {
      setSavingAjuste(false);
    }
  };

  const handleOpenAsignar = async (producto: any, tipo: 'papel' | 'reventa') => {
    setProductoAsignar(producto);
    setTipoProductoAsignar(tipo);
    setCantidadAsignar('');
    setPedidoSeleccionadoId('');
    
    const query = tipo === 'papel' 
      ? `SELECT dp.id_pedido, p.fecha_creacion, c.razon_social, dp.cantidad_solicitada, COALESCE(dp.cantidad_producida, 0) as cantidad_producida 
         FROM detalles_pedido dp
         JOIN pedidos p ON p.id = dp.id_pedido
         JOIN clientes c ON c.id = p.id_cliente
         WHERE (p.estado = 'pendiente' OR p.estado = 'en_produccion')
         AND dp.id_producto = ?
         AND COALESCE(dp.cantidad_producida, 0) < dp.cantidad_solicitada`
      : `SELECT dp.id_pedido, p.fecha_creacion, c.razon_social, dp.cantidad_solicitada, COALESCE(dp.cantidad_producida, 0) as cantidad_producida 
         FROM detalles_pedido dp
         JOIN pedidos p ON p.id = dp.id_pedido
         JOIN clientes c ON c.id = p.id_cliente
         WHERE (p.estado = 'pendiente' OR p.estado = 'en_produccion')
         AND dp.id_producto_reventa = ?
         AND COALESCE(dp.cantidad_producida, 0) < dp.cantidad_solicitada`;
         
    const res = await powerSync.getAll(query, [producto.id]);
    setPedidosCandidatos(res);
    setModalAsignarVisible(true);
  };

  const handleSaveAsignar = async () => {
    const qty = parseInt(cantidadAsignar);
    if (!pedidoSeleccionadoId) {
      Toast.show({ type: 'error', text1: 'Seleccione un pedido' });
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      Toast.show({ type: 'error', text1: 'Cantidad inválida' });
      return;
    }

    const candidato = pedidosCandidatos.find(p => p.id_pedido === pedidoSeleccionadoId);
    if (!candidato) return;

    const faltante = candidato.cantidad_solicitada - candidato.cantidad_producida;
    if (qty > faltante) {
      Toast.show({ type: 'error', text1: 'Excede faltante', text2: `El pedido solo necesita ${faltante}.` });
      return;
    }

    const stockActual = tipoProductoAsignar === 'papel' ? (productoAsignar.stock_unidades_sueltas || 0) : (productoAsignar.stock_unidades || 0);
    if (qty > stockActual) {
      Toast.show({ type: 'error', text1: 'Stock insuficiente' });
      return;
    }

    setSavingAsignar(true);
    try {
      const now = new Date().toISOString();
      await powerSync.writeTransaction(async (tx) => {
        if (tipoProductoAsignar === 'papel') {
          await tx.execute('UPDATE productos_presentacion SET stock_unidades_sueltas = stock_unidades_sueltas - ? WHERE id = ?', [qty, productoAsignar.id]);
          await tx.execute('UPDATE detalles_pedido SET cantidad_producida = COALESCE(cantidad_producida, 0) + ? WHERE id_pedido = ? AND id_producto = ?', [qty, pedidoSeleccionadoId, productoAsignar.id]);
        } else {
          await tx.execute('UPDATE productos_reventa SET stock_unidades = stock_unidades - ? WHERE id = ?', [qty, productoAsignar.id]);
          await tx.execute('UPDATE detalles_pedido SET cantidad_producida = COALESCE(cantidad_producida, 0) + ? WHERE id_pedido = ? AND id_producto_reventa = ?', [qty, pedidoSeleccionadoId, productoAsignar.id]);
          await tx.execute(
            `INSERT INTO historial_productos (id, id_producto, cantidad, tipo, origen, referencia_id, entidad_relacionada, fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), productoAsignar.id, qty, 'salida', 'venta_pedido', pedidoSeleccionadoId, candidato.razon_social, now]
          );
        }

        const { rows: rowsFaltantes } = await tx.execute(`SELECT COUNT(*) as cuenta FROM detalles_pedido WHERE id_pedido = ? AND COALESCE(cantidad_producida, 0) < cantidad_solicitada`, [pedidoSeleccionadoId]);
        if (rowsFaltantes && rowsFaltantes.length > 0 && rowsFaltantes.item(0).cuenta === 0) {
          await tx.execute(`UPDATE pedidos SET estado = 'listo' WHERE id = ?`, [pedidoSeleccionadoId]);
          Toast.show({ type: 'success', text1: 'Pedido Surtido', text2: 'Se surtió completamente y pasó a Listo.' });
        } else {
          await tx.execute(`UPDATE pedidos SET estado = 'en_produccion' WHERE id = ? AND estado = 'pendiente'`, [pedidoSeleccionadoId]);
          Toast.show({ type: 'success', text1: 'Asignado', text2: 'Se transfirió al pedido.' });
        }
      });
      setModalAsignarVisible(false);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Error al asignar' });
    } finally {
      setSavingAsignar(false);
    }
  };

  const handleGuardarMerma = async () => {
    const merma = parseFloat(mermaKg) || 0;
    if (merma <= 0) {
      Toast.show({ type: 'error', text1: 'Ingresa el valor de la merma.' });
      return;
    }
    setSavingMerma(true);
    try {
      if (!bobinaSeleccionada) return;
      const pesoActual = bobinaSeleccionada.peso_actual_kg ?? bobinaSeleccionada.peso_inicial_kg;
      const muerto = Math.max(0, pesoActual - merma);
      const nuevoPeso = 0;
      const nuevoEstado = 'agotada';
      const fechaGasto = new Date().toISOString();

      await powerSync.execute(
        `UPDATE bobinas_grandes SET
           peso_actual_kg = ?,
           merma_core_kg = COALESCE(merma_core_kg, 0) + ?,
           peso_muerto_kg = COALESCE(peso_muerto_kg, 0) + ?,
           estado = ?,
           fecha_gasto = ?
         WHERE id = ?`,
        [nuevoPeso, merma, muerto, nuevoEstado, fechaGasto, bobinaSeleccionada.id]
      );

      Toast.show({
        type: 'success',
        text1: 'Bobina Agotada',
        text2: `Merma y core registrados exitosamente.`,
      });
      setDialogVisible(false);
    } catch (error) {
      console.error('Error registrando merma:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar la bobina.' });
    } finally {
      setSavingMerma(false);
    }
  };

  const renderBobinas = () => (
    <View>
      {/* Resumen de inventario */}
      <CustomCard style={styles.resumenCard}>
        <View style={styles.resumenContent}>
          <View style={styles.resumenItem}>
            <MaterialCommunityIcons name="archive-outline" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {bobinasActivas.length}
            </Text>
            <Text variant="bodySmall" style={styles.resumenLabel}>Bobinas activas</Text>
          </View>
          {kgPorTipo.map((kp) => (
            <React.Fragment key={kp.id}>
              <View style={styles.resumenDivider} />
              <View style={styles.resumenItem}>
                <MaterialCommunityIcons name="label-outline" size={28} color="#6366f1" />
                <Text variant="headlineMedium" style={{ color: '#6366f1', fontWeight: 'bold' }}>
                  {kp.total.toFixed(0)}
                </Text>
                <Text variant="bodySmall" style={styles.resumenLabel}>kg {kp.nombre}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </CustomCard>

      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={globalStyles.sectionTitle}>Bobinas en Inventario</Text>
        <View>
          <Button mode="text" compact onPress={() => router.push('/(screens)/gestionar-tipos-papel')}>Tipos de Papel</Button>
          <Button mode="text" compact onPress={() => router.push('/(screens)/historial-bobinas')}>Historial</Button>
        </View>
      </View>

      {bobinasActivas.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="archive-off-outline" size={48} color="#d1d5db" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No hay bobinas en inventario.
          </Text>
          <Text variant="bodySmall" style={{ color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
            Las bobinas se agregan al registrar un viaje de compra y completarlo.
          </Text>
        </View>
      ) : (
        bobinasActivas.map(bobina => {
          const pesoActual = bobina.peso_actual_kg ?? bobina.peso_inicial_kg ?? 0;
          const pesoInicial = bobina.peso_inicial_kg ?? 1;
          const progreso = Math.max(0, Math.min(1, pesoActual / pesoInicial));
          const mermaTotal = (bobina.merma_core_kg ?? 0) + (bobina.peso_muerto_kg ?? 0);
          const esEnUso = bobina.estado === 'en_uso';

          return (
            <List.Accordion
              key={bobina.id}
              title={`Tipo ${bobina.tipo_papel_nombre ?? '?'}\n(#${bobina.id.split('-')[0].substring(0, 4).toUpperCase()}) — ${pesoActual.toFixed(1)} kg`}
              description={`Inicial: ${pesoInicial} kg · ${new Date(bobina.fecha_llegada).toLocaleDateString('es-VE')}`}
              left={props => (
                <List.Icon
                  {...props}
                  icon={esEnUso ? 'archive-arrow-up' : 'archive-outline'}
                  color="#6366f1"
                />
              )}
              style={styles.accordion}
              titleStyle={{ fontWeight: 'bold' }}
              titleNumberOfLines={2}
            >
              <View style={styles.accordionContent}>
                {/* Barra de progreso de kilos */}
                <View style={styles.progressRow}>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>Consumo</Text>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                    {(pesoInicial - pesoActual).toFixed(1)} / {pesoInicial} kg
                  </Text>
                </View>
                <ProgressBar
                  progress={1 - progreso}
                  color={progreso < 0.25 ? theme.colors.error : progreso < 0.5 ? '#f59e0b' : theme.colors.primary}
                  style={styles.progressBar}
                />

                <Divider style={{ marginVertical: 12 }} />

                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>Kg Disponibles</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{pesoActual.toFixed(1)} kg</Text>
                </View>
                {mermaTotal > 0 && (
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.detailLabel}>Total merma + core</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.error }}>{mermaTotal.toFixed(1)} kg</Text>
                  </View>
                )}
                {bobina.costo_bobina > 0 && (
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.detailLabel}>Costo Bobina</Text>
                    <Text variant="bodyMedium">${bobina.costo_bobina?.toFixed(2)} USD</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                  <Button
                    mode="outlined"
                    icon="alert-circle-outline"
                    compact
                    onPress={() => handleAbrirMerma(bobina)}
                    style={{ borderRadius: 8 }}
                  >
                    Registrar Merma / Core
                  </Button>
                </View>
              </View>
            </List.Accordion>
          );
        })
      )}
    </View>
  );

  const renderRollos = () => (
    <View>
      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={globalStyles.sectionTitle}>Rollos Empaquetados</Text>
        <View>
          <Button mode="text" compact onPress={() => router.push('/(screens)/historial-produccion')}>Historial</Button>
          <Button mode="text" compact onPress={() => router.push('/(screens)/gestionar-presentaciones')}>Gestionar</Button>
        </View>
      </View>
      {presentaciones.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge" style={styles.emptyText}>No hay presentaciones activas.</Text>
        </View>
      ) : (
        presentaciones.map(prod => {
          const sueltos = prod.stock_unidades_sueltas ?? 0;
          const paquetes = prod.rollos_por_paquete > 0 ? Math.floor(sueltos / prod.rollos_por_paquete) : 0;
          return (
            <CustomCard key={prod.id}>
              <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{prod.nombre}</Text>
                    <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                      {sueltos} rollos sueltos · {paquetes} paquetes ({prod.rollos_por_paquete}×)
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }} adjustsFontSizeToFit numberOfLines={1}>
                    ${prod.precio_USD?.toFixed(2)}
                  </Text>
                </View>
                <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Button mode="contained-tonal" compact icon="truck-delivery" onPress={() => handleOpenAsignar(prod, 'papel')}>
                    Asignar a Pedido
                  </Button>
                </View>
              </View>
            </CustomCard>
          );
        })
      )}
    </View>
  );

  const renderProductosReventa = () => (
    <View>
      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={globalStyles.sectionTitle}>Otros Productos</Text>
      </View>

      <View style={{ marginBottom: 12, marginHorizontal: 4 }}>
        <SegmentedButtons
          value={filtroOtros}
          onValueChange={setFiltroOtros}
          buttons={[
            { value: 'activo', label: 'Activos' },
            { value: 'inactivo', label: 'Inactivos' },
          ]}
        />
      </View>

      {productosReventa.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge" style={styles.emptyText}>No hay productos {filtroOtros}s.</Text>
        </View>
      ) : (
        productosReventa.map(prod => {
          const isExpanded = expandedIds.includes(prod.id);
          const isInactive = prod.estado === 'inactivo';

          return (
            <CustomCard key={prod.id} style={[{ marginBottom: 8 }, isInactive && { opacity: 0.6 }]}>
              <List.Accordion
                title={prod.nombre_producto}
                titleStyle={[{ fontWeight: 'bold' }, isInactive && { color: theme.colors.outline }]}
                description={`Stock: ${prod.stock_unidades} unid.`}
                expanded={isExpanded}
                onPress={() => toggleAccordion(prod.id)}
                style={{ backgroundColor: 'transparent' }}
              >
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Divider style={{ marginBottom: 12 }} />
                  {prod.descripcion ? <Text variant="bodySmall" style={{ color: '#6b7280', marginBottom: 8 }}>{prod.descripcion}</Text> : null}
                  <Text variant="titleSmall" style={{ color: isInactive ? theme.colors.outline : theme.colors.primary, marginBottom: 12 }}>
                    Precio de venta: ${prod.precio_venta_usd?.toFixed(2)}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <Button 
                      mode="outlined" 
                      icon="pencil" 
                      onPress={() => handleEditProducto(prod.id)}
                      style={{ flex: 1 }}
                    >
                      Editar
                    </Button>
                    <Button 
                      mode="contained-tonal" 
                      icon={isInactive ? "check-circle" : "cancel"} 
                      textColor={isInactive ? theme.colors.primary : theme.colors.error}
                      buttonColor={isInactive ? theme.colors.primaryContainer : theme.colors.errorContainer}
                      onPress={() => handleToggleEstadoProducto(prod.id, prod.estado)}
                      style={{ flex: 1 }}
                    >
                      {isInactive ? "Activar" : "Desactivar"}
                    </Button>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <Button 
                      mode="contained-tonal" 
                      icon="swap-vertical" 
                      onPress={() => handleOpenAjuste(prod)}
                      style={{ flex: 1 }}
                    >
                      Ajuste Stock
                    </Button>
                    <Button 
                      mode="outlined" 
                      icon="history" 
                      onPress={() => handleHistorialProducto(prod.id)}
                      style={{ flex: 1 }}
                    >
                      Historial
                    </Button>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Button 
                      mode="contained-tonal" 
                      icon="truck-delivery" 
                      onPress={() => handleOpenAsignar(prod, 'reventa')}
                      style={{ flex: 1 }}
                    >
                      Asignar a Pedido
                    </Button>
                  </View>
                </View>
              </List.Accordion>
            </CustomCard>
          );
        })
      )}
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'bobinas', label: 'Bobinas', icon: 'archive-outline' },
            { value: 'terminado', label: 'Rollos', icon: 'package-variant' },
            { value: 'otros', label: 'Otros Productos', icon: 'shape-outline' },
          ]}
        />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>
        { tab === 'bobinas' && renderBobinas()}
        {tab === 'terminado' && renderRollos()}
        {tab === 'otros' && renderProductosReventa()}
      </ScrollView>

      {tab === 'otros' && (
        <Button
          mode="contained"
          icon="plus"
          onPress={() => router.push('/(screens)/registrar-producto')}
          style={[styles.fabExtended, { bottom: Math.max(insets.bottom + 16, 16) }]}
          contentStyle={{ paddingVertical: 4 }}
        >
          Nuevo Producto
        </Button>
      )}

      {/* Dialog Merma */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Registrar Merma / Core</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 4, color: '#6b7280' }}>
              Bobina Tipo {bobinaSeleccionada?.tipo_papel_nombre ?? '?'} (#{(bobinaSeleccionada?.id || '').split('-')[0].substring(0, 4).toUpperCase()}) —{' '}
              <Text style={{ fontWeight: 'bold', color: '#111' }}>
                {(bobinaSeleccionada?.peso_actual_kg ?? bobinaSeleccionada?.peso_inicial_kg ?? 0).toFixed(1)} kg actuales
              </Text>
            </Text>
            <View style={{ gap: 12 }}>
              <Text variant="bodyMedium" style={{ color: '#6b7280' }}>
                Ingresa los kilos de merma. El peso restante de la bobina será registrado automáticamente como peso muerto (core). La bobina pasará al estado "Agotada".
              </Text>
              <TextInput
                mode="outlined"
                label="Merma (kg)"
                value={mermaKg}
                onChangeText={setMermaKg}
                keyboardType="decimal-pad"
                left={<TextInput.Icon icon="alert-circle-outline" />}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={savingMerma}>Cancelar</Button>
            <Button mode="contained" onPress={handleGuardarMerma} loading={savingMerma} disabled={savingMerma}>
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal de Ajuste de Stock */}
        <Modal visible={modalAjusteVisible} onDismiss={() => setModalAjusteVisible(false)} contentContainerStyle={styles.modalContent}>
          {productoAjuste && (
            <>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: 'bold' }}>
                Ajuste de Stock: {productoAjuste.nombre_producto}
              </Text>
              
              <SegmentedButtons
                value={ajusteTipo}
                onValueChange={(val) => setAjusteTipo(val as 'salida' | 'ingreso')}
                buttons={[
                  { value: 'salida', label: 'Dar de Baja (Salida)' },
                  { value: 'ingreso', label: 'Dar de Alta (Ingreso)' },
                ]}
                style={{ marginBottom: 16 }}
              />

              <TextInput
                mode="outlined"
                label="Cantidad"
                keyboardType="numeric"
                value={ajusteCantidad}
                onChangeText={setAjusteCantidad}
                style={{ marginBottom: 16 }}
              />

              <TextInput
                mode="outlined"
                label="Motivo (Ej: Apertura de bulto, Dañado)"
                value={ajusteMotivo}
                onChangeText={setAjusteMotivo}
                style={{ marginBottom: 24 }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Button onPress={() => setModalAjusteVisible(false)} disabled={savingAjuste}>
                  Cancelar
                </Button>
                <Button mode="contained" onPress={handleSaveAjuste} loading={savingAjuste} disabled={savingAjuste}>
                  Confirmar Ajuste
                </Button>
              </View>
            </>
          )}
        </Modal>

        {/* MODAL ASIGNAR A PEDIDO */}
        <Modal 
          visible={modalAsignarVisible} 
          onDismiss={() => setModalAsignarVisible(false)}
          contentContainerStyle={{ backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16 }}
        >
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Asignar a Pedido
          </Text>
          <Text variant="bodyMedium" style={{ color: '#4b5563', marginBottom: 16 }}>
            {productoAsignar?.nombre || productoAsignar?.nombre_producto} (Stock: {tipoProductoAsignar === 'papel' ? productoAsignar?.stock_unidades_sueltas : productoAsignar?.stock_unidades})
          </Text>
          
          <Text variant="labelMedium" style={{ marginBottom: 4 }}>Pedidos Pendientes (que necesitan esto):</Text>
          {pedidosCandidatos.length === 0 ? (
             <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 16 }}>
               No hay pedidos pendientes que necesiten este producto.
             </Text>
          ) : (
            <ScrollView style={{ maxHeight: 150, marginBottom: 16 }}>
              {pedidosCandidatos.map(ped => (
                <List.Item
                  key={ped.id_pedido}
                  title={ped.razon_social}
                  description={`Faltan: ${ped.cantidad_solicitada - ped.cantidad_producida}`}
                  left={props => <List.Icon {...props} icon="package" />}
                  right={props => (
                    <Button mode={pedidoSeleccionadoId === ped.id_pedido ? "contained" : "outlined"} compact onPress={() => setPedidoSeleccionadoId(ped.id_pedido)}>
                      {pedidoSeleccionadoId === ped.id_pedido ? "Elegido" : "Elegir"}
                    </Button>
                  )}
                />
              ))}
            </ScrollView>
          )}

          <TextInput
            mode="outlined"
            label="Cantidad a enviar"
            keyboardType="numeric"
            value={cantidadAsignar}
            onChangeText={setCantidadAsignar}
            disabled={pedidosCandidatos.length === 0}
            style={{ marginBottom: 24 }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button onPress={() => setModalAsignarVisible(false)} textColor="#6b7280">Cancelar</Button>
            <Button mode="contained" onPress={handleSaveAsignar} loading={savingAsignar} disabled={pedidosCandidatos.length === 0}>
              Asignar
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  
  segmentContainer: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  
  resumenCard: { marginBottom: 12 },
  resumenContent: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 16 },
  resumenItem: { alignItems: 'center', flex: 1, gap: 4 },
  resumenLabel: { color: '#6b7280', textAlign: 'center' },
  resumenDivider: { width: 1, height: 50, backgroundColor: '#e5e7eb' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 4, marginVertical: 8 },
  
  accordion: { backgroundColor: '#ffffff', marginBottom: 6, borderRadius: 10 },
  accordionContent: { padding: 16, backgroundColor: '#FAFAFA', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressBar: { height: 8, borderRadius: 4, marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { color: '#6b7280' },
  cardContent: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 48, padding: 24 },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  fabExtended: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    borderRadius: 28,
    elevation: 4,
  },
});

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import { getTasaDolarBCV } from '@core/api/dolar';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, Linking, RefreshControl } from 'react-native';
import {
  Chip, Text, ProgressBar, Button, useTheme,
  SegmentedButtons, Divider, Dialog, Portal, TextInput,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { CustomCard } from '@ui/CustomCard';
import { CurrencyInput } from '@components/ui/CurrencyInput';
import { parseCurrency, formatCurrencyATM } from '@core/utils/currency';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Pedido } from '../../core/powersync/types';

interface PedidoLogisticaRow extends Pedido {
  razon_social: string;
}

interface PedidoFinanzasRow extends Pedido {
  razon_social: string;
  telefono: string | null;
}

interface AbonoTotalRow {
  id_pedido: string;
  total_abonado: number;
}

interface DetallePedidoConNombresRow {
  id_pedido: string;
  nombre_item: string;
  nombre_tipo_papel: string | null;
  rollos_por_paquete: number | null;
  tiempo_x_paquete_min: number | null;
  cantidad_solicitada: number;
  cantidad_producida: number | null;
}

// Calcula el estado financiero de un pedido a partir de la fecha de vencimiento
function calcularEstadoFinanciero(fechaVencimiento: string | null): 'al_dia' | 'por_vencer' | 'atrasado' {
  if (!fechaVencimiento) return 'al_dia';
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diffDias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'atrasado';
  if (diffDias <= 5) return 'por_vencer';
  return 'al_dia';
}

function estadoFisicoColor(estado: string) {
  switch (estado) {
    case 'listo': return '#4ade80';
    case 'en_produccion': return '#fbbf24';
    case 'pendiente': return '#94a3b8';
    default: return '#e5e7eb';
  }
}
function estadoFisicoLabel(estado: string) {
  switch (estado) {
    case 'listo': return 'LISTO';
    case 'en_produccion': return 'EN PRODUCCIÓN';
    case 'pendiente': return 'PENDIENTE';
    case 'entregado': return 'ENTREGADO';
    default: return estado.toUpperCase();
  }
}
function estadoFinColor(estado: string, theme: any) {
  if (estado === 'atrasado') return theme.colors.error;
  if (estado === 'por_vencer') return '#f59e0b';
  return '#22c55e';
}
function estadoFinLabel(estado: string) {
  if (estado === 'atrasado') return 'ATRASADO';
  if (estado === 'por_vencer') return 'POR VENCER';
  return 'AL DÍA';
}

export function PedidosDashboardScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const [vista, setVista] = useState('logistica');
  const [filtroLog, setFiltroLog] = useState('Todos');
  const [filtroFin, setFiltroFin] = useState('Todos');

  // --- Dialog de abono ---
  const [dialogVisible, setDialogVisible] = useState(false);
  const [pedidoAbonar, setPedidoAbonar] = useState<PedidoFinanzasRow | null>(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [monedaAbono, setMonedaAbono] = useState<'USD' | 'VES'>('USD');
  const [tasaAbono, setTasaAbono] = useState('');
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [savingAbono, setSavingAbono] = useState(false);

  // --- Queries ---
  const filtrosLogSQL: Record<string, string> = {
    'Todos': "AND p.estado IN ('pendiente','en_produccion','listo','entregado')",
    'Pendiente': "AND p.estado = 'pendiente'",
    'En Producción': "AND p.estado = 'en_produccion'",
    'Listo': "AND p.estado = 'listo'",
    'Entregado': "AND p.estado = 'entregado'",
  };

  const { data: pedidosLog = [] } = useQuery<PedidoLogisticaRow>(`
    SELECT p.id, p.estado, p.monto_total, p.fecha_entrega_estimada, c.razon_social
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    WHERE 1=1 ${filtrosLogSQL[filtroLog]}
    ORDER BY p.fecha_entrega_estimada ASC
  `);

  const { data: pedidosFin = [] } = useQuery<PedidoFinanzasRow>(`
    SELECT p.id, p.estado, p.estado_pago, p.monto_total, p.fecha_vencimiento_credito, c.razon_social, c.telefono
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    WHERE p.estado = 'entregado' AND p.estado_pago = 'pendiente'
    ORDER BY p.fecha_vencimiento_credito ASC
  `);

  // Totales abonados por pedido
  const { data: abonosTodos = [] } = useQuery<AbonoTotalRow>(`
    SELECT id_pedido, SUM(monto_equivalente_usd) as total_abonado
    FROM abonos_pagos
    GROUP BY id_pedido
  `);

  // Detalles de pedidos logística
  const { data: detallesTodos = [] } = useQuery<DetallePedidoConNombresRow>(`
    SELECT dp.id_pedido,
      COALESCE(pp.nombre, 'Pote ' || ip.capacidad) as nombre_item,
      tp.nombre as nombre_tipo_papel,
      pp.rollos_por_paquete,
      pp.tiempo_x_paquete_min,
      dp.cantidad_solicitada,
      dp.cantidad_producida
    FROM detalles_pedido dp
    LEFT JOIN productos_presentacion pp ON pp.id = dp.id_producto
    LEFT JOIN inventario_potes ip ON ip.id = dp.id_pote
    LEFT JOIN tipos_papel tp ON tp.id = dp.id_tipo_papel
  `);

  const getDetallesPedido = (idPedido: string) =>
    detallesTodos.filter(d => d.id_pedido === idPedido);

  const getAbonado = (idPedido: string): number => {
    const row = abonosTodos.find(a => a.id_pedido === idPedido);
    return row ? row.total_abonado : 0;
  };

  const getTiempoRestante = (detalles: DetallePedidoConNombresRow[]): string => {
    let totalMin = 0;
    for (const d of detalles) {
      const faltante = Math.max(0, d.cantidad_solicitada - (d.cantidad_producida || 0));
      if (faltante <= 0 || !d.tiempo_x_paquete_min || !d.rollos_por_paquete) continue;
      const paqs = Math.ceil(faltante / d.rollos_por_paquete);
      totalMin += paqs * d.tiempo_x_paquete_min;
    }
    if (totalMin <= 0) return '';
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  // --- Filtrar vista finanzas ---
  const filteredFin = pedidosFin.filter(p => {
    const estado = calcularEstadoFinanciero(p.fecha_vencimiento_credito);
    if (filtroFin === 'Todos') return true;
    if (filtroFin === 'Al Día') return estado === 'al_dia';
    if (filtroFin === 'Por Vencer') return estado === 'por_vencer';
    if (filtroFin === 'Atrasado') return estado === 'atrasado';
    return true;
  });

  // --- Avanzar estado pedido ---
  const handleAvanzarEstado = async (id: string, estadoActual: string) => {
    const siguiente = estadoActual === 'pendiente' ? 'en_produccion' : 'listo';
    try {
      await powerSync.execute('UPDATE pedidos SET estado = ? WHERE id = ?', [siguiente, id]);
      Toast.show({ type: 'success', text1: 'Estado actualizado', text2: estadoFisicoLabel(siguiente) });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el pedido.' });
    }
  };

  // --- Recordatorio WhatsApp ---
  const handleRecordatorioWhatsApp = (pedido: any, saldo: number, estadoFin: string) => {
    if (!pedido.telefono) {
      Toast.show({ type: 'error', text1: 'Sin teléfono', text2: 'El cliente no tiene teléfono registrado.' });
      return;
    }
    // Clean phone number (remove spaces, -, +, etc)
    let cleanPhone = pedido.telefono.replace(/\D/g, '');
    
    // If starts with 0 (e.g. 04141234567), format for Venezuela country code (584141234567)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.substring(1);
    }
    
    let mensaje = '';
    if (estadoFin === 'atrasado') {
      mensaje = `Hola ${pedido.razon_social}, le escribimos para recordarle que su factura tiene un saldo pendiente de $${saldo.toFixed(2)} USD que se encuentra *VENCIDO*. Agradecemos su pronto pago.`;
    } else if (estadoFin === 'por_vencer') {
      mensaje = `Hola ${pedido.razon_social}, le escribimos para recordarle que su factura con saldo de $${saldo.toFixed(2)} USD está próxima a vencer.`;
    } else {
      mensaje = `Hola ${pedido.razon_social}, le adjuntamos el estado de su cuenta. Saldo actual: $${saldo.toFixed(2)} USD.`;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error abriendo WhatsApp:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir WhatsApp.' });
    });
  };

  // --- Consultar tasa de cambio automática ---
  const fetchTasaAuto = useCallback(async () => {
    setLoadingTasa(true);
    try {
      const tasa = await getTasaDolarBCV();
      if (tasa && tasa > 0) {
        setTasaAbono(formatCurrencyATM(tasa.toFixed(2)));
      }
    } catch (e) {
      console.warn('Error al obtener tasa BCV:', e);
      Toast.show({ type: 'info', text1: 'Sin tasa automática', text2: 'Ingresa la tasa manualmente.' });
    } finally {
      setLoadingTasa(false);
    }
  }, []);

  // --- Registrar abono ---
  const openAbonoDialog = (pedido: PedidoFinanzasRow) => {
    setPedidoAbonar(pedido);
    setMontoAbono('');
    setMonedaAbono('USD');
    setTasaAbono('');
    setDialogVisible(true);
    fetchTasaAuto();
  };

  const handleGuardarAbono = async () => {
    if (!pedidoAbonar) return;
    const monto = parseCurrency(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      Toast.show({ type: 'error', text1: 'Monto inválido', text2: 'Ingresa un monto mayor a 0.' });
      return;
    }

    let tasa = 1;
    let equivalenteUsd = monto;

    if (monedaAbono === 'VES') {
      tasa = parseCurrency(tasaAbono);
      if (isNaN(tasa) || tasa <= 0) {
        Toast.show({ type: 'error', text1: 'Tasa inválida', text2: 'Ingresa una tasa de cambio válida.' });
        return;
      }
      equivalenteUsd = monto / tasa;
    }

    const abonadoPrevio = getAbonado(pedidoAbonar.id);
    const saldoActual = (pedidoAbonar.monto_total ?? 0) - abonadoPrevio;

    if (equivalenteUsd > saldoActual + 0.01) {
      Toast.show({
        type: 'error',
        text1: 'Monto excede el saldo',
        text2: `El saldo pendiente es $${saldoActual.toFixed(2)} USD.`
      });
      return;
    }

    setSavingAbono(true);
    try {
      const nuevoId = uuidv4();
      const fechaActual = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO abonos_pagos (id, id_pedido, monto, monto_equivalente_usd, moneda, tasa_cambio, fecha_pago, tipo_pago)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nuevoId, pedidoAbonar.id, monto, equivalenteUsd, monedaAbono, tasa, fechaActual, 'abono']
      );

      // Si el nuevo total abonado cubre el saldo total, actualizar estado_pago a 'pagado'
      const nuevoTotalAbonado = abonadoPrevio + equivalenteUsd;
      if (nuevoTotalAbonado >= (pedidoAbonar.monto_total ?? 0) - 0.01) {
        await powerSync.execute(
          `UPDATE pedidos SET estado_pago = 'pagado' WHERE id = ?`,
          [pedidoAbonar.id]
        );
        Toast.show({ type: 'success', text1: '¡Pedido Saldado!', text2: 'El pedido fue marcado como pagado.' });
      } else {
        Toast.show({ type: 'success', text1: 'Abono registrado', text2: `Quedan $${((pedidoAbonar.monto_total ?? 0) - nuevoTotalAbonado).toFixed(2)} USD pendientes.` });
      }

      setDialogVisible(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo registrar el abono.' });
    } finally {
      setSavingAbono(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 80, 100) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Selector Logística / Cuentas x Cobrar */}
        <SegmentedButtons
          value={vista}
          onValueChange={setVista}
          buttons={[
            { value: 'logistica', label: 'Logística', icon: 'truck-fast' },
            { value: 'finanzas', label: 'Cuentas x Cobrar', icon: 'cash-register' },
          ]}
          style={{ marginBottom: 16 }}
        />

        {/* === VISTA LOGÍSTICA === */}
        {vista === 'logistica' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {['Todos', 'Pendiente', 'En Producción', 'Listo', 'Entregado'].map((cat) => (
                <Chip
                  key={cat}
                  selected={filtroLog === cat}
                  onPress={() => setFiltroLog(cat)}
                  style={{ marginRight: 8 }}
                  selectedColor={theme.colors.primary}
                >
                  {cat}
                </Chip>
              ))}
            </ScrollView>

            {pedidosLog.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#d1d5db" />
                <Text variant="bodyLarge" style={styles.emptyText}>No hay pedidos en esta sección.</Text>
              </View>
            ) : (
              pedidosLog.map((pedido) => {
                const detalles = getDetallesPedido(pedido.id);
                return (
                  <CustomCard key={pedido.id}>
                    <View style={styles.cardContent}>
                      <View style={styles.headerRow}>
                        <Text variant="titleMedium" style={styles.clienteNombre}>{pedido.razon_social}</Text>
                        <View style={[styles.badge, { backgroundColor: estadoFisicoColor(pedido.estado) }]}>
                          <Text style={styles.badgeText}>{estadoFisicoLabel(pedido.estado)}</Text>
                        </View>
                      </View>

                      <Text variant="bodySmall" style={styles.fechaText}>
                        Entrega: {new Date(pedido.fecha_entrega_estimada).toLocaleDateString('es-VE')}
                      </Text>

                      <View style={{ marginVertical: 8 }}>
                        {detalles.length > 0 ? detalles.map((d, i: number) => {
                          const producida = d.cantidad_producida || 0;
                          const faltante = Math.max(0, d.cantidad_solicitada - producida);
                          const isComplete = faltante === 0;

                          let empaqueTxt = '';
                          if (d.rollos_por_paquete && d.rollos_por_paquete > 1) {
                            const paqs = Math.floor(d.cantidad_solicitada / d.rollos_por_paquete);
                            const sueltos = d.cantidad_solicitada % d.rollos_por_paquete;
                            empaqueTxt = ` [${paqs} paq.${sueltos > 0 ? ` + ${sueltos} un.` : ''}]`;
                          }

                          return (
                            <Text key={i} variant="bodySmall" style={{ color: isComplete ? '#16a34a' : '#4b5563', marginBottom: 2 }}>
                              • {producida} / {d.cantidad_solicitada} un.{empaqueTxt} {d.nombre_item}
                              {d.nombre_tipo_papel ? ` (${d.nombre_tipo_papel})` : ''}
                              {!isComplete && faltante > 0 && ` - Faltan ${faltante}`}
                              {isComplete && ' ✓'}
                            </Text>
                          );
                        }) : (
                          <Text variant="bodySmall" style={{ color: '#9ca3af' }}>Sin detalles cargados.</Text>
                        )}

                        {/* Tiempo estimado de producción restante */}
                        {(() => {
                          const tiempoTxt = getTiempoRestante(detalles);
                          if (!tiempoTxt) return null;
                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                              <Text variant="bodySmall" style={{ color: '#6b7280' }}>⏱️ Producción restante estimada:</Text>
                              <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{tiempoTxt}</Text>
                            </View>
                          );
                        })()}
                      </View>

                      <Divider style={{ marginBottom: 10 }} />

                      <View style={styles.actionRow}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                          ${pedido.monto_total?.toFixed(2)} USD
                        </Text>
                        {pedido.estado === 'pendiente' && (
                          <Button
                            mode="contained-tonal"
                            compact
                            onPress={() => handleAvanzarEstado(pedido.id, 'pendiente')}
                            style={{ borderRadius: 8 }}
                          >
                            En Producción →
                          </Button>
                        )}
                        {pedido.estado === 'listo' && (
                          <Chip icon="check-circle" mode="flat" style={{ backgroundColor: '#dcfce7' }}>
                            Listo para entregar
                          </Chip>
                        )}
                      </View>
                    </View>
                  </CustomCard>
                );
              })
            )}
          </>
        )}

        {/* === VISTA FINANZAS === */}
        {vista === 'finanzas' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {['Todos', 'Al Día', 'Por Vencer', 'Atrasado'].map((cat) => (
                <Chip
                  key={cat}
                  selected={filtroFin === cat}
                  onPress={() => setFiltroFin(cat)}
                  style={{ marginRight: 8 }}
                  selectedColor={theme.colors.primary}
                >
                  {cat}
                </Chip>
              ))}
            </ScrollView>

            {filteredFin.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="cash-check" size={48} color="#d1d5db" />
                <Text variant="bodyLarge" style={styles.emptyText}>No hay cuentas pendientes de cobro.</Text>
              </View>
            ) : (
              filteredFin.map((pedido) => {
                const estadoFin = calcularEstadoFinanciero(pedido.fecha_vencimiento_credito);
                const abonado = getAbonado(pedido.id);
                const total = pedido.monto_total ?? 0;
                const progreso = total > 0 ? Math.min(abonado / total, 1) : 0;
                const saldo = total - abonado;

                return (
                  <CustomCard key={pedido.id}>
                    <View style={styles.cardContent}>
                      <View style={styles.headerRow}>
                        <Text variant="titleMedium" style={styles.clienteNombre}>{pedido.razon_social}</Text>
                        <View style={[styles.badge, { backgroundColor: estadoFinColor(estadoFin, theme) }]}>
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>
                            {estadoFinLabel(estadoFin)}
                          </Text>
                        </View>
                      </View>

                      <Text variant="bodySmall" style={styles.fechaText}>
                        Vencimiento: {pedido.fecha_vencimiento_credito ? new Date(pedido.fecha_vencimiento_credito).toLocaleDateString('es-VE') : 'N/A'}
                      </Text>

                      {/* Barra de progreso de pago */}
                      <View style={{ marginVertical: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text variant="bodySmall" style={{ color: '#4b5563' }}>
                            Abonado: ${abonado.toFixed(2)} / ${total.toFixed(2)} USD
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: 'bold' }}>
                            Resta: ${saldo.toFixed(2)}
                          </Text>
                        </View>
                        <ProgressBar progress={progreso} color={theme.colors.primary} style={{ height: 6, borderRadius: 3 }} />
                      </View>

                      <Divider style={{ marginBottom: 10 }} />

                      <View style={styles.actionRow}>
                        <Button
                          mode="outlined"
                          compact
                          icon="whatsapp"
                          onPress={() => handleRecordatorioWhatsApp(pedido, saldo, estadoFin)}
                          textColor="#16a34a"
                          style={{ borderColor: '#16a34a', borderRadius: 8 }}
                        >
                          Recordar
                        </Button>
                        <Button
                          mode="contained"
                          compact
                          icon="cash"
                          onPress={() => openAbonoDialog(pedido)}
                          style={{ borderRadius: 8 }}
                        >
                          Abonar
                        </Button>
                      </View>
                    </View>
                  </CustomCard>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Botón flotante para nuevo pedido */}
      <Button
        mode="contained"
        icon="plus"
        onPress={() => router.push('/(screens)/nuevo-pedido')}
        style={styles.fab}
        contentStyle={{ paddingVertical: 4 }}
      >
        Nuevo Pedido
      </Button>

      {/* Dialog para registrar abono */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Registrar Abono</Dialog.Title>
          <Dialog.Content>
            {pedidoAbonar && (
              <>
                <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>
                  {pedidoAbonar.razon_social}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 16, color: '#6b7280' }}>
                  Saldo Pendiente: ${((pedidoAbonar.monto_total ?? 0) - getAbonado(pedidoAbonar.id)).toFixed(2)} USD
                </Text>

                <SegmentedButtons
                  value={monedaAbono}
                  onValueChange={(val) => setMonedaAbono(val as 'USD' | 'VES')}
                  buttons={[
                    { value: 'USD', label: 'Dólares ($)' },
                    { value: 'VES', label: 'Bolívares (Bs.)' },
                  ]}
                  style={{ marginBottom: 12 }}
                />

                <CurrencyInput
                  label={monedaAbono === 'USD' ? 'Monto en USD ($)' : 'Monto en Bolívares (Bs.)'}
                  value={montoAbono}
                  onChangeText={setMontoAbono}
                  keyboardType="numeric"
                  mode="outlined"
                  style={{ marginBottom: 12 }}
                />

                {monedaAbono === 'VES' && (
                  <CurrencyInput
                    label="Tasa de cambio BCV (Bs/USD)"
                    value={tasaAbono}
                    onChangeText={setTasaAbono}
                    keyboardType="numeric"
                    mode="outlined"
                    placeholder="Ej. 36.5"
                    right={loadingTasa ? <TextInput.Icon icon="sync" spin /> : <TextInput.Icon icon="refresh" onPress={fetchTasaAuto} />}
                    style={{ marginBottom: 12 }}
                  />
                )}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={handleGuardarAbono} loading={savingAbono} disabled={savingAbono}>
              Guardar Abono
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { color: '#9ca3af', marginTop: 12 },
  cardContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clienteNombre: { fontWeight: 'bold', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  fechaText: { color: '#6b7280', marginBottom: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    borderRadius: 28,
    elevation: 4,
  },
});

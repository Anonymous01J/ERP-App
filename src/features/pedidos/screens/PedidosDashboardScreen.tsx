import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Chip, Text, ProgressBar, Button, useTheme,
  SegmentedButtons, Divider, Dialog, Portal, TextInput,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { CustomCard } from '@ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

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
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const [vista, setVista] = useState('logistica');
  const [filtroLog, setFiltroLog] = useState('Todos');
  const [filtroFin, setFiltroFin] = useState('Todos');

  // --- Dialog de abono ---
  const [dialogVisible, setDialogVisible] = useState(false);
  const [pedidoAbonar, setPedidoAbonar] = useState<any>(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [monedaAbono, setMonedaAbono] = useState<'USD' | 'VES'>('USD');
  const [tasaAbono, setTasaAbono] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);

  // --- Queries ---
  const filtrosLogSQL: Record<string, string> = {
    'Todos': "AND p.estado IN ('pendiente','en_produccion','listo')",
    'Pendiente': "AND p.estado = 'pendiente'",
    'En Producción': "AND p.estado = 'en_produccion'",
    'Listo': "AND p.estado = 'listo'",
  };

  const { data: pedidosLog = [] } = useQuery(`
    SELECT p.id, p.estado, p.monto_total, p.fecha_entrega_estimada, c.razon_social
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    WHERE 1=1 ${filtrosLogSQL[filtroLog]}
    ORDER BY p.fecha_entrega_estimada ASC
  `);

  const { data: pedidosFin = [] } = useQuery(`
    SELECT p.id, p.estado, p.estado_pago, p.monto_total, p.fecha_vencimiento_credito, c.razon_social
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    WHERE p.estado = 'entregado' AND p.estado_pago = 'pendiente'
    ORDER BY p.fecha_vencimiento_credito ASC
  `);

  // Totales abonados por pedido
  const { data: abonosTodos = [] } = useQuery(`
    SELECT id_pedido, SUM(monto_equivalente_usd) as total_abonado
    FROM abonos_pagos
    GROUP BY id_pedido
  `);

  // Detalles de pedidos logística
  const { data: detallesTodos = [] } = useQuery(`
    SELECT dp.id_pedido,
      COALESCE(pp.nombre, 'Pote ' || ip.capacidad) as nombre_item,
      dp.cantidad_solicitada
    FROM detalles_pedido dp
    LEFT JOIN productos_presentacion pp ON pp.id = dp.id_producto
    LEFT JOIN inventario_potes ip ON ip.id = dp.id_pote
  `);

  const getDetallesPedido = (idPedido: string) =>
    (detallesTodos as any[]).filter(d => d.id_pedido === idPedido);

  const getAbonado = (idPedido: string): number => {
    const row = (abonosTodos as any[]).find(a => a.id_pedido === idPedido);
    return row ? row.total_abonado : 0;
  };

  // --- Filtrar vista finanzas ---
  const filteredFin = (pedidosFin as any[]).filter(p => {
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

  // --- Registrar abono ---
  const handleAbrirAbono = (pedido: any) => {
    setPedidoAbonar(pedido);
    setMontoAbono('');
    setMonedaAbono('USD');
    setTasaAbono('');
    setDialogVisible(true);
  };

  const handleGuardarAbono = async () => {
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      Toast.show({ type: 'error', text1: 'Monto inválido' });
      return;
    }
    const tasa = parseFloat(tasaAbono) || 1;
    const montoUsd = monedaAbono === 'USD' ? monto : monto / tasa;

    setSavingAbono(true);
    try {
      await powerSync.execute(
        `INSERT INTO abonos_pagos (id, id_pedido, monto, monto_equivalente_usd, moneda, tasa_cambio, fecha_pago, tipo_pago)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'abono')`,
        [uuidv4(), pedidoAbonar.id, monto, montoUsd, monedaAbono, tasa, new Date().toISOString()]
      );

      // Verificar si ya está saldado (abonado >= monto_total)
      const totalAbonado = getAbonado(pedidoAbonar.id) + montoUsd;
      if (totalAbonado >= pedidoAbonar.monto_total) {
        await powerSync.execute("UPDATE pedidos SET estado_pago = 'pagado' WHERE id = ?", [pedidoAbonar.id]);
        Toast.show({ type: 'success', text1: '¡Pedido Saldado!', text2: 'El pago ha sido completado.' });
      } else {
        Toast.show({ type: 'success', text1: 'Abono Registrado', text2: `$${montoUsd.toFixed(2)} USD acreditados.` });
      }
      setDialogVisible(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo registrar el abono.' });
    } finally {
      setSavingAbono(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs principales */}
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={vista}
          onValueChange={setVista}
          buttons={[
            { value: 'logistica', label: 'Logística', icon: 'package-variant' },
            { value: 'finanzas', label: 'Cuentas x Cobrar', icon: 'cash-multiple' },
          ]}
        />
      </View>

      {/* Filtros secundarios */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(vista === 'logistica'
            ? ['Todos', 'Pendiente', 'En Producción', 'Listo']
            : ['Todos', 'Al Día', 'Por Vencer', 'Atrasado']
          ).map(f => (
            <Chip
              key={f}
              selected={(vista === 'logistica' ? filtroLog : filtroFin) === f}
              onPress={() => vista === 'logistica' ? setFiltroLog(f) : setFiltroFin(f)}
              style={styles.chip}
              showSelectedOverlay
            >
              {f}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* === VISTA LOGÍSTICA === */}
        {vista === 'logistica' && (
          <>
            {(pedidosLog as any[]).length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="package-variant-closed" size={48} color="#d1d5db" />
                <Text variant="bodyLarge" style={styles.emptyText}>No hay pedidos en este estado.</Text>
                <Button mode="contained" icon="plus" onPress={() => router.push('/(screens)/nuevo-pedido')} style={{ marginTop: 16 }}>
                  Crear Primer Pedido
                </Button>
              </View>
            ) : (
              (pedidosLog as any[]).map(pedido => {
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
                        {detalles.length > 0 ? detalles.map((d: any, i: number) => (
                          <Text key={i} variant="bodySmall" style={{ color: '#4b5563' }}>
                            • {d.cantidad_solicitada} × {d.nombre_item}
                          </Text>
                        )) : (
                          <Text variant="bodySmall" style={{ color: '#9ca3af' }}>Sin detalles cargados.</Text>
                        )}
                      </View>

                      <Divider style={{ marginBottom: 10 }} />

                      <View style={styles.actionRow}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                          ${pedido.monto_total?.toFixed(2)} USD
                        </Text>
                        {pedido.estado !== 'listo' && (
                          <Button
                            mode="contained-tonal"
                            compact
                            onPress={() => handleAvanzarEstado(pedido.id, pedido.estado)}
                            style={{ borderRadius: 8 }}
                          >
                            {pedido.estado === 'pendiente' ? 'En Producción →' : 'Marcar Listo →'}
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
            {filteredFin.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="cash-check" size={48} color="#d1d5db" />
                <Text variant="bodyLarge" style={styles.emptyText}>No hay cuentas pendientes de cobro.</Text>
              </View>
            ) : (
              filteredFin.map((pedido: any) => {
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
                          <Text style={styles.badgeText}>{estadoFinLabel(estadoFin)}</Text>
                        </View>
                      </View>

                      <Text variant="bodySmall" style={styles.fechaText}>
                        Vence: {pedido.fecha_vencimiento_credito
                          ? new Date(pedido.fecha_vencimiento_credito).toLocaleDateString('es-VE')
                          : '—'}
                      </Text>

                      <View style={styles.progressLabelRow}>
                        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                          Saldo: ${saldo.toFixed(2)}
                        </Text>
                        <Text variant="bodySmall" style={{ color: '#16a34a' }}>
                          Abonado: ${abonado.toFixed(2)}
                        </Text>
                      </View>
                      <ProgressBar
                        progress={progreso}
                        color="#22c55e"
                        style={styles.progressBar}
                      />

                      <View style={[styles.actionRow, { marginTop: 12 }]}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#374151' }}>
                          Total: ${total.toFixed(2)} USD
                        </Text>
                        <Button
                          mode="contained"
                          compact
                          onPress={() => handleAbrirAbono(pedido)}
                          icon="cash-plus"
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

      {/* FAB para nuevo pedido */}
      {vista === 'logistica' && (
        <Button
          mode="contained"
          icon="plus"
          style={styles.fab}
          onPress={() => router.push('/(screens)/nuevo-pedido')}
        >
          Nuevo Pedido
        </Button>
      )}

      {/* Dialog de Abono */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Registrar Abono</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 12, color: '#6b7280' }}>
              Cliente: <Text style={{ fontWeight: 'bold', color: '#111' }}>{pedidoAbonar?.razon_social}</Text>
            </Text>

            <SegmentedButtons
              value={monedaAbono}
              onValueChange={(v) => setMonedaAbono(v as 'USD' | 'VES')}
              buttons={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'VES', label: 'Bolívares (Bs.)' },
              ]}
              style={{ marginBottom: 12 }}
            />

            <TextInput
              mode="outlined"
              label={`Monto en ${monedaAbono}`}
              value={montoAbono}
              onChangeText={setMontoAbono}
              keyboardType="decimal-pad"
              left={<TextInput.Icon icon={monedaAbono === 'USD' ? 'currency-usd' : 'currency-brl'} />}
              style={{ marginBottom: 8 }}
            />

            {monedaAbono === 'VES' && (
              <TextInput
                mode="outlined"
                label="Tasa de cambio (Bs. por USD)"
                value={tasaAbono}
                onChangeText={setTasaAbono}
                keyboardType="decimal-pad"
                style={{ marginBottom: 4 }}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={savingAbono}>Cancelar</Button>
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  segmentContainer: { padding: 16, backgroundColor: '#ffffff' },
  filtersContainer: {
    paddingVertical: 10, paddingHorizontal: 8,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  chip: { marginHorizontal: 4 },
  scrollContent: { padding: 8, paddingBottom: 100, gap: 8 },
  cardContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  clienteNombre: { fontWeight: 'bold', color: '#1f2937', flex: 1, marginRight: 8 },
  fechaText: { color: '#6b7280', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, marginTop: 8 },
  progressBar: { height: 8, borderRadius: 4 },
  emptyState: { alignItems: 'center', marginTop: 60, padding: 24 },
  emptyText: { color: '#9ca3af', marginTop: 12 },
  fab: {
    position: 'absolute', bottom: 16, right: 16,
    borderRadius: 16, paddingHorizontal: 8,
  },
});

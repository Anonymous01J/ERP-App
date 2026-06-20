import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Appbar, useTheme, Divider, Surface, FAB } from 'react-native-paper';
import { CustomCard } from '@components/ui/CustomCard';
import { useQuery } from '@powersync/react';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

export function FinanzasDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();

  // 1. Consultar deudas pendientes (Cuentas por cobrar)
  const { data: deudas = [] } = useQuery(`
    SELECT 
      p.id, 
      p.monto_total, 
      p.fecha_vencimiento_credito,
      p.estado,
      COALESCE((SELECT SUM(monto_equivalente_usd) FROM abonos_pagos WHERE id_pedido = p.id), 0) as abonado
    FROM pedidos p
    WHERE p.estado_pago = 'pendiente' AND p.estado != 'cancelado'
  `);

  // 2. Consultar flujo de caja unificado (Movimientos + Abonos)
  const { data: flujoCaja = [] } = useQuery(`
    SELECT 
      descripcion, 
      monto, 
      moneda, 
      tasa_cambio, 
      fecha, 
      tipo, 
      'movimiento' as origen 
    FROM movimientos
    UNION ALL
    SELECT 
      'Abono: ' || c.razon_social as descripcion, 
      ap.monto_equivalente_usd as monto, 
      'USD' as moneda, 
      1 as tasa_cambio, 
      ap.fecha_pago as fecha, 
      'ingreso' as tipo, 
      'abono' as origen
    FROM abonos_pagos ap
    JOIN pedidos p ON p.id = ap.id_pedido
    JOIN clientes c ON c.id = p.id_cliente
    ORDER BY fecha DESC
  `);

  // Procesar KPIs
  const kpis = useMemo(() => {
    let deudaTotal = 0;
    let deudaAlDia = 0;
    let deudaPorVencer = 0;
    let deudaAtrasada = 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const d of deudas as any[]) {
      // Solo contar deudas de pedidos que ya fueron entregados ('listo' o 'entregado') o si se permite desde antes.
      // Normalmente la deuda empieza a correr cuando se entrega, pero usaremos todos los pendientes.
      const saldo = d.monto_total - d.abonado;
      if (saldo > 0) {
        deudaTotal += saldo;
        
        if (d.fecha_vencimiento_credito) {
          const venc = new Date(d.fecha_vencimiento_credito);
          const diffTime = venc.getTime() - hoy.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            deudaAtrasada += saldo;
          } else if (diffDays <= 5) {
            deudaPorVencer += saldo;
          } else {
            deudaAlDia += saldo;
          }
        } else {
          deudaAlDia += saldo; // Sin fecha asume al día
        }
      }
    }

    let ingresosMes = 0;
    let egresosMes = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    for (const f of flujoCaja as any[]) {
      const fd = new Date(f.fecha);
      if (fd.getMonth() === currentMonth && fd.getFullYear() === currentYear) {
        const montoUsd = f.moneda === 'USD' ? f.monto : (f.monto / (f.tasa_cambio || 1));
        if (f.tipo === 'ingreso') ingresosMes += montoUsd;
        else egresosMes += montoUsd;
      }
    }

    return {
      deudaTotal, deudaAlDia, deudaPorVencer, deudaAtrasada,
      ingresosMes, egresosMes, balance: ingresosMes - egresosMes
    };
  }, [deudas, flujoCaja]);

  const formatUsd = (val: number) => `$${val.toFixed(2)}`;

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title="Resumen Financiero" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ROW 1: Balance y Deuda */}
        <View style={styles.row}>
          <Surface style={[styles.kpiBox, { backgroundColor: theme.colors.primaryContainer }]} elevation={1}>
            <View style={styles.kpiHeader}>
              <MaterialCommunityIcons name="cash-multiple" size={20} color={theme.colors.primary} />
              <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>CUENTAS X COBRAR</Text>
            </View>
            <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onPrimaryContainer, marginTop: 8 }}>
              {formatUsd(kpis.deudaTotal)}
            </Text>
            <Text variant="bodySmall" style={{ color: '#4b5563' }}>Capital en la calle</Text>
          </Surface>

          <Surface style={[styles.kpiBox, { backgroundColor: kpis.balance >= 0 ? '#dcfce7' : '#fee2e2' }]} elevation={1}>
            <View style={styles.kpiHeader}>
              <MaterialCommunityIcons name="scale-balance" size={20} color={kpis.balance >= 0 ? '#16a34a' : '#dc2626'} />
              <Text variant="labelMedium" style={{ color: kpis.balance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>BALANCE MES</Text>
            </View>
            <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: kpis.balance >= 0 ? '#16a34a' : '#dc2626', marginTop: 8 }}>
              {formatUsd(kpis.balance)}
            </Text>
            <Text variant="bodySmall" style={{ color: '#4b5563' }}>Ingresos vs Egresos</Text>
          </Surface>
        </View>

        {/* ROW 2: Ingresos y Egresos */}
        <View style={styles.row}>
          <Surface style={[styles.kpiBoxMini]} elevation={0}>
            <Text variant="bodySmall" style={{ color: '#6b7280', fontWeight: 'bold' }}>INGRESOS (MES)</Text>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#16a34a' }}>+{formatUsd(kpis.ingresosMes)}</Text>
          </Surface>
          <Surface style={[styles.kpiBoxMini]} elevation={0}>
            <Text variant="bodySmall" style={{ color: '#6b7280', fontWeight: 'bold' }}>EGRESOS (MES)</Text>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#dc2626' }}>-{formatUsd(kpis.egresosMes)}</Text>
          </Surface>
        </View>

        {/* DISTRIBUCIÓN DE DEUDA */}
        <CustomCard style={{ marginTop: 16 }}>
          <View style={{ padding: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>Estado de la Deuda</Text>
            
            <View style={styles.deudaBarContainer}>
              {kpis.deudaTotal > 0 ? (
                <>
                  <View style={[styles.deudaSegment, { flex: kpis.deudaAlDia, backgroundColor: '#3b82f6' }]} />
                  <View style={[styles.deudaSegment, { flex: kpis.deudaPorVencer, backgroundColor: '#f59e0b' }]} />
                  <View style={[styles.deudaSegment, { flex: kpis.deudaAtrasada, backgroundColor: '#ef4444' }]} />
                </>
              ) : (
                <View style={[styles.deudaSegment, { flex: 1, backgroundColor: '#e5e7eb' }]} />
              )}
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                <Text variant="bodySmall">Al Día: {formatUsd(kpis.deudaAlDia)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                <Text variant="bodySmall">Por Vencer: {formatUsd(kpis.deudaPorVencer)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                <Text variant="bodySmall">Atrasada: {formatUsd(kpis.deudaAtrasada)}</Text>
              </View>
            </View>
          </View>
        </CustomCard>

        {/* FLUJO DE CAJA (TIMELINE) */}
        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 24, marginBottom: 8, color: '#374151' }}>
          Flujo de Caja Reciente
        </Text>
        
        {flujoCaja.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt" size={48} color="#d1d5db" />
            <Text variant="bodyMedium" style={{ color: '#9ca3af', marginTop: 8 }}>No hay movimientos financieros registrados.</Text>
          </View>
        ) : (
          (flujoCaja as any[]).slice(0, 50).map((mov, index) => {
            const isIngreso = mov.tipo === 'ingreso';
            const montoUsd = mov.moneda === 'USD' ? mov.monto : (mov.monto / (mov.tasa_cambio || 1));
            return (
              <CustomCard key={index} style={styles.movCard}>
                <View style={styles.movContent}>
                  <View style={[styles.iconContainer, { backgroundColor: isIngreso ? '#dcfce7' : '#fee2e2' }]}>
                    <MaterialCommunityIcons 
                      name={isIngreso ? 'arrow-down-bold' : 'arrow-up-bold'} 
                      size={20} 
                      color={isIngreso ? '#16a34a' : '#dc2626'} 
                    />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#1f2937' }}>{mov.descripcion}</Text>
                    <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                      {new Date(mov.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: isIngreso ? '#16a34a' : '#dc2626' }}>
                      {isIngreso ? '+' : '-'}{formatUsd(montoUsd)}
                    </Text>
                    {mov.moneda !== 'USD' && (
                      <Text variant="bodySmall" style={{ color: '#9ca3af', fontSize: 10 }}>
                        {mov.monto.toFixed(2)} {mov.moneda}
                      </Text>
                    )}
                  </View>
                </View>
              </CustomCard>
            );
          })
        )}

      </ScrollView>

      <FAB
        icon="cash-plus"
        label="Registrar"
        style={styles.fab}
        onPress={() => router.push('/(screens)/registrar-gasto')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiBox: { flex: 1, padding: 16, borderRadius: 16 },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiBoxMini: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  deudaBarContainer: { height: 16, borderRadius: 8, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#e5e7eb' },
  deudaSegment: { height: '100%' },
  legendContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  emptyState: { alignItems: 'center', marginTop: 24, padding: 24 },
  movCard: { marginBottom: 8, borderRadius: 12 },
  movContent: { padding: 12, flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, useTheme, Avatar, SegmentedButtons, FAB } from 'react-native-paper';
import { CustomCard } from '@components/ui/CustomCard';
import { LineChart } from 'react-native-gifted-charts';
import { useQuery } from '@powersync/react';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [chartPeriod, setChartPeriod] = useState('Día');
  const [fabOpen, setFabOpen] = useState(false);

  // 1. Pedidos (Contadores)
  const { data: pedidosStats = [] } = useQuery(`
    SELECT estado, COUNT(*) as count 
    FROM pedidos 
    WHERE estado IN ('pendiente', 'en_produccion', 'listo')
    GROUP BY estado
  `);

  // 2. Alertas de Cobranza
  const { data: creditosPendientes = [] } = useQuery(`
    SELECT id, fecha_vencimiento_credito 
    FROM pedidos 
    WHERE estado_pago = 'pendiente' AND estado != 'cancelado'
  `);

  // 3. Inventario Bobinas
  const { data: bobinasData = [] } = useQuery(`
    SELECT COALESCE(SUM(peso_actual_kg), 0) as total_kg 
    FROM bobinas_grandes 
    WHERE estado IN ('disponible', 'en_uso')
  `);

  // 4. Stock Potes
  const { data: potesData = [] } = useQuery(`
    SELECT COALESCE(SUM(stock_actual), 0) as total_potes 
    FROM inventario_potes
  `);

  // 5. Flujo de Caja (Para Gráficos)
  const { data: flujoCaja = [] } = useQuery(`
    SELECT fecha, tipo, 
      CASE WHEN moneda = 'USD' THEN monto ELSE monto / COALESCE(tasa_cambio, 1) END as monto_usd
    FROM movimientos
    UNION ALL
    SELECT fecha_pago as fecha, 'ingreso' as tipo, monto_equivalente_usd as monto_usd
    FROM abonos_pagos
  `);

  // --- PROCESAMIENTO DE KPIs ---
  const metrics = useMemo(() => {
    let pedidosPorProducir = 0;
    let pedidosListos = 0;

    for (const p of pedidosStats as any[]) {
      if (p.estado === 'listo') pedidosListos += p.count;
      else pedidosPorProducir += p.count;
    }

    let pagosPorVencer = 0;
    let pagosVencidos = 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const c of creditosPendientes as any[]) {
      if (c.fecha_vencimiento_credito) {
        const venc = new Date(c.fecha_vencimiento_credito);
        const diffTime = venc.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) pagosVencidos++;
        else if (diffDays <= 5) pagosPorVencer++;
      }
    }

    return {
      pedidosPorProducir,
      pedidosListos,
      pagosPorVencer,
      pagosVencidos,
      bobinasKg: bobinasData.length > 0 ? bobinasData[0].total_kg : 0,
      potesTotal: potesData.length > 0 ? potesData[0].total_potes : 0,
    };
  }, [pedidosStats, creditosPendientes, bobinasData, potesData]);

  // --- PROCESAMIENTO DE GRÁFICOS ---
  const { lineDataIngresos, lineDataEgresos } = useMemo(() => {
    const dataIngresosMap: Record<string, number> = {};
    const dataEgresosMap: Record<string, number> = {};
    const labelsEnOrden: string[] = [];

    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (chartPeriod === 'Día') {
      // Día actual (Hoy): Agrupado por bloques de 4 horas
      const hourBlocks = [0, 4, 8, 12, 16, 20];
      hourBlocks.forEach(h => {
        const key = `${h.toString().padStart(2, '0')}:00`;
        labelsEnOrden.push(key);
        dataIngresosMap[key] = 0;
        dataEgresosMap[key] = 0;
      });

      const hoyStr = hoy.toISOString().split('T')[0];
      for (const row of flujoCaja as any[]) {
        if (!row.fecha) continue;
        const [fDate, fTime] = row.fecha.split('T');
        if (fDate === hoyStr && fTime) {
          const hour = parseInt(fTime.substring(0, 2), 10);
          const block = hourBlocks.slice().reverse().find(b => hour >= b) || 0;
          const key = `${block.toString().padStart(2, '0')}:00`;
          if (row.tipo === 'ingreso') dataIngresosMap[key] += row.monto_usd;
          else dataEgresosMap[key] += row.monto_usd;
        }
      }
    } else if (chartPeriod === 'Semana') {
      // Semana: Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        labelsEnOrden.push(key);
        dataIngresosMap[key] = 0;
        dataEgresosMap[key] = 0;
      }
      for (const row of flujoCaja as any[]) {
        const f = row.fecha?.split('T')[0];
        if (dataIngresosMap[f] !== undefined) {
          if (row.tipo === 'ingreso') dataIngresosMap[f] += row.monto_usd;
          else dataEgresosMap[f] += row.monto_usd;
        }
      }
    } else {
      // Mes: Últimas 4 semanas
      for (let i = 3; i >= 0; i--) {
        const start = new Date(hoy.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
        const startStr = start.toISOString().split('T')[0].slice(5); // Solo MM-DD
        const key = `Sem ${4 - i} (${startStr})`;
        labelsEnOrden.push(key);
        dataIngresosMap[key] = 0;
        dataEgresosMap[key] = 0;
      }

      for (const row of flujoCaja as any[]) {
        if (!row.fecha) continue;
        const d = new Date(row.fecha);
        const diffDays = Math.floor((hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 28) {
          const semIndex = 3 - Math.floor(diffDays / 7);
          const key = labelsEnOrden[semIndex];
          if (row.tipo === 'ingreso') dataIngresosMap[key] += row.monto_usd;
          else dataEgresosMap[key] += row.monto_usd;
        }
      }
    }

    const formatLabel = (lbl: string) => {
      if (chartPeriod === 'Día') return lbl.substring(0, 5); // Ej: 08:00
      if (chartPeriod === 'Semana') {
        const [y, m, d] = lbl.split('-');
        return `${d}/${m}`;
      }
      return lbl.split(' ')[0]; // Para mes (Semanas), mostrar 'Sem 1', etc.
    };

    const outIngresos = labelsEnOrden.map(lbl => ({ value: dataIngresosMap[lbl], label: formatLabel(lbl) }));
    const outEgresos = labelsEnOrden.map(lbl => ({ value: dataEgresosMap[lbl] })); // Solo necesitamos las labels en la línea 1

    return { lineDataIngresos: outIngresos, lineDataEgresos: outEgresos };
  }, [flujoCaja, chartPeriod]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginBottom: 16, color: '#1f2937' }}>Visión Global</Text>

        {/* Tarjetas de Métricas Operativas (Arriba y más compactas) */}
        <View style={styles.grid}>
          <CustomCard style={styles.gridItem}>
            <View style={styles.gridItemContent}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
              <Text variant="titleLarge" style={styles.gridItemNumber}>{metrics.pedidosPorProducir}</Text>
              <Text variant="labelSmall" style={styles.gridItemLabel}>Pedidos Pendientes</Text>
            </View>
          </CustomCard>

          <CustomCard style={styles.gridItem}>
            <View style={styles.gridItemContent}>
              <MaterialCommunityIcons name="check-all" size={24} color="#16a34a" />
              <Text variant="titleLarge" style={styles.gridItemNumber}>{metrics.pedidosListos}</Text>
              <Text variant="labelSmall" style={styles.gridItemLabel}>Pedidos Listos</Text>
            </View>
          </CustomCard>

          <CustomCard style={styles.gridItem}>
            <View style={styles.gridItemContent}>
              <MaterialCommunityIcons name="roll-cylinder" size={24} color="#d97706" />
              <Text variant="titleLarge" style={styles.gridItemNumber}>{metrics.bobinasKg.toFixed(0)} kg</Text>
              <Text variant="labelSmall" style={styles.gridItemLabel}>Papel Disponible</Text>
            </View>
          </CustomCard>

          <CustomCard style={styles.gridItem}>
            <View style={styles.gridItemContent}>
              <MaterialCommunityIcons name="bottle-tonic" size={24} color="#0284c7" />
              <Text variant="titleLarge" style={styles.gridItemNumber}>{metrics.potesTotal}</Text>
              <Text variant="labelSmall" style={styles.gridItemLabel}>Potes en Stock</Text>
            </View>
          </CustomCard>
        </View>

        {/* Alertas Financieras */}
        {(metrics.pagosPorVencer > 0 || metrics.pagosVencidos > 0) && (
          <CustomCard style={{ backgroundColor: '#FFF3E0', marginBottom: 16 }}>
            <View style={styles.alertContent}>
              <Avatar.Icon size={40} icon="alert" style={{ backgroundColor: '#FFB74D' }} color="#fff" />
              <View style={styles.textContainer}>
                <Text variant="titleMedium" style={{ color: '#E65100', fontWeight: 'bold' }}>Alertas de Cobranza</Text>
                <Text variant="bodyMedium" style={{ color: '#E65100' }}>
                  {metrics.pagosPorVencer} pagos por vencer en los próximos 5 días.
                  {metrics.pagosVencidos > 0 && `\n${metrics.pagosVencidos} pagos VENCIDOS actualmente.`}
                </Text>
              </View>
            </View>
          </CustomCard>
        )}

        {/* Gráfico Financiero */}
        <CustomCard style={{ marginBottom: 16 }}>
          <View style={styles.chartHeader}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16, color: '#374151' }}>
              Ingresos vs Egresos ($)
            </Text>
            <SegmentedButtons
              value={chartPeriod}
              onValueChange={setChartPeriod}
              buttons={[
                { value: 'Día', label: 'Día' },
                { value: 'Semana', label: 'Semana' },
                { value: 'Mes', label: 'Mes' },
              ]}
              density="small"
            />
          </View>
          
          <View style={styles.chartContainer}>
            <LineChart
              areaChart
              curved
              data={lineDataIngresos}
              data2={lineDataEgresos}
              height={220}
              width={Dimensions.get('window').width - 120}
              spacing={lineDataIngresos.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (lineDataIngresos.length - 1) : 45}
              initialSpacing={15}
              endSpacing={15}
              
              // Estilo Ingresos (Verde)
              color1="#16a34a"
              startFillColor1="#16a34a"
              endFillColor1="#16a34a"
              startOpacity1={0.3}
              endOpacity1={0.05}
              
              // Estilo Egresos (Rojo)
              color2="#dc2626"
              startFillColor2="#dc2626"
              endFillColor2="#dc2626"
              startOpacity2={0.3}
              endOpacity2={0.05}

              yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 11 }}
              hideRules
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor="#e5e7eb"
              noOfSections={4}
            />
          </View>
          <View style={styles.legendRow}>
             <View style={styles.legendItem}>
               <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
               <Text variant="bodySmall">Ingresos</Text>
             </View>
             <View style={styles.legendItem}>
               <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
               <Text variant="bodySmall">Egresos</Text>
             </View>
          </View>
        </CustomCard>
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          { icon: 'plus-box-outline', label: 'Nuevo Pedido', onPress: () => router.push('/(screens)/nuevo-pedido') },
          { icon: 'roll-cylinder', label: 'Registrar Producción', onPress: () => router.push('/(screens)/registrar-produccion') },
          { icon: 'truck', label: 'Registrar Viaje', onPress: () => router.push('/(screens)/registrar-viaje') },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        onPress={() => {
          if (fabOpen) {
            // Se cerrará automáticamente
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  alertContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  textContainer: { flex: 1 },
  chartHeader: { padding: 16, paddingBottom: 0 },
  chartContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, alignItems: 'center', overflow: 'hidden' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  gridItem: { width: '40%', marginBottom: 12 },
  gridItemContent: { padding: 12, alignItems: 'center' },
  gridItemNumber: { fontWeight: 'bold', marginTop: 4, color: '#1f2937' },
  gridItemLabel: { color: '#6b7280', textAlign: 'center', marginTop: 2 },
});

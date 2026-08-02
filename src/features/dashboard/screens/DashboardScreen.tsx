import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useMemo, useRef } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl, Linking, TouchableOpacity } from 'react-native';
import { Text, useTheme, Avatar, SegmentedButtons, FAB, Dialog, Portal, Button, Chip, IconButton } from 'react-native-paper';
import { CustomCard } from '@components/ui/CustomCard';
import { LineChart } from 'react-native-gifted-charts';
import { useQuery } from '@powersync/react';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import PagerView from 'react-native-pager-view';
import { useAuth } from '@state/AuthProvider';

export function DashboardScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();
  const isAdmin = perfil?.rol === 'admin';
  const [chartPeriod, setChartPeriod] = useState('Día');
  const [prodPeriod, setProdPeriod] = useState('Semana');
  const [metricaProduccion, setMetricaProduccion] = useState<'rollos' | 'kg'>('rollos');
  const [fabOpen, setFabOpen] = useState(false);
  const [modalAlertasVisible, setModalAlertasVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  // 1. Pedidos (Contadores)
  const { data: pedidosStats = [] } = useQuery(`
    SELECT estado, COUNT(*) as count 
    FROM pedidos 
    WHERE estado IN ('pendiente', 'en_produccion', 'listo')
    GROUP BY estado
  `);

  // 2. Alertas de Cobranza (Con detalle de cliente y saldos)
  const { data: creditosPendientes = [] } = useQuery(`
    SELECT p.id, p.fecha_vencimiento_credito, p.monto_total, c.razon_social, c.telefono,
           COALESCE((SELECT SUM(monto_equivalente_usd) FROM abonos_pagos WHERE id_pedido = p.id), 0) as abonado
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    WHERE p.estado_pago = 'pendiente' AND p.estado != 'cancelado'
    ORDER BY p.fecha_vencimiento_credito ASC
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

  // 5. Flujo de Caja (Para Gráficos — solo Admin)
  const { data: flujoCaja = [] } = useQuery(
    isAdmin ? `
    SELECT fecha, tipo, 
      CASE WHEN moneda = 'USD' THEN monto ELSE monto / COALESCE(tasa_cambio, 1) END as monto_usd
    FROM movimientos
    UNION ALL
    SELECT fecha_pago as fecha, 'ingreso' as tipo, monto_equivalente_usd as monto_usd
    FROM abonos_pagos
  ` : 'SELECT NULL as fecha, NULL as tipo, NULL as monto_usd WHERE 1=0'
  );

  // 6. Producción — todos los períodos (para operadores)
  const { data: produccionRaw = [] } = useQuery(`
    SELECT 
      pd.fecha,
      SUM(pd.cantidad_rollos_total) as total_rollos,
      COALESCE(SUM(cb.kg_consumidos), 0) as total_kg
    FROM produccion_diaria pd
    LEFT JOIN consumo_bobinas cb ON cb.id_produccion = pd.id
    WHERE pd.fecha >= DATE('now', '-27 days')
    GROUP BY pd.fecha
    ORDER BY pd.fecha ASC
  `);

  // --- HELPER WHATSAPP ---
  const sendWhatsAppReminder = (razonSocial: string, telefono: string | null, saldo: number, estadoFin: string) => {
    if (!telefono) {
      Toast.show({ type: 'error', text1: 'Sin teléfono', text2: 'El cliente no tiene teléfono registrado.' });
      return;
    }
    let cleanPhone = telefono.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.substring(1);
    }
    
    let mensaje = '';
    if (estadoFin === 'atrasado') {
      mensaje = `Hola ${razonSocial}, le escribimos para recordarle que su factura tiene un saldo pendiente de $${saldo.toFixed(2)} USD que se encuentra *VENCIDO*. Agradecemos su pronto pago.`;
    } else if (estadoFin === 'por_vencer') {
      mensaje = `Hola ${razonSocial}, le escribimos para recordarle que su factura con saldo de $${saldo.toFixed(2)} USD está próxima a vencer.`;
    } else {
      mensaje = `Hola ${razonSocial}, le adjuntamos el estado de su cuenta. Saldo actual: $${saldo.toFixed(2)} USD.`;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error abriendo WhatsApp:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir WhatsApp.' });
    });
  };

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
    const alertasLista: Array<{
      id: string;
      razon_social: string;
      telefono: string | null;
      saldo: number;
      estadoFin: 'atrasado' | 'por_vencer';
      diasDiff: number;
    }> = [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const c of creditosPendientes as any[]) {
      const saldo = (c.monto_total ?? 0) - (c.abonado ?? 0);
      if (saldo <= 0) continue;

      if (c.fecha_vencimiento_credito) {
        const venc = new Date(c.fecha_vencimiento_credito);
        const diffTime = venc.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          pagosVencidos++;
          alertasLista.push({
            id: c.id,
            razon_social: c.razon_social,
            telefono: c.telefono,
            saldo,
            estadoFin: 'atrasado',
            diasDiff: Math.abs(diffDays),
          });
        } else if (diffDays <= 5) {
          pagosPorVencer++;
          alertasLista.push({
            id: c.id,
            razon_social: c.razon_social,
            telefono: c.telefono,
            saldo,
            estadoFin: 'por_vencer',
            diasDiff: diffDays,
          });
        }
      }
    }

    return {
      pedidosPorProducir,
      pedidosListos,
      pagosPorVencer,
      pagosVencidos,
      alertasLista,
      bobinasKg: bobinasData.length > 0 ? bobinasData[0].total_kg : 0,
      potesTotal: potesData.length > 0 ? potesData[0].total_potes : 0,
    };
  }, [pedidosStats, creditosPendientes, bobinasData, potesData]);

  const handleCardAlertasPress = () => {
    if (metrics.alertasLista.length === 1) {
      const item = metrics.alertasLista[0];
      sendWhatsAppReminder(item.razon_social, item.telefono, item.saldo, item.estadoFin);
    } else if (metrics.alertasLista.length > 1) {
      setModalAlertasVisible(true);
    }
  };

  // --- PROCESAMIENTO DE GRÁFICOS ---
  const { lineDataIngresos, lineDataEgresos } = useMemo(() => {
    const dataIngresosMap: Record<string, number> = {};
    const dataEgresosMap: Record<string, number> = {};
    const labelsEnOrden: string[] = [];

    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (chartPeriod === 'Día') {
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
      for (let i = 3; i >= 0; i--) {
        const start = new Date(hoy.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
        const startStr = start.toISOString().split('T')[0].slice(5);
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
      if (chartPeriod === 'Día') return lbl.substring(0, 5);
      if (chartPeriod === 'Semana') {
        const [y, m, d] = lbl.split('-');
        return `${d}/${m}`;
      }
      return lbl.split(' ')[0];
    };

    const outIngresos = labelsEnOrden.map(lbl => ({ value: dataIngresosMap[lbl], label: formatLabel(lbl), dataLabel: formatLabel(lbl) }));
    const outEgresos = labelsEnOrden.map(lbl => ({ value: dataEgresosMap[lbl], dataLabel: formatLabel(lbl) }));

    return { lineDataIngresos: outIngresos, lineDataEgresos: outEgresos };
  }, [flujoCaja, chartPeriod]);

  // --- PROCESAMIENTO GRÁFICO PRODUCCIÓN ---
  const lineDataProduccion = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const labelsEnOrden: string[] = [];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (prodPeriod === 'Día') {
      // Solo el día de hoy, agrupado cada 4 horas (producción no tiene hora, muestra valor del día)
      const hoyStr = hoy.toISOString().split('T')[0];
      const hourBlocks = [0, 4, 8, 12, 16, 20];
      hourBlocks.forEach(h => {
        const key = `${h.toString().padStart(2, '0')}:00`;
        labelsEnOrden.push(key);
        dataMap[key] = 0;
      });
      // La producción diaria no tiene hora, repartimos el total del día en el bloque de mediodía
      const rowHoy = (produccionRaw as any[]).find((r: any) => r.fecha === hoyStr);
      if (rowHoy) {
        const val = metricaProduccion === 'rollos' ? (rowHoy.total_rollos ?? 0) : (rowHoy.total_kg ?? 0);
        dataMap['08:00'] = val;
      }
    } else if (prodPeriod === 'Semana') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoy.getTime() - i * 86400000);
        const key = d.toISOString().split('T')[0];
        labelsEnOrden.push(key);
        dataMap[key] = 0;
      }
      for (const row of produccionRaw as any[]) {
        const f = row.fecha?.split('T')[0] ?? row.fecha;
        if (dataMap[f] !== undefined) {
          dataMap[f] = metricaProduccion === 'rollos' ? (row.total_rollos ?? 0) : (row.total_kg ?? 0);
        }
      }
    } else {
      // Mes: 4 semanas
      for (let i = 3; i >= 0; i--) {
        const start = new Date(hoy.getTime() - (i * 7 + 6) * 86400000);
        const startStr = start.toISOString().split('T')[0].slice(5);
        const key = `Sem ${4 - i} (${startStr})`;
        labelsEnOrden.push(key);
        dataMap[key] = 0;
      }
      for (const row of produccionRaw as any[]) {
        const f = row.fecha?.split('T')[0] ?? row.fecha;
        if (!f) continue;
        const d = new Date(f);
        const diffDays = Math.floor((hoy.getTime() - d.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 28) {
          const semIndex = 3 - Math.floor(diffDays / 7);
          const key = labelsEnOrden[semIndex];
          const val = metricaProduccion === 'rollos' ? (row.total_rollos ?? 0) : (row.total_kg ?? 0);
          dataMap[key] = (dataMap[key] ?? 0) + val;
        }
      }
    }

    const formatLabel = (lbl: string) => {
      if (prodPeriod === 'Día') return lbl.substring(0, 5);
      if (prodPeriod === 'Semana') {
        const parts = lbl.split('-');
        return `${parts[2]}/${parts[1]}`;
      }
      return lbl.split(' ')[0];
    };

    return labelsEnOrden.map(lbl => ({ value: dataMap[lbl], label: formatLabel(lbl), dataLabel: formatLabel(lbl) }));
  }, [produccionRaw, prodPeriod, metricaProduccion]);

  // --- PROCESAMIENTO GRÁFICO PRODUCCIÓN (ADMIN SWIPER) ---
  const { lineDataRollosAdmin, lineDataKgAdmin } = useMemo(() => {
    if (!isAdmin) return { lineDataRollosAdmin: [], lineDataKgAdmin: [] };
    
    const dataRollosMap: Record<string, number> = {};
    const dataKgMap: Record<string, number> = {};
    const labelsEnOrden: string[] = [];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (chartPeriod === 'Día') {
      const hoyStr = hoy.toISOString().split('T')[0];
      const hourBlocks = [0, 4, 8, 12, 16, 20];
      hourBlocks.forEach(h => {
        const key = `${h.toString().padStart(2, '0')}:00`;
        labelsEnOrden.push(key);
        dataRollosMap[key] = 0;
        dataKgMap[key] = 0;
      });
      const rowHoy = (produccionRaw as any[]).find((r: any) => r.fecha === hoyStr);
      if (rowHoy) {
        dataRollosMap['08:00'] = rowHoy.total_rollos ?? 0;
        dataKgMap['08:00'] = rowHoy.total_kg ?? 0;
      }
    } else if (chartPeriod === 'Semana') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoy.getTime() - i * 86400000);
        const key = d.toISOString().split('T')[0];
        labelsEnOrden.push(key);
        dataRollosMap[key] = 0;
        dataKgMap[key] = 0;
      }
      for (const row of produccionRaw as any[]) {
        const f = row.fecha?.split('T')[0] ?? row.fecha;
        if (dataRollosMap[f] !== undefined) {
          dataRollosMap[f] = row.total_rollos ?? 0;
          dataKgMap[f] = row.total_kg ?? 0;
        }
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(hoy.getTime() - (i * 7 + 6) * 86400000);
        const startStr = start.toISOString().split('T')[0].slice(5);
        const key = `Sem ${4 - i} (${startStr})`;
        labelsEnOrden.push(key);
        dataRollosMap[key] = 0;
        dataKgMap[key] = 0;
      }
      for (const row of produccionRaw as any[]) {
        const f = row.fecha?.split('T')[0] ?? row.fecha;
        if (!f) continue;
        const d = new Date(f);
        const diffDays = Math.floor((hoy.getTime() - d.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 28) {
          const semIndex = 3 - Math.floor(diffDays / 7);
          const key = labelsEnOrden[semIndex];
          dataRollosMap[key] = (dataRollosMap[key] ?? 0) + (row.total_rollos ?? 0);
          dataKgMap[key] = (dataKgMap[key] ?? 0) + (row.total_kg ?? 0);
        }
      }
    }

    const formatLabel = (lbl: string) => {
      if (chartPeriod === 'Día') return lbl.substring(0, 5);
      if (chartPeriod === 'Semana') {
        const parts = lbl.split('-');
        return `${parts[2]}/${parts[1]}`;
      }
      return lbl.split(' ')[0];
    };

    const outRollos = labelsEnOrden.map(lbl => ({ value: dataRollosMap[lbl], label: formatLabel(lbl), dataLabel: formatLabel(lbl) }));
    const outKg = labelsEnOrden.map(lbl => ({ value: dataKgMap[lbl], label: formatLabel(lbl), dataLabel: formatLabel(lbl) }));
    return { lineDataRollosAdmin: outRollos, lineDataKgAdmin: outKg };
  }, [produccionRaw, chartPeriod, isAdmin]);

  const maxFinanzas = Math.max(10, ...lineDataIngresos.map(d => d.value), ...lineDataEgresos.map(d => d.value)) * 1.2;
  const maxRollosAdmin = Math.max(10, ...lineDataRollosAdmin.map(d => d.value)) * 1.2;
  const maxKgAdmin = Math.max(10, ...lineDataKgAdmin.map(d => d.value)) * 1.2;
  const maxProdOp = Math.max(10, ...lineDataProduccion.map(d => d.value)) * 1.2;

  return (
    <View style={globalStyles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>
        
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginBottom: 16, color: '#1f2937' }}>Visión Global</Text>

        {/* Tarjetas de Métricas Operativas */}
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
              <MaterialCommunityIcons name="paper-roll" size={24} color="#d97706" />
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

        {/* Alertas Financieras Clickables — solo Admin */}
        {isAdmin && (metrics.pagosPorVencer > 0 || metrics.pagosVencidos > 0) && (
          <TouchableOpacity activeOpacity={0.8} onPress={handleCardAlertasPress}>
            <CustomCard style={{ backgroundColor: metrics.pagosVencidos > 0 ? '#fee2e2' : '#FFF3E0', marginBottom: 16 }}>
              <View style={styles.alertContent}>
                <Avatar.Icon 
                  size={40} 
                  icon="alert" 
                  style={{ backgroundColor: metrics.pagosVencidos > 0 ? '#ef4444' : '#FFB74D' }} 
                  color="#fff" 
                />
                <View style={styles.textContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="titleMedium" style={{ color: metrics.pagosVencidos > 0 ? '#991b1b' : '#E65100', fontWeight: 'bold' }}>
                      Alertas de Cobranza
                    </Text>
                    <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
                  </View>
                  <Text variant="bodyMedium" style={{ color: metrics.pagosVencidos > 0 ? '#991b1b' : '#E65100', marginTop: 2 }}>
                    {metrics.pagosPorVencer > 0 && `${metrics.pagosPorVencer} pagos por vencer en los próximos 5 días.`}
                    {metrics.pagosPorVencer > 0 && metrics.pagosVencidos > 0 && '\n'}
                    {metrics.pagosVencidos > 0 && `${metrics.pagosVencidos} pagos VENCIDOS actualmente.`}
                  </Text>
                </View>
              </View>
            </CustomCard>
          </TouchableOpacity>
        )}

        {/* Gráfico Financiero — Admin */}
        {isAdmin && (
          <CustomCard style={{ marginBottom: 16, paddingBottom: 0 }}>
            <View style={styles.chartHeader}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16, color: '#374151' }}>
                {currentSlide === 0 ? 'Flujo de Caja (USD)' : currentSlide === 1 ? 'Rollos Producidos' : 'Kg Consumidos'}
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
            
            <View style={{ height: 330, paddingBottom: 10 }}>
              <PagerView
                ref={pagerRef}
                style={{ flex: 1 }}
                initialPage={0}
                onPageSelected={(e) => setCurrentSlide(e.nativeEvent.position)}
                scrollEnabled={false}
              >
                {/* Slide 1: Finanzas */}
                <View key="1">
                  <View style={styles.chartContainer}>
                    <LineChart
                      maxValue={maxFinanzas}
                      areaChart
                      curved
                      data={lineDataIngresos}
                      data2={lineDataEgresos}
                      height={200}
                      width={Dimensions.get('window').width - 120}
                      spacing={lineDataIngresos.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (lineDataIngresos.length - 1) : 45}
                      initialSpacing={15}
                      endSpacing={15}
                      pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        pointerColor: 'lightgray',
                        radius: 6,
                        pointerLabelWidth: 100,
                        pointerLabelHeight: 90,
                        activatePointersOnLongPress: false,
                        autoAdjustPointerLabelPosition: true,
                        pointerLabelComponent: (items: any) => {
                          const item1 = items[0];
                          const item2 = items.length > 1 ? items[1] : null;
                          return (
                            <View style={{ padding: 8, backgroundColor: '#1f2937', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{color: '#d1d5db', fontSize: 12, marginBottom: 4}}>{item1?.dataLabel || ''}</Text>
                              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                                <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginRight: 6}} />
                                <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>${item1?.value?.toFixed(2) || '0.00'}</Text>
                              </View>
                              {item2 && (
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                  <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginRight: 6}} />
                                  <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>${item2?.value?.toFixed(2) || '0.00'}</Text>
                                </View>
                              )}
                            </View>
                          );
                        },
                      }}
                      color1="#16a34a"
                      startFillColor1="#16a34a"
                      endFillColor1="#16a34a"
                      startOpacity1={0.3}
                      endOpacity1={0.05}
                      color2="#dc2626"
                      startFillColor2="#dc2626"
                      endFillColor2="#dc2626"
                      startOpacity2={0.3}
                      endOpacity2={0.05}
                      yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 11 }}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor="#e5e7eb"
                      rulesColor="#f3f4f6"
                      rulesType="dashed"
                      showVerticalLines
                      verticalLinesColor="#f3f4f6"
                      verticalLinesType="dashed"
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
                </View>

                {/* Slide 2: Rollos */}
                <View key="2">
                  <View style={styles.chartContainer}>
                    <LineChart
                      maxValue={maxRollosAdmin}
                      areaChart
                      curved
                      data={lineDataRollosAdmin}
                      height={200}
                      width={Dimensions.get('window').width - 120}
                      spacing={lineDataRollosAdmin.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (lineDataRollosAdmin.length - 1) : 45}
                      initialSpacing={15}
                      endSpacing={15}
                      color={theme.colors.primary}
                      startFillColor={theme.colors.primary}
                      endFillColor={theme.colors.primary}
                      startOpacity={0.3}
                      endOpacity={0.05}
                      yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 11 }}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor="#e5e7eb"
                      rulesColor="#f3f4f6"
                      rulesType="dashed"
                      noOfSections={4}
                    />
                  </View>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                      <Text variant="bodySmall">Rollos producidos</Text>
                    </View>
                  </View>
                </View>

                {/* Slide 3: Kg */}
                <View key="3">
                  <View style={styles.chartContainer}>
                    <LineChart
                      maxValue={maxKgAdmin}
                      areaChart
                      curved
                      data={lineDataKgAdmin}
                      height={200}
                      width={Dimensions.get('window').width - 120}
                      spacing={lineDataKgAdmin.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (lineDataKgAdmin.length - 1) : 45}
                      initialSpacing={15}
                      endSpacing={15}
                      color="#f59e0b"
                      startFillColor="#f59e0b"
                      endFillColor="#f59e0b"
                      startOpacity={0.3}
                      endOpacity={0.05}
                      yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 11 }}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor="#e5e7eb"
                      rulesColor="#f3f4f6"
                      rulesType="dashed"
                      noOfSections={4}
                      yAxisLabelSuffix=" kg"
                    />
                  </View>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                      <Text variant="bodySmall">Kg consumidos</Text>
                    </View>
                  </View>
                </View>
              </PagerView>

              {/* Puntos de paginación y flechas */}
              <View style={[styles.paginationContainer, { justifyContent: 'space-between', paddingHorizontal: 16 }]}>
                <IconButton 
                  icon="chevron-left" 
                  size={24}
                  iconColor={currentSlide === 0 ? theme.colors.surfaceDisabled : theme.colors.primary}
                  onPress={() => {
                    if (currentSlide > 0) pagerRef.current?.setPage(currentSlide - 1);
                  }} 
                  disabled={currentSlide === 0}
                  style={{ margin: 0 }}
                />
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {[0, 1, 2].map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: index === currentSlide ? theme.colors.primary : theme.colors.outlineVariant,
                          width: index === currentSlide ? 20 : 8,
                        },
                      ]}
                    />
                  ))}
                </View>

                <IconButton 
                  icon="chevron-right" 
                  size={24}
                  iconColor={currentSlide === 2 ? theme.colors.surfaceDisabled : theme.colors.primary}
                  onPress={() => {
                    if (currentSlide < 2) pagerRef.current?.setPage(currentSlide + 1);
                  }} 
                  disabled={currentSlide === 2}
                  style={{ margin: 0 }}
                />
              </View>
            </View>
          </CustomCard>
        )}

        {/* Gráfico de Producción — Operadores y demás roles */}
        {!isAdmin && (
          <CustomCard style={{ marginBottom: 16 }}>
            <View style={styles.chartHeader}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, color: '#374151' }}>
                📦 Mi Producción
              </Text>
              {/* Toggle de métrica */}
              <SegmentedButtons
                value={metricaProduccion}
                onValueChange={(v) => setMetricaProduccion(v as 'rollos' | 'kg')}
                buttons={[
                  { value: 'rollos', label: '🧻 Rollos', icon: 'counter' },
                  { value: 'kg', label: '⚖️ Kg', icon: 'weight-kilogram' },
                ]}
                density="small"
                style={{ marginBottom: 12 }}
              />
              {/* Filtro de período */}
              <SegmentedButtons
                value={prodPeriod}
                onValueChange={setProdPeriod}
                buttons={[
                  { value: 'Día', label: 'Hoy' },
                  { value: 'Semana', label: 'Semana' },
                  { value: 'Mes', label: 'Mes' },
                ]}
                density="small"
              />
            </View>
            <View style={styles.chartContainer}>
              {lineDataProduccion.every(d => d.value === 0) ? (
                <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 40 }}>
                  Sin producción registrada en este período.
                </Text>
              ) : (
                <LineChart
                  maxValue={maxProdOp}
                  areaChart
                  curved
                  data={lineDataProduccion}
                  height={220}
                  width={Dimensions.get('window').width - 120}
                  spacing={lineDataProduccion.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (lineDataProduccion.length - 1) : 45}
                  initialSpacing={15}
                  endSpacing={15}
                  pointerConfig={{
                    pointerStripHeight: 160,
                    pointerStripColor: 'lightgray',
                    pointerStripWidth: 2,
                    pointerColor: 'lightgray',
                    radius: 6,
                    pointerLabelWidth: 100,
                    pointerLabelHeight: 72,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (items: any) => {
                      const item = items[0];
                      return (
                        <View style={{ padding: 8, backgroundColor: '#1f2937', borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#d1d5db', fontSize: 12, marginBottom: 4 }}>{item?.dataLabel || ''}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginRight: 6 }} />
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                              {metricaProduccion === 'rollos' ? `${item?.value ?? 0} rollos` : `${(item?.value ?? 0).toFixed(1)} kg`}
                            </Text>
                          </View>
                        </View>
                      );
                    },
                  }}
                  color={theme.colors.primary}
                  startFillColor={theme.colors.primary}
                  endFillColor={theme.colors.primary}
                  startOpacity={0.3}
                  endOpacity={0.05}
                  yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 11 }}
                  yAxisLabelSuffix={metricaProduccion === 'rollos' ? '' : ' kg'}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor="#e5e7eb"
                  rulesColor="#f3f4f6"
                  rulesType="dashed"
                  showVerticalLines
                  verticalLinesColor="#f3f4f6"
                  verticalLinesType="dashed"
                  noOfSections={4}
                />
              )}
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text variant="bodySmall">{metricaProduccion === 'rollos' ? 'Rollos producidos' : 'Kg procesados'}</Text>
              </View>
            </View>
          </CustomCard>
        )}
      </ScrollView>

      {/* Dialog para seleccionar a cuál cliente enviar WhatsApp si hay más de uno */}
      <Portal>
        <Dialog visible={modalAlertasVisible} onDismiss={() => setModalAlertasVisible(false)}>
          <Dialog.Title>Enviar Recordatorio de Pago</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 300 }}>
              {metrics.alertasLista.map(item => (
                <View 
                  key={item.id} 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6'
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.razon_social}</Text>
                    <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                      Saldo: ${item.saldo.toFixed(2)} USD
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    buttonColor="#25D366"
                    textColor="#ffffff"
                    icon="whatsapp"
                    compact
                    onPress={() => {
                      sendWhatsAppReminder(item.razon_social, item.telefono, item.saldo, item.estadoFin);
                      setModalAlertasVisible(false);
                    }}
                  >
                    Enviar
                  </Button>
                </View>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalAlertasVisible(false)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB.Group
        open={fabOpen}
        visible
        safeAreaInsets={{ bottom: insets.bottom }}
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          { icon: 'plus-box-outline', label: 'Nuevo Pedido', onPress: () => router.push('/(screens)/nuevo-pedido') },
          { icon: 'paper-roll', label: 'Registrar Producción', onPress: () => router.push('/(screens)/registrar-produccion') },
          ...(perfil?.rol !== 'operador' ? [{ icon: 'truck', label: 'Registrar Viaje', onPress: () => router.push('/(screens)/registrar-viaje') }] : []),
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

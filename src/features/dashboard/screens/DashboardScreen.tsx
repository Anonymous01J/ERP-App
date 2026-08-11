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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Genera un string 'YYYY-MM-DD' de la fecha LOCAL del dispositivo
const localDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Normaliza cualquier string de fecha a 'YYYY-MM-DD' local
// Soporta tanto 'YYYY-MM-DD' como ISO UTC '2026-08-11T03:45:00.000Z'
const toLocalDate = (fechaStr: string): string => {
  if (!fechaStr) return '';
  if (fechaStr.length === 10) return fechaStr; // Ya es YYYY-MM-DD, no tocar
  const d = new Date(fechaStr); // ISO UTC → JS lo parsea como UTC y .getDate() da la hora local
  if (isNaN(d.getTime())) return fechaStr.substring(0, 10);
  return localDateStr(d);
};

const processMultiLineChart = (
  rawData: any[], 
  period: string, 
  valueKey: string, 
  nameKey: string, 
  hoy: Date
) => {
  const dataMap: Record<string, Record<string, number>> = {};
  const labelsEnOrden: string[] = [];
  const uniqueNames = new Set<string>();

  // NOTA: La fecha en rawData ya viene normalizada a YYYY-MM-DD local desde SQL
  // (usando CASE WHEN en el query para manejar ambos formatos)

  if (period === 'Día') {
    const hoyStr = localDateStr(hoy);
    const hourBlocks = [0, 4, 8, 12, 16, 20];
    hourBlocks.forEach(h => {
      const key = `${h.toString().padStart(2, '0')}:00`;
      labelsEnOrden.push(key);
      dataMap[key] = {};
    });

    for (const row of rawData) {
      if (!row.fecha) continue;
      const fDate = row.fecha.substring(0, 10);
      if (fDate === hoyStr) {
        // Produccion no guarda hora, ponemos todo en el bloque matutino
        const key = '08:00';
        const val = Number(row[valueKey]) || 0;
        const name = String(row[nameKey] || 'Sin nombre');
        if (val > 0) {
          dataMap[key][name] = (dataMap[key][name] ?? 0) + val;
          uniqueNames.add(name);
        }
      }
    }
  } else if (period === 'Semana') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const key = localDateStr(d);
      labelsEnOrden.push(key);
      dataMap[key] = {};
    }
    for (const row of rawData) {
      if (!row.fecha) continue;
      const f = row.fecha.substring(0, 10);
      if (dataMap[f] !== undefined) {
        const val = Number(row[valueKey]) || 0;
        const name = String(row[nameKey] || 'Sin nombre');
        if (val > 0) {
          dataMap[f][name] = (dataMap[f][name] ?? 0) + val;
          uniqueNames.add(name);
        }
      }
    }
  } else {
    // Mes: 4 semanas
    for (let i = 3; i >= 0; i--) {
      const start = new Date(hoy);
      start.setDate(start.getDate() - (i * 7 + 6));
      const startStr = `${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')}`;
      const key = `Sem ${4 - i} (${startStr})`;
      labelsEnOrden.push(key);
      dataMap[key] = {};
    }
    for (const row of rawData) {
      if (!row.fecha) continue;
      const fStr = row.fecha.substring(0, 10);
      // Parsear como local para evitar shift de timezone
      const [y, mo, dy] = fStr.split('-').map(Number);
      const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const dNorm = new Date(y, mo - 1, dy);
      const diffDays = Math.round((hoyNorm.getTime() - dNorm.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < 28) {
        const semIndex = 3 - Math.floor(diffDays / 7);
        if (labelsEnOrden[semIndex]) {
          const key = labelsEnOrden[semIndex];
          const val = Number(row[valueKey]) || 0;
          const name = String(row[nameKey] || 'Sin nombre');
          if (val > 0) {
            dataMap[key][name] = (dataMap[key][name] ?? 0) + val;
            uniqueNames.add(name);
          }
        }
      }
    }
  }

  const formatLabel = (lbl: string) => {
    if (period === 'Día') return lbl.substring(0, 5);
    if (period === 'Semana') {
      const parts = lbl.split('-');
      if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
      return lbl;
    }
    return lbl.split(' ')[0];
  };

  const namesArray = Array.from(uniqueNames);
  
  if (namesArray.length === 0) {
    return { 
      dataSet: [{ data: labelsEnOrden.map(lbl => ({ value: 0, label: formatLabel(lbl), dataLabel: formatLabel(lbl) })), color: '#9ca3af' }], 
      legends: [], 
      maxVal: 10 
    };
  }

  const dataSet = namesArray.map((name, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    return {
      data: labelsEnOrden.map(lbl => ({
        value: dataMap[lbl]?.[name] ?? 0,
        label: formatLabel(lbl),
        dataLabel: formatLabel(lbl)
      })),
      color,
      startFillColor: color,
      endFillColor: color,
      startOpacity: 0.3,
      endOpacity: 0.05,
      thickness: 2,
    };
  });

  const legends = namesArray.map((name, index) => ({
    name,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  let maxVal = 0;
  dataSet.forEach(set => set.data.forEach(d => { if (d.value > maxVal) maxVal = d.value; }));

  return { dataSet, legends, maxVal: maxVal * 1.2 || 10 };
};

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

  // 4. Stock Otros Productos
  const { data: productosReventaData = [] } = useQuery(`
    SELECT 
      COALESCE(SUM(stock_unidades * precio_compra_usd), 0) as capital_invertido,
      SUM(CASE WHEN stock_unidades <= 0 THEN 1 ELSE 0 END) as productos_agotados
    FROM productos_reventa
    WHERE estado = 'activo'
  `);

  // 5. Flujo de Caja (Para Gráficos — solo Admin)
  // CASE WHEN maneja ambos formatos de fecha
  const { data: flujoCaja = [] } = useQuery(
    isAdmin ? `
    SELECT 
      CASE WHEN length(fecha) > 10 THEN DATE(fecha, 'localtime') ELSE fecha END as fecha,
      tipo, 
      CASE WHEN moneda = 'USD' THEN monto ELSE monto / COALESCE(tasa_cambio, 1) END as monto_usd
    FROM movimientos
    WHERE CASE WHEN length(fecha) > 10 THEN DATE(fecha, 'localtime') ELSE fecha END >= DATE('now', 'localtime', '-27 days')
    UNION ALL
    SELECT 
      CASE WHEN length(fecha_pago) > 10 THEN DATE(fecha_pago, 'localtime') ELSE fecha_pago END as fecha,
      'ingreso' as tipo, monto_equivalente_usd as monto_usd
    FROM abonos_pagos
    WHERE CASE WHEN length(fecha_pago) > 10 THEN DATE(fecha_pago, 'localtime') ELSE fecha_pago END >= DATE('now', 'localtime', '-27 days')
  ` : 'SELECT NULL as fecha, NULL as tipo, NULL as monto_usd WHERE 1=0'
  );

  // 6. Producción de Rollos por Presentación
  // CASE WHEN maneja ambos formatos: 'YYYY-MM-DD' (nuevos) e ISO UTC (registros viejos)
  // Esto evita el bug de DATE('YYYY-MM-DD', 'localtime') que desplaza un día hacia atrás
  const { data: produccionRollosRaw = [] } = useQuery(`
    SELECT 
      CASE 
        WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime')
        ELSE pd.fecha
      END as fecha,
      pp.nombre as nombre_presentacion,
      SUM(pd.cantidad_rollos_total) as total_rollos
    FROM produccion_diaria pd
    LEFT JOIN productos_presentacion pp ON pp.id = pd.id_producto
    WHERE CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END >= DATE('now', 'localtime', '-27 days')
    GROUP BY CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END, pp.nombre
    ORDER BY 1 ASC
  `);

  // 7. Producción de Kg por Tipo de Papel
  const { data: produccionKgRaw = [] } = useQuery(`
    SELECT 
      CASE 
        WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime')
        ELSE pd.fecha
      END as fecha,
      tp.nombre as tipo_papel_nombre,
      SUM(cb.kg_consumidos) as total_kg
    FROM consumo_bobinas cb
    JOIN produccion_diaria pd ON pd.id = cb.id_produccion
    JOIN bobinas_grandes bg ON bg.id = cb.id_bobina
    LEFT JOIN tipos_papel tp ON tp.id = bg.id_tipo_papel
    WHERE CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END >= DATE('now', 'localtime', '-27 days')
    GROUP BY CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END, tp.nombre
    ORDER BY 1 ASC
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

    const currentMonth = hoy.getMonth();
    const currentYear = hoy.getFullYear();

    const flujoCajaMes = (flujoCaja as any[]).filter(r => {
      if (!r.fecha) return false;
      const d = new Date(r.fecha);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIngresos = flujoCajaMes.filter(r => r.tipo === 'ingreso').reduce((sum, r) => sum + (r.monto_usd || 0), 0);
    const totalEgresos = flujoCajaMes.filter(r => r.tipo === 'egreso').reduce((sum, r) => sum + (r.monto_usd || 0), 0);
    const roi = totalEgresos > 0 ? ((totalIngresos - totalEgresos) / totalEgresos) * 100 : 0;

    return {
      pedidosPorProducir,
      pedidosListos,
      pagosPorVencer,
      pagosVencidos,
      alertasLista,
      bobinasKg: bobinasData.length > 0 ? bobinasData[0].total_kg : 0,
      productosCapitalInvertido: productosReventaData.length > 0 ? productosReventaData[0].capital_invertido : 0,
      productosAgotados: productosReventaData.length > 0 ? productosReventaData[0].productos_agotados : 0,
      roi,
    };
  }, [pedidosStats, creditosPendientes, bobinasData, productosReventaData, flujoCaja]);

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
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (chartPeriod === 'Día') {
      const hourBlocks = [0, 4, 8, 12, 16, 20];
      hourBlocks.forEach(h => {
        const key = `${h.toString().padStart(2, '0')}:00`;
        labelsEnOrden.push(key);
        dataIngresosMap[key] = 0;
        dataEgresosMap[key] = 0;
      });

      const hoyStr = localDateStr(hoy);
      for (const row of flujoCaja as any[]) {
        if (!row.fecha) continue;
        // La fecha ya viene como YYYY-MM-DD desde SQL (DATE(..., 'localtime'))
        if (row.fecha === hoyStr) {
          if (row.tipo === 'ingreso') dataIngresosMap['08:00'] += row.monto_usd;
          else dataEgresosMap['08:00'] += row.monto_usd;
        }
      }
    } else if (chartPeriod === 'Semana') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoy);
        d.setDate(d.getDate() - i);
        const key = localDateStr(d);
        labelsEnOrden.push(key);
        dataIngresosMap[key] = 0;
        dataEgresosMap[key] = 0;
      }
      for (const row of flujoCaja as any[]) {
        if (!row.fecha) continue;
        const f = row.fecha.substring(0, 10);
        if (dataIngresosMap[f] !== undefined) {
          if (row.tipo === 'ingreso') dataIngresosMap[f] += row.monto_usd;
          else dataEgresosMap[f] += row.monto_usd;
        }
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(hoy);
        start.setDate(start.getDate() - (i * 7 + 6));
        const startStr = `${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')}`;
        const key = `Sem ${4 - i} (${startStr})`;
        labelsEnOrden.push(key);
        dataIngresosMap[key] = 0;
        dataEgresosMap[key] = 0;
      }

      for (const row of flujoCaja as any[]) {
        if (!row.fecha) continue;
        // Comparar como local: fecha viene como YYYY-MM-DD local desde SQL
        const fStr = row.fecha.substring(0, 10);
        const d = new Date(fStr + 'T00:00:00');
        const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const diffDays = Math.round((hoyNorm.getTime() - d.getTime()) / 86400000);
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


  // --- PROCESAMIENTO GRÁFICO PRODUCCIÓN (Ambos) ---
  const { 
    dataSetRollos, legendsRollos, maxRollos,
    dataSetKg, legendsKg, maxKg
  } = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    const rollosRes = processMultiLineChart(produccionRollosRaw, isAdmin ? chartPeriod : prodPeriod, 'total_rollos', 'nombre_presentacion', hoy);
    const kgRes = processMultiLineChart(produccionKgRaw, isAdmin ? chartPeriod : prodPeriod, 'total_kg', 'tipo_papel_nombre', hoy);

    return { 
      dataSetRollos: rollosRes.dataSet, legendsRollos: rollosRes.legends, maxRollos: rollosRes.maxVal,
      dataSetKg: kgRes.dataSet, legendsKg: kgRes.legends, maxKg: kgRes.maxVal
    };
  }, [produccionRollosRaw, produccionKgRaw, chartPeriod, prodPeriod, isAdmin]);

  const maxFinanzas = Math.max(10, ...lineDataIngresos.map(d => d.value), ...lineDataEgresos.map(d => d.value)) * 1.2;
  const maxProdOp = metricaProduccion === 'rollos' ? maxRollos : maxKg;

  return (
    <View style={globalStyles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>
        
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginBottom: 16, color: '#1f2937' }}>Visión Global</Text>

        {/* Tarjetas de Métricas Operativas */}
        <View style={styles.grid}>
          <CustomCard style={styles.gridItem}>
            <View style={styles.gridItemContent}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={theme.colors.primary} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="titleMedium" style={[styles.gridItemNumber, { fontSize: 20, color: theme.colors.primary }]}>{metrics.pedidosPorProducir}</Text>
                  <Text variant="labelSmall" style={styles.gridItemLabel}>Pendientes</Text>
                </View>
                <View style={{ height: 24, width: 1, backgroundColor: '#e5e7eb' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text variant="titleMedium" style={[styles.gridItemNumber, { fontSize: 20, color: '#16a34a' }]}>{metrics.pedidosListos}</Text>
                  <Text variant="labelSmall" style={styles.gridItemLabel}>Listos</Text>
                </View>
              </View>
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
              <MaterialCommunityIcons name="currency-usd" size={24} color="#0284c7" />
              <Text variant="titleLarge" style={[styles.gridItemNumber, { fontSize: 20 }]}>
                ${metrics.productosCapitalInvertido.toFixed(2)}
              </Text>
              <Text variant="labelSmall" style={styles.gridItemLabel}>Inv. Otros Prod.</Text>
              {metrics.productosAgotados > 0 && (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4, fontWeight: 'bold' }}>
                  {metrics.productosAgotados} {metrics.productosAgotados === 1 ? 'agotado' : 'agotados'}
                </Text>
              )}
            </View>
          </CustomCard>

          {isAdmin && (
            <CustomCard style={styles.gridItem}>
              <View style={styles.gridItemContent}>
                <MaterialCommunityIcons 
                  name={metrics.roi >= 0 ? "trending-up" : "trending-down"} 
                  size={24} 
                  color={metrics.roi >= 0 ? "#16a34a" : "#dc2626"} 
                />
                <Text variant="titleLarge" style={[styles.gridItemNumber, { fontSize: 20, color: metrics.roi >= 0 ? '#16a34a' : '#dc2626' }]}>
                  {metrics.roi > 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
                </Text>
                <Text variant="labelSmall" style={styles.gridItemLabel}>ROI del Mes</Text>
              </View>
            </CustomCard>
          )}
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
            
            <View style={{ height: 315 }}>
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
                </View>

                {/* Slide 2: Rollos — SIN leyenda (se pone fuera del PagerView) */}
                <View key="2">
                  <View style={styles.chartContainer}>
                    <LineChart
                      maxValue={maxRollos}
                      areaChart
                      curved
                      dataSet={dataSetRollos}
                      height={200}
                      width={Dimensions.get('window').width - 120}
                      spacing={dataSetRollos[0]?.data?.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (dataSetRollos[0].data.length - 1) : 45}
                      initialSpacing={15}
                      endSpacing={15}
                      pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        pointerColor: 'lightgray',
                        radius: 6,
                        pointerLabelWidth: 130,
                        pointerLabelHeight: 90,
                        activatePointersOnLongPress: false,
                        autoAdjustPointerLabelPosition: true,
                        pointerLabelComponent: (items: any) => {
                          return (
                            <View style={{ padding: 8, backgroundColor: '#1f2937', borderRadius: 8, alignItems: 'flex-start' }}>
                              <Text style={{ color: '#d1d5db', fontSize: 12, marginBottom: 4 }}>{items[0]?.dataLabel || ''}</Text>
                              {items.map((item: any, i: number) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], marginRight: 6 }} />
                                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{item?.value ?? 0} rollos</Text>
                                </View>
                              ))}
                            </View>
                          );
                        },
                      }}
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
                </View>

                {/* Slide 3: Kg — SIN leyenda (se pone fuera del PagerView) */}
                <View key="3">
                  <View style={styles.chartContainer}>
                    <LineChart
                      maxValue={maxKg}
                      areaChart
                      curved
                      dataSet={dataSetKg}
                      height={200}
                      width={Dimensions.get('window').width - 120}
                      spacing={dataSetKg[0]?.data?.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (dataSetKg[0].data.length - 1) : 45}
                      initialSpacing={15}
                      endSpacing={15}
                      pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        pointerColor: 'lightgray',
                        radius: 6,
                        pointerLabelWidth: 130,
                        pointerLabelHeight: 90,
                        activatePointersOnLongPress: false,
                        autoAdjustPointerLabelPosition: true,
                        pointerLabelComponent: (items: any) => {
                          return (
                            <View style={{ padding: 8, backgroundColor: '#1f2937', borderRadius: 8, alignItems: 'flex-start' }}>
                              <Text style={{ color: '#d1d5db', fontSize: 12, marginBottom: 4 }}>{items[0]?.dataLabel || ''}</Text>
                              {items.map((item: any, i: number) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], marginRight: 6 }} />
                                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{(item?.value ?? 0).toFixed(1)} kg</Text>
                                </View>
                              ))}
                            </View>
                          );
                        },
                      }}
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

            {/* Leyenda FUERA del PagerView para que siempre sea visible */}
            <View style={styles.chartLegendContainer}>
              {currentSlide === 0 && (
                <>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendColor, { backgroundColor: '#16a34a' }]} />
                    <Text variant="bodyMedium">Ingresos</Text>
                  </View>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendColor, { backgroundColor: '#dc2626' }]} />
                    <Text variant="bodyMedium">Egresos</Text>
                  </View>
                </>
              )}
              {currentSlide === 1 && (
                legendsRollos.length > 0
                  ? legendsRollos.map((leg: any, idx: number) => (
                      <View key={idx} style={styles.chartLegendItem}>
                        <View style={[styles.chartLegendColor, { backgroundColor: leg.color }]} />
                        <Text variant="bodyMedium">{leg.name}</Text>
                      </View>
                    ))
                  : <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: theme.colors.primary }]} />
                      <Text variant="bodyMedium">Rollos producidos</Text>
                    </View>
              )}
              {currentSlide === 2 && (
                legendsKg.length > 0
                  ? legendsKg.map((leg: any, idx: number) => (
                      <View key={idx} style={styles.chartLegendItem}>
                        <View style={[styles.chartLegendColor, { backgroundColor: leg.color }]} />
                        <Text variant="bodyMedium">{leg.name}</Text>
                      </View>
                    ))
                  : <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: '#f59e0b' }]} />
                      <Text variant="bodyMedium">Kg consumidos</Text>
                    </View>
              )}
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
                  { value: 'rollos', label: 'Rollos', icon: 'counter' },
                  { value: 'kg', label: 'Kg', icon: 'weight-kilogram' },
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
              {((metricaProduccion === 'rollos' && dataSetRollos[0]?.data.every((d: any) => d.value === 0)) || (metricaProduccion === 'kg' && dataSetKg[0]?.data.every((d: any) => d.value === 0))) ? (
                <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 40 }}>
                  Sin producción registrada en este período.
                </Text>
              ) : (
                <LineChart
                  maxValue={maxProdOp}
                  areaChart
                  curved
                  dataSet={metricaProduccion === 'rollos' ? dataSetRollos : dataSetKg}
                  height={220}
                  width={Dimensions.get('window').width - 120}
                  spacing={
                    (metricaProduccion === 'rollos' ? dataSetRollos : dataSetKg)[0]?.data?.length > 1 
                      ? (Dimensions.get('window').width - 120 - 30) / ((metricaProduccion === 'rollos' ? dataSetRollos : dataSetKg)[0].data.length - 1) 
                      : 45
                  }
                  initialSpacing={15}
                  endSpacing={15}
                  pointerConfig={{
                    pointerStripHeight: 180,
                    pointerStripColor: 'lightgray',
                    pointerStripWidth: 2,
                    pointerColor: 'lightgray',
                    radius: 6,
                    pointerLabelWidth: 130,
                    pointerLabelHeight: 90,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (items: any) => {
                      const suffix = metricaProduccion === 'rollos' ? ' rollos' : ' kg';
                      return (
                        <View style={{ padding: 8, backgroundColor: '#1f2937', borderRadius: 8, alignItems: 'flex-start' }}>
                          <Text style={{ color: '#d1d5db', fontSize: 12, marginBottom: 4 }}>{items[0]?.dataLabel || ''}</Text>
                          {items.map((item: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], marginRight: 6 }} />
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                                {metricaProduccion === 'kg' ? (item?.value ?? 0).toFixed(1) : (item?.value ?? 0)}{suffix}
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    },
                  }}
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
            <View style={styles.chartLegendContainer}>
              {(metricaProduccion === 'rollos' ? legendsRollos : legendsKg).length > 0
                ? (metricaProduccion === 'rollos' ? legendsRollos : legendsKg).map((leg: any, idx: number) => (
                    <View key={idx} style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: leg.color }]} />
                      <Text variant="bodyMedium">{leg.name}</Text>
                    </View>
                  ))
                : (
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: theme.colors.primary }]} />
                      <Text variant="bodyMedium">{metricaProduccion === 'rollos' ? 'Rollos producidos' : 'Kg procesados'}</Text>
                    </View>
                  )
              }
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
        style={{ marginBottom: -40 }}
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
  chartContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignItems: 'center', overflow: 'hidden' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  // Leyendas estilo Reportes: lista vertical con círculo grande y texto
  chartLegendContainer: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
    width: '100%',
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartLegendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
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

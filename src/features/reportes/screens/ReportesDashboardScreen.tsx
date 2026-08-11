import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Text, Appbar, useTheme, SegmentedButtons, Button, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { globalStyles } from '@core/theme/globalStyles';
import { CustomCard } from '@components/ui/CustomCard';
import { DatePickerInput } from '@components/ui/DatePickerInput';
import { useQuery } from '@powersync/react';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import Toast from 'react-native-toast-message';
import ViewShot from 'react-native-view-shot';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generateProductionPDF, generateFinancePDF, generateLogisticsPDF } from '../utils/generatePdf';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const CATEGORY_COLORS: Record<string, string> = {
  gasolina: '#dc2626',
  peaje: '#1e3a8a',
  viaticos: '#f59e0b',
  mantenimiento: '#8b5cf6',
  operativos: '#14b8a6',
  otros: '#9ca3af'
};

// Genera 'YYYY-MM-DD' en hora local del dispositivo
const localDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function ReportesDashboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  
  // Vista Activa
  const [vista, setVista] = useState('produccion');
  
  // Filtro de Tiempo
  const [filtroTiempo, setFiltroTiempo] = useState('mensual');
  const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState('');
  const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('resumido');

  const chartRef = useRef<ViewShot>(null);
  const chartRefRollos = useRef<ViewShot>(null);
  const chartRefKg = useRef<ViewShot>(null);

  // Determinar la fecha de inicio según el filtro
  const fechaInicio = useMemo(() => {
    if (filtroTiempo === 'personalizado' && fechaInicioPersonalizada) {
      return new Date(fechaInicioPersonalizada).toISOString();
    }
    const date = new Date();
    if (filtroTiempo === 'mensual' || filtroTiempo === 'personalizado') {
      date.setMonth(date.getMonth() - 1);
    } else if (filtroTiempo === 'trimestral') {
      date.setMonth(date.getMonth() - 3);
    } else if (filtroTiempo === 'semestral') {
      date.setMonth(date.getMonth() - 6);
    } else if (filtroTiempo === 'anual') {
      date.setFullYear(date.getFullYear() - 1);
    }
    return date.toISOString();
  }, [filtroTiempo, fechaInicioPersonalizada]);

  // Consultas PowerSync
  const queryData = useMemo(() => {
    let queryStr = `
      SELECT 
        bg.id, bg.peso_inicial_kg, bg.peso_actual_kg, bg.peso_muerto_kg, bg.merma_core_kg, bg.fecha_llegada, bg.fecha_gasto,
        p.nombre_empresa as proveedor,
        tp.nombre as tipo_papel
      FROM bobinas_grandes bg
      LEFT JOIN proveedores p ON bg.id_proveedor = p.id
      LEFT JOIN tipos_papel tp ON bg.id_tipo_papel = tp.id
      WHERE bg.fecha_llegada >= ?
    `;
    let params: any[] = [fechaInicio];

    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND fecha_llegada <= ?`;
      const end = new Date(fechaFinPersonalizada);
      end.setHours(23, 59, 59, 999);
      params.push(end.toISOString());
    }

    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const { data: bobinas = [] } = useQuery(queryData.queryStr, queryData.params);

  const queryDataPedidos = useMemo(() => {
    let queryStr = `SELECT p.monto_total, p.fecha_creacion, p.estado_pago, c.razon_social FROM pedidos p LEFT JOIN clientes c ON p.id_cliente = c.id WHERE p.fecha_creacion >= ?`;
    let params: any[] = [fechaInicio];
    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND p.fecha_creacion <= ?`;
      const end = new Date(fechaFinPersonalizada);
      end.setHours(23, 59, 59, 999);
      params.push(end.toISOString());
    }
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const queryDataAbonos = useMemo(() => {
    let queryStr = `SELECT monto_equivalente_usd FROM abonos_pagos WHERE fecha_pago >= ?`;
    let params: any[] = [fechaInicio];
    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND fecha_pago <= ?`;
      const end = new Date(fechaFinPersonalizada);
      end.setHours(23, 59, 59, 999);
      params.push(end.toISOString());
    }
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const queryDataLogistica = useMemo(() => {
    let queryStr = `SELECT id_viaje, tipo, categoria, monto, moneda, tasa_cambio, fecha, descripcion FROM movimientos WHERE fecha >= ?`;
    let params: any[] = [fechaInicio];
    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND fecha <= ?`;
      const end = new Date(fechaFinPersonalizada);
      end.setHours(23, 59, 59, 999);
      params.push(end.toISOString());
    }
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const queryDataProduccion = useMemo(() => {
    let queryStr = `
      SELECT 
        pd.fecha,
        pp.nombre as presentacion,
        cb.id_bobina,
        SUM(pd.cantidad_rollos_total) as total_rollos,
        COALESCE(SUM(cb.kg_consumidos), 0) as total_kg,
        p.nombre_empresa as proveedor
      FROM produccion_diaria pd
      LEFT JOIN consumo_bobinas cb ON cb.id_produccion = pd.id
      LEFT JOIN bobinas_grandes bg ON cb.id_bobina = bg.id
      LEFT JOIN proveedores p ON bg.id_proveedor = p.id
      LEFT JOIN productos_presentacion pp ON pd.id_producto = pp.id
      WHERE pd.fecha >= ?
    `;
    let params: any[] = [fechaInicio];
    
    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND pd.fecha <= ?`;
      const end = new Date(fechaFinPersonalizada);
      end.setHours(23, 59, 59, 999);
      params.push(end.toISOString());
    }
    queryStr += ` GROUP BY pd.fecha, pp.nombre, cb.id_bobina, p.nombre_empresa ORDER BY pd.fecha ASC`;
    
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  // Queries separados para Rollos (por presentación) y Kg (por tipo de papel)
  const queryDataRollos = useMemo(() => {
    let queryStr = `
      SELECT 
        CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END as fecha,
        pp.nombre as nombre_serie,
        SUM(pd.cantidad_rollos_total) as valor
      FROM produccion_diaria pd
      LEFT JOIN productos_presentacion pp ON pd.id_producto = pp.id
      WHERE CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END >= ?
    `;
    let params: any[] = [fechaInicio.substring(0, 10)];
    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END <= ?`;
      params.push(fechaFinPersonalizada.substring(0, 10));
    }
    queryStr += ` GROUP BY 1, pp.nombre ORDER BY 1 ASC`;
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const queryDataKg = useMemo(() => {
    let queryStr = `
      SELECT 
        CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END as fecha,
        COALESCE(tp.nombre, 'Sin tipo') as nombre_serie,
        SUM(cb.kg_consumidos) as valor
      FROM consumo_bobinas cb
      JOIN produccion_diaria pd ON pd.id = cb.id_produccion
      JOIN bobinas_grandes bg ON bg.id = cb.id_bobina
      LEFT JOIN tipos_papel tp ON tp.id = bg.id_tipo_papel
      WHERE CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END >= ?
    `;
    let params: any[] = [fechaInicio.substring(0, 10)];
    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND CASE WHEN length(pd.fecha) > 10 THEN DATE(pd.fecha, 'localtime') ELSE pd.fecha END <= ?`;
      params.push(fechaFinPersonalizada.substring(0, 10));
    }
    queryStr += ` GROUP BY 1, tp.nombre ORDER BY 1 ASC`;
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const { data: pedidosFin = [] } = useQuery(queryDataPedidos.queryStr, queryDataPedidos.params);
  const { data: abonosFin = [] } = useQuery(queryDataAbonos.queryStr, queryDataAbonos.params);
  const { data: gastosViaje = [] } = useQuery(queryDataLogistica.queryStr, queryDataLogistica.params);
  const { data: produccionRaw = [] } = useQuery(queryDataProduccion.queryStr, queryDataProduccion.params);
  const { data: rollosRaw = [] } = useQuery(queryDataRollos.queryStr, queryDataRollos.params);
  const { data: kgRaw = [] } = useQuery(queryDataKg.queryStr, queryDataKg.params);

  // Cálculos de Mermas
  const metricasMermas = useMemo(() => {
    let bruto = 0;
    let desperdicio = 0; // peso_muerto + merma_core
    let util = 0;

    bobinas.forEach((b: any) => {
      bruto += (b.peso_inicial_kg || 0);
      const muerto = (b.peso_muerto_kg || 0);
      const core = (b.merma_core_kg || 0);
      desperdicio += (muerto + core);
      
      // El peso util es lo que ya se gastó, menos el desperdicio
      // Peso gastado = inicial - actual
      const gastado = (b.peso_inicial_kg || 0) - (b.peso_actual_kg || 0);
      util += Math.max(0, gastado - (muerto + core));
    });

    return { bruto, desperdicio, util };
  }, [bobinas]);

  // Cálculos Rendimiento Proveedores
  const rendimientoProveedores = useMemo(() => {
    const map: Record<string, { bruto: number; desperdicio: number }> = {};
    bobinas.forEach((b: any) => {
      const prov = b.proveedor || 'Sin Proveedor';
      if (!map[prov]) map[prov] = { bruto: 0, desperdicio: 0 };
      
      const bruto = b.peso_inicial_kg || 0;
      const desperdicio = (b.peso_muerto_kg || 0) + (b.merma_core_kg || 0);
      
      map[prov].bruto += bruto;
      map[prov].desperdicio += desperdicio;
    });

    return Object.entries(map).map(([proveedor, data]) => {
      const util = data.bruto - data.desperdicio;
      const eficiencia = data.bruto > 0 ? (util / data.bruto) * 100 : 0;
      return { proveedor, ...data, util, eficiencia };
    }).sort((a, b) => b.eficiencia - a.eficiencia);
  }, [bobinas]);

  // Procesa datos multi-línea por nombre_serie para el período dado
  const processMultiLine = (
    rawData: any[], 
    filtro: string, 
    hoy: Date, 
    fechaIni: string, 
    fechaFin: string
  ) => {
    const dataMap: Record<string, Record<string, number>> = {};
    const labelsEnOrden: string[] = [];
    const uniqueNames = new Set<string>();

    const formatLabel = (lbl: string) => {
      if (lbl.startsWith('Sem')) return lbl.split(' ')[0];
      if (lbl.length === 7) { const p = lbl.split('-'); return `${p[1]}/${p[0].slice(2)}`; }
      if (lbl.length === 10) { const p = lbl.split('-'); return `${p[2]}/${p[1]}`; }
      return lbl;
    };

    if (filtro === 'personalizado' && fechaIni && fechaFin) {
      const inicio = new Date(fechaIni + 'T00:00:00');
      const fin = new Date(fechaFin + 'T00:00:00');
      const diffDays = Math.round((fin.getTime() - inicio.getTime()) / 86400000);
      if (diffDays <= 31) {
        for (let i = 0; i <= diffDays; i++) {
          const d = new Date(inicio); d.setDate(d.getDate() + i);
          const key = localDateStr(d);
          labelsEnOrden.push(key); dataMap[key] = {};
        }
      } else {
        const diffWeeks = Math.floor(diffDays / 7);
        for (let i = 0; i <= diffWeeks; i++) {
          const s = new Date(inicio); s.setDate(s.getDate() + i * 7);
          const key = `Sem (${(s.getMonth()+1).toString().padStart(2,'0')}-${s.getDate().toString().padStart(2,'0')})`;
          labelsEnOrden.push(key); dataMap[key] = {};
        }
      }
    } else if (filtro === 'mensual') {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(hoy); start.setDate(start.getDate() - (i * 7 + 6));
        const key = `Sem ${4 - i} (${(start.getMonth()+1).toString().padStart(2,'0')}-${start.getDate().toString().padStart(2,'0')})`;
        labelsEnOrden.push(key); dataMap[key] = {};
      }
    } else {
      const meses = filtro === 'trimestral' ? 3 : filtro === 'semestral' ? 6 : 12;
      for (let i = meses - 1; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
        labelsEnOrden.push(key); dataMap[key] = {};
      }
    }

    for (const row of rawData as any[]) {
      if (!row.fecha) continue;
      const f = row.fecha.substring(0, 10);
      const name = String(row.nombre_serie || 'Sin nombre');
      const val = Number(row.valor) || 0;
      if (val <= 0) continue;

      let key: string | undefined;
      if (filtro === 'personalizado' && fechaIni && fechaFin) {
        const fin = new Date(fechaFin + 'T00:00:00');
        const inicio = new Date(fechaIni + 'T00:00:00');
        const diffDays = Math.round((fin.getTime() - inicio.getTime()) / 86400000);
        if (diffDays <= 31) {
          key = dataMap[f] !== undefined ? f : undefined;
        } else {
          const [y, mo, dy] = f.split('-').map(Number);
          const dNorm = new Date(y, mo - 1, dy);
          const pastDays = Math.round((fin.getTime() - dNorm.getTime()) / 86400000);
          const semIndex = labelsEnOrden.length - 1 - Math.floor(pastDays / 7);
          key = labelsEnOrden[semIndex];
        }
      } else if (filtro === 'mensual') {
        const [y, mo, dy] = f.split('-').map(Number);
        const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const dNorm = new Date(y, mo - 1, dy);
        const diffDays = Math.round((hoyNorm.getTime() - dNorm.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 28) {
          const semIndex = 3 - Math.floor(diffDays / 7);
          key = labelsEnOrden[semIndex];
        }
      } else {
        key = f.slice(0, 7); // YYYY-MM
      }

      if (key && dataMap[key] !== undefined) {
        dataMap[key][name] = (dataMap[key][name] ?? 0) + val;
        uniqueNames.add(name);
      }
    }

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
        data: labelsEnOrden.map(lbl => ({ value: dataMap[lbl]?.[name] ?? 0, label: formatLabel(lbl), dataLabel: formatLabel(lbl) })),
        color, startFillColor: color, endFillColor: color, startOpacity: 0.3, endOpacity: 0.05, thickness: 2,
      };
    });
    const legends = namesArray.map((name, index) => ({ name, color: CHART_COLORS[index % CHART_COLORS.length] }));
    let maxVal = 0;
    dataSet.forEach(s => s.data.forEach(d => { if (d.value > maxVal) maxVal = d.value; }));
    return { dataSet, legends, maxVal: maxVal * 1.2 || 10 };
  };

  const { dataSetRollos, legendsRollos, maxRollos } = useMemo(() => {
    const hoy = new Date();
    const res = processMultiLine(rollosRaw, filtroTiempo, hoy, fechaInicioPersonalizada, fechaFinPersonalizada);
    return { dataSetRollos: res.dataSet, legendsRollos: res.legends, maxRollos: res.maxVal };
  }, [rollosRaw, filtroTiempo, fechaInicioPersonalizada, fechaFinPersonalizada]);

  const { dataSetKg, legendsKg, maxKg } = useMemo(() => {
    const hoy = new Date();
    const res = processMultiLine(kgRaw, filtroTiempo, hoy, fechaInicioPersonalizada, fechaFinPersonalizada);
    return { dataSetKg: res.dataSet, legendsKg: res.legends, maxKg: res.maxVal };
  }, [kgRaw, filtroTiempo, fechaInicioPersonalizada, fechaFinPersonalizada]);

  // Cálculos Finanzas
  const metricasFinanzas = useMemo(() => {
    let ventas = 0;
    let cobranzas = 0;
    let inversion = 0;
    
    pedidosFin.forEach((p: any) => ventas += (p.monto_total || 0));
    abonosFin.forEach((a: any) => cobranzas += (a.monto_equivalente_usd || 0));
    
    gastosViaje.forEach((m: any) => {
      const montoUsd = m.moneda === 'USD' ? m.monto : (m.monto / (m.tasa_cambio || 1));
      if (m.tipo === 'ingreso') {
        cobranzas += montoUsd;
      } else {
        inversion += montoUsd;
      }
    });

    const roi = inversion > 0 ? ((cobranzas - inversion) / inversion) * 100 : 0;

    return { ventas, cobranzas, cuentasPorCobrar: ventas - cobranzas, inversion, roi };
  }, [pedidosFin, abonosFin, gastosViaje]);

  // Cálculos Logística
  const metricasLogistica = useMemo(() => {
    const desglose: Record<string, number> = { gasolina: 0, peaje: 0, viaticos: 0, mantenimiento: 0, operativos: 0, otros: 0 };
    let totalGastos = 0;
    
    gastosViaje.filter((m: any) => m.id_viaje !== null).forEach((g: any) => {
      const montoUsd = g.moneda === 'USD' ? g.monto : (g.monto / (g.tasa_cambio || 1));
      const cat = g.categoria || 'otros';
      if (desglose[cat] !== undefined) {
        desglose[cat] += montoUsd;
      } else {
        desglose['otros'] += montoUsd;
      }
      totalGastos += montoUsd;
    });
    
    return { desglose, totalGastos };
  }, [gastosViaje]);

    const totalPie = metricasMermas.util + metricasMermas.desperdicio;
    const utilPct = totalPie > 0 ? ((metricasMermas.util / totalPie) * 100).toFixed(0) + '%' : '0%';
    const mermaPct = totalPie > 0 ? ((metricasMermas.desperdicio / totalPie) * 100).toFixed(0) + '%' : '0%';

    const pieData = [
      { value: metricasMermas.util, color: theme.colors.primary, text: utilPct },
      { value: metricasMermas.desperdicio, color: theme.colors.error, text: mermaPct },
    ];

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      let label = '';
      if (filtroTiempo === 'mensual') label = 'Último Mes';
      if (filtroTiempo === 'trimestral') label = 'Últimos 3 Meses';
      if (filtroTiempo === 'semestral') label = 'Últimos 6 Meses';
      if (filtroTiempo === 'anual') label = 'Último Año';
      if (filtroTiempo === 'personalizado') {
        label = (fechaInicioPersonalizada || 'Inicio') + ' hasta ' + (fechaFinPersonalizada || 'Hoy');
      }
      
      let chartBase64 = '';
      let chartBase64Rollos = '';
      let chartBase64Kg = '';
      try {
        if (chartRef.current?.capture) {
          // Obtenemos la captura del gráfico directamente en Base64
          chartBase64 = await chartRef.current.capture();
        }
        if (chartRefRollos.current?.capture) {
          chartBase64Rollos = await chartRefRollos.current.capture();
        }
        if (chartRefKg.current?.capture) {
          chartBase64Kg = await chartRefKg.current.capture();
        }
      } catch (e) {
        console.warn('No se pudo capturar el gráfico, el PDF se generará sin él', e);
      }
      
      if (vista === 'produccion') {
        await generateProductionPDF(label, metricasMermas, chartBase64, chartBase64Rollos, chartBase64Kg, tipoReporte === 'detallado', bobinas, produccionRaw, rendimientoProveedores);
      } else if (vista === 'finanzas') {
        await generateFinancePDF(label, metricasFinanzas, chartBase64, tipoReporte === 'detallado', pedidosFin, abonosFin, gastosViaje);
      } else {
        await generateLogisticsPDF(label, metricasLogistica, chartBase64, tipoReporte === 'detallado', gastosViaje);
      }
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title="Reportes" subtitle={vista === 'produccion' ? "Producción" : vista === 'finanzas' ? "Finanzas" : "Logística"} />
        <Appbar.Action icon="file-pdf-box" onPress={handleExportPDF} color={theme.colors.error} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={[globalStyles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        <SegmentedButtons
          value={vista}
          onValueChange={setVista}
          buttons={[
            { value: 'produccion', label: 'Producción', icon: 'factory' },
            { value: 'finanzas', label: 'Finanzas', icon: 'cash-register' },
            { value: 'logistica', label: 'Logística', icon: 'truck-delivery' },
          ]}
          style={{ marginBottom: 16 }}
        />

        <SegmentedButtons
          value={tipoReporte}
          onValueChange={setTipoReporte}
          buttons={[
            { value: 'resumido', label: 'Resumen' },
            { value: 'detallado', label: 'Detallado' },
          ]}
          style={{ marginBottom: 16 }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <SegmentedButtons
            value={filtroTiempo}
            onValueChange={setFiltroTiempo}
            buttons={[
              { value: 'mensual', label: '1 Mes' },
              { value: 'trimestral', label: '3 Mes' },
              { value: 'semestral', label: '6 Mes' },
              { value: 'anual', label: '1 Año' },
              { value: 'personalizado', label: 'Rango' },
            ]}
          />
        </ScrollView>

        {filtroTiempo === 'personalizado' && (
          <View style={styles.rangoFechasContainer}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <DatePickerInput 
                label="Desde" 
                value={fechaInicioPersonalizada} 
                onChange={setFechaInicioPersonalizada} 
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <DatePickerInput 
                label="Hasta" 
                value={fechaFinPersonalizada} 
                onChange={setFechaFinPersonalizada} 
              />
            </View>
          </View>
        )}

        {vista === 'produccion' ? (
          <>
            {/* Gráfico de Mermas */}
            <CustomCard style={{ marginBottom: 16 }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
                <Text variant="titleMedium" style={globalStyles.sectionTitle}>
                  Resumen de Materia Prima
                </Text>
              </View>
              
              {metricasMermas.bruto === 0 ? (
                <Text style={{ textAlign: 'center', color: '#9ca3af', paddingVertical: 20 }}>
                  No hay consumo registrado en este período.
                </Text>
              ) : (
                <ViewShot ref={chartRef} options={{ format: 'png', quality: 0.9, result: 'base64' }}>
                  <View style={{ alignItems: 'center', backgroundColor: theme.colors.surface, paddingBottom: 16 }}>
                    <PieChart
                      data={pieData}
                      donut
                      showText
                      textColor="white"
                      radius={120}
                      innerRadius={60}
                      textSize={14}
                      centerLabelComponent={() => (
                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 22, fontWeight: 'bold' }}>
                            {((metricasMermas.util / (metricasMermas.util + metricasMermas.desperdicio)) * 100).toFixed(0)}%
                          </Text>
                          <Text style={{ fontSize: 14 }}>Útil</Text>
                        </View>
                      )}
                    />
                  </View>
                </ViewShot>
              )}
              
                <View style={{ marginTop: 24, gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                    <Text variant="bodyMedium" style={{ flex: 1 }}>Papel Útil Procesado</Text>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{metricasMermas.util.toFixed(2)} kg</Text>
                  </View>
                  <Divider />
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
                    <Text variant="bodyMedium" style={{ flex: 1 }}>Desperdicio (Mermas + Core)</Text>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{metricasMermas.desperdicio.toFixed(2)} kg</Text>
                  </View>
                </View>
            </CustomCard>

            {/* Rendimiento por Proveedor */}
            <CustomCard style={{ marginBottom: 16 }}>
              <View style={{ padding: 16 }}>
                <Text variant="titleMedium" style={globalStyles.sectionTitle}>
                  Rendimiento por Proveedor
                </Text>
                {rendimientoProveedores.length > 0 ? (
                  rendimientoProveedores.map((rp, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: idx < rendimientoProveedores.length - 1 ? 1 : 0, borderBottomColor: theme.colors.surfaceVariant }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{rp.proveedor}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Materia Prima: {rp.bruto.toFixed(0)} kg
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text variant="titleMedium" style={{ color: rp.eficiencia >= 95 ? '#16a34a' : rp.eficiencia >= 90 ? '#f59e0b' : '#dc2626', fontWeight: 'bold' }}>
                          {rp.eficiencia.toFixed(1)}%
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Eficiencia</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', padding: 16 }}>
                    No hay datos de proveedores en este período
                  </Text>
                )}
              </View>
            </CustomCard>

            {/* Gráfico Rollos */}
            <CustomCard style={{ marginBottom: 16 }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
                <Text variant="titleMedium" style={globalStyles.sectionTitle}>
                  Tendencia de Producción (Rollos)
                </Text>
              </View>
              <ViewShot ref={chartRefRollos} options={{ format: 'png', quality: 0.9, result: 'base64' }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', backgroundColor: theme.colors.surface }}>
                  {dataSetRollos[0]?.data.every((d: any) => d.value === 0) ? (
                    <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 40 }}>
                      Sin producción en este período.
                    </Text>
                  ) : (
                    <LineChart
                      maxValue={maxRollos}
                      areaChart
                      curved
                      dataSet={dataSetRollos}
                      height={200}
                      width={Dimensions.get('window').width - 120}
                      color={theme.colors.primary}
                      spacing={dataSetRollos[0]?.data?.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (dataSetRollos[0].data.length - 1) : 45}
                      initialSpacing={15}
                      endSpacing={15}
                      pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        pointerColor: 'lightgray',
                        radius: 6,
                        pointerLabelWidth: 140,
                        pointerLabelHeight: 90,
                        activatePointersOnLongPress: false,
                        autoAdjustPointerLabelPosition: true,
                        pointerLabelComponent: (items: any) => (
                          <View style={{ padding: 8, backgroundColor: '#1f2937', borderRadius: 8, alignItems: 'flex-start' }}>
                            <Text style={{ color: '#d1d5db', fontSize: 12, marginBottom: 4 }}>{items[0]?.dataLabel || ''}</Text>
                            {items.map((item: any, i: number) => (
                              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], marginRight: 6 }} />
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{item?.value ?? 0} rollos</Text>
                              </View>
                            ))}
                          </View>
                        ),
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
                  )}
                </View>
                {/* Leyenda multi-línea */}
                <View style={styles.chartLegendContainer}>
                  {legendsRollos.length > 0 ? legendsRollos.map((leg: any, idx: number) => (
                    <View key={idx} style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: leg.color }]} />
                      <Text variant="bodyMedium">{leg.name}</Text>
                    </View>
                  )) : (
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: theme.colors.primary }]} />
                      <Text variant="bodyMedium">Rollos producidos</Text>
                    </View>
                  )}
                </View>
              </ViewShot>
            </CustomCard>

            {/* Gráfico Kg */}
            <CustomCard style={{ marginBottom: 16 }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
                <Text variant="titleMedium" style={globalStyles.sectionTitle}>
                  Tendencia de Producción (Kg)
                </Text>
              </View>
              <ViewShot ref={chartRefKg} options={{ format: 'png', quality: 0.9, result: 'base64' }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', backgroundColor: theme.colors.surface }}>
                  {dataSetKg[0]?.data.every((d: any) => d.value === 0) ? (
                    <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 40 }}>
                      Sin consumo en este período.
                    </Text>
                  ) : (
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
                        pointerLabelWidth: 140,
                        pointerLabelHeight: 90,
                        activatePointersOnLongPress: false,
                        autoAdjustPointerLabelPosition: true,
                        pointerLabelComponent: (items: any) => (
                          <View style={{ padding: 8, backgroundColor: '#1f2937', borderRadius: 8, alignItems: 'flex-start' }}>
                            <Text style={{ color: '#d1d5db', fontSize: 12, marginBottom: 4 }}>{items[0]?.dataLabel || ''}</Text>
                            {items.map((item: any, i: number) => (
                              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], marginRight: 6 }} />
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{(item?.value ?? 0).toFixed(1)} kg</Text>
                              </View>
                            ))}
                          </View>
                        ),
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
                  )}
                </View>
                {/* Leyenda multi-línea */}
                <View style={styles.chartLegendContainer}>
                  {legendsKg.length > 0 ? legendsKg.map((leg: any, idx: number) => (
                    <View key={idx} style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: leg.color }]} />
                      <Text variant="bodyMedium">{leg.name}</Text>
                    </View>
                  )) : (
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: '#f59e0b' }]} />
                      <Text variant="bodyMedium">Kg consumidos</Text>
                    </View>
                  )}
                </View>
              </ViewShot>
            </CustomCard>
          </>
        ) : vista === 'finanzas' ? (
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>Flujo de Caja (USD)</Text>
              
              {metricasFinanzas.ventas > 0 || metricasFinanzas.cobranzas > 0 ? (
                <ViewShot ref={chartRef} options={{ format: 'jpg', quality: 0.9, result: 'base64' }} style={styles.chartContainer}>
                  <BarChart
                    data={[
                      { value: metricasFinanzas.ventas, label: 'Ventas', frontColor: theme.colors.primary },
                      { value: metricasFinanzas.cobranzas, label: 'Cobros', frontColor: '#16a34a' },
                      { value: Math.max(0, metricasFinanzas.cuentasPorCobrar), label: 'CxC', frontColor: theme.colors.error },
                    ]}
                    barWidth={40}
                    spacing={30}
                    hideRules
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor="#d1d5db"
                    noOfSections={4}
                  />
                  
                  <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: theme.colors.primary }]} />
                      <Text variant="bodyMedium">Ventas Totales: ${metricasFinanzas.ventas.toFixed(2)}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: '#16a34a' }]} />
                      <Text variant="bodyMedium">Cobranzas Recibidas: ${metricasFinanzas.cobranzas.toFixed(2)}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: theme.colors.error }]} />
                      <Text variant="bodyMedium">Cuentas x Cobrar: ${Math.max(0, metricasFinanzas.cuentasPorCobrar).toFixed(2)}</Text>
                    </View>
                  </View>
                </ViewShot>
              ) : (
                <View style={styles.emptyState}>
                  <Text variant="bodyMedium" style={{ color: '#9ca3af' }}>No hay registros financieros en este período.</Text>
                </View>
              )}
            </View>
          </CustomCard>
        ) : (
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>Desglose de Gastos de Viaje</Text>
              
              {metricasLogistica.totalGastos > 0 ? (
                <ViewShot ref={chartRef} options={{ format: 'jpg', quality: 0.9, result: 'base64' }} style={styles.chartContainer}>
                  <PieChart
                    donut
                    data={Object.entries(metricasLogistica.desglose)
                      .filter(([_, value]) => value > 0)
                      .map(([key, value]) => ({
                        value,
                        color: CATEGORY_COLORS[key] || CATEGORY_COLORS['otros'],
                        text: key
                      }))}
                    radius={100}
                    innerRadius={60}
                    centerLabelComponent={() => (
                      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>${metricasLogistica.totalGastos.toFixed(0)}</Text>
                        <Text style={{ fontSize: 12 }}>Total</Text>
                      </View>
                    )}
                  />
                  
                  <View style={styles.legendContainer}>
                    {Object.entries(metricasLogistica.desglose).filter(([_, value]) => value > 0).map(([key, value]) => (
                      <View style={styles.legendItem} key={key}>
                        <View style={[styles.legendColor, { backgroundColor: CATEGORY_COLORS[key] || CATEGORY_COLORS['otros'] }]} />
                        <Text variant="bodyMedium" style={{ textTransform: 'capitalize' }}>
                          {key}: ${value.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ViewShot>
              ) : (
                <View style={styles.emptyState}>
                  <Text variant="bodyMedium" style={{ color: '#9ca3af' }}>No hay gastos de logística en este período.</Text>
                </View>
              )}
            </View>
          </CustomCard>
        )}

        <Button 
          mode="contained" 
          icon="file-download" 
          onPress={handleExportPDF}
          style={{ marginTop: 24 }}
          buttonColor={theme.colors.error}
          loading={isGenerating}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generando PDF...' : 'Descargar Reporte'}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 16,
  },
  rangoFechasContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 8,
  },
  legendContainer: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  // Leyendas multi-línea (estilo lista vertical)
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
});

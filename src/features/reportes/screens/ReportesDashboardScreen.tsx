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

const CATEGORY_COLORS: Record<string, string> = {
  gasolina: '#dc2626',
  peaje: '#1e3a8a',
  viaticos: '#f59e0b',
  mantenimiento: '#8b5cf6',
  operativos: '#14b8a6',
  otros: '#9ca3af'
};

export function ReportesDashboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  
  // Vista Activa
  const [vista, setVista] = useState('produccion');
  
  // Filtro de Tiempo
  const [filtroTiempo, setFiltroTiempo] = useState('trimestral');
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
      SELECT id, peso_inicial_kg, peso_actual_kg, peso_muerto_kg, merma_core_kg, fecha_llegada, fecha_gasto
      FROM bobinas_grandes
      WHERE fecha_llegada >= ?
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
    let queryStr = `SELECT categoria, monto, moneda, tasa_cambio, fecha, descripcion FROM movimientos WHERE id_viaje IS NOT NULL AND fecha >= ?`;
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
        COALESCE(SUM(cb.kg_consumidos), 0) as total_kg
      FROM produccion_diaria pd
      LEFT JOIN consumo_bobinas cb ON cb.id_produccion = pd.id
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
    queryStr += ` GROUP BY pd.fecha, pp.nombre, cb.id_bobina ORDER BY pd.fecha ASC`;
    
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const { data: pedidosFin = [] } = useQuery(queryDataPedidos.queryStr, queryDataPedidos.params);
  const { data: abonosFin = [] } = useQuery(queryDataAbonos.queryStr, queryDataAbonos.params);
  const { data: gastosViaje = [] } = useQuery(queryDataLogistica.queryStr, queryDataLogistica.params);
  const { data: produccionRaw = [] } = useQuery(queryDataProduccion.queryStr, queryDataProduccion.params);

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

  // Cálculos Producción (Líneas)
  const { lineDataRollos, lineDataKg } = useMemo(() => {
    const dataRollosMap: Record<string, number> = {};
    const dataKgMap: Record<string, number> = {};
    const labelsEnOrden: string[] = [];
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (filtroTiempo === 'personalizado' && fechaInicioPersonalizada && fechaFinPersonalizada) {
      // Diferencia en días para rango personalizado
      const inicio = new Date(fechaInicioPersonalizada);
      const fin = new Date(fechaFinPersonalizada);
      fin.setHours(23, 59, 59, 999);
      const diffDays = Math.floor((fin.getTime() - inicio.getTime()) / 86400000);
      
      if (diffDays <= 31) {
        // Agrupar por días
        for (let i = diffDays; i >= 0; i--) {
          const d = new Date(fin.getTime() - i * 86400000);
          const key = d.toISOString().split('T')[0];
          labelsEnOrden.push(key);
          dataRollosMap[key] = 0;
          dataKgMap[key] = 0;
        }
      } else {
        // Agrupar por semanas si es mayor a un mes
        const diffWeeks = Math.floor(diffDays / 7);
        for (let i = diffWeeks; i >= 0; i--) {
          const start = new Date(fin.getTime() - (i * 7 + 6) * 86400000);
          const startStr = start.toISOString().split('T')[0].slice(5);
          const key = `Sem (${startStr})`;
          labelsEnOrden.push(key);
          dataRollosMap[key] = 0;
          dataKgMap[key] = 0;
        }
      }
    } else if (filtroTiempo === 'mensual') {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(hoy.getTime() - (i * 7 + 6) * 86400000);
        const startStr = start.toISOString().split('T')[0].slice(5);
        const key = `Sem ${4 - i} (${startStr})`;
        labelsEnOrden.push(key);
        dataRollosMap[key] = 0;
        dataKgMap[key] = 0;
      }
    } else if (filtroTiempo === 'trimestral') {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = d.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
        labelsEnOrden.push(key);
        dataRollosMap[key] = 0;
        dataKgMap[key] = 0;
      }
    } else if (filtroTiempo === 'semestral') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = d.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
        labelsEnOrden.push(key);
        dataRollosMap[key] = 0;
        dataKgMap[key] = 0;
      }
    } else if (filtroTiempo === 'anual') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = d.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
        labelsEnOrden.push(key);
        dataRollosMap[key] = 0;
        dataKgMap[key] = 0;
      }
    }

    for (const row of produccionRaw as any[]) {
      const f = row.fecha?.split('T')[0] ?? row.fecha;
      if (!f) continue;
      const d = new Date(f);
      const rollos = row.total_rollos ?? 0;
      const kg = row.total_kg ?? 0;

      if (filtroTiempo === 'personalizado') {
        const inicio = new Date(fechaInicioPersonalizada);
        const fin = new Date(fechaFinPersonalizada);
        fin.setHours(23, 59, 59, 999);
        const diffDays = Math.floor((fin.getTime() - inicio.getTime()) / 86400000);
        if (diffDays <= 31) {
          if (dataRollosMap[f] !== undefined) {
            dataRollosMap[f] += rollos;
            dataKgMap[f] += kg;
          }
        } else {
          const pastDays = Math.floor((fin.getTime() - d.getTime()) / 86400000);
          const semIndex = Math.floor(pastDays / 7);
          const keyIndex = labelsEnOrden.length - 1 - semIndex;
          if (keyIndex >= 0 && keyIndex < labelsEnOrden.length) {
            const key = labelsEnOrden[keyIndex];
            dataRollosMap[key] += rollos;
            dataKgMap[key] += kg;
          }
        }
      } else if (filtroTiempo === 'mensual') {
        const diffDays = Math.floor((hoy.getTime() - d.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 28) {
          const semIndex = 3 - Math.floor(diffDays / 7);
          const key = labelsEnOrden[semIndex];
          dataRollosMap[key] += rollos;
          dataKgMap[key] += kg;
        }
      } else {
        const key = f.slice(0, 7); // YYYY-MM
        if (dataRollosMap[key] !== undefined) {
          dataRollosMap[key] += rollos;
          dataKgMap[key] += kg;
        }
      }
    }

    const formatLabel = (lbl: string) => {
      if (lbl.startsWith('Sem')) return lbl.split(' ')[0]; // Sem X
      if (lbl.length === 7) { // YYYY-MM
        const parts = lbl.split('-');
        return `${parts[1]}/${parts[0].slice(2)}`; // MM/YY
      }
      if (lbl.length === 10) { // YYYY-MM-DD
        const parts = lbl.split('-');
        return `${parts[2]}/${parts[1]}`; // DD/MM
      }
      return lbl;
    };

    const outRollos = labelsEnOrden.map(lbl => ({ value: dataRollosMap[lbl], label: formatLabel(lbl), dataLabel: formatLabel(lbl) }));
    const outKg = labelsEnOrden.map(lbl => ({ value: dataKgMap[lbl], label: formatLabel(lbl), dataLabel: formatLabel(lbl) }));
    
    return { lineDataRollos: outRollos, lineDataKg: outKg };
  }, [produccionRaw, filtroTiempo, fechaInicioPersonalizada, fechaFinPersonalizada]);

  // Cálculos Finanzas
  const metricasFinanzas = useMemo(() => {
    let ventas = 0;
    let cobranzas = 0;
    pedidosFin.forEach((p: any) => ventas += (p.monto_total || 0));
    abonosFin.forEach((a: any) => cobranzas += (a.monto_equivalente_usd || 0));
    return { ventas, cobranzas, cuentasPorCobrar: ventas - cobranzas };
  }, [pedidosFin, abonosFin]);

  // Cálculos Logística
  const metricasLogistica = useMemo(() => {
    const desglose: Record<string, number> = { gasolina: 0, peaje: 0, viaticos: 0, mantenimiento: 0, operativos: 0, otros: 0 };
    let totalGastos = 0;
    
    gastosViaje.forEach((g: any) => {
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
        await generateProductionPDF(label, metricasMermas, chartBase64, chartBase64Rollos, chartBase64Kg, tipoReporte === 'detallado', bobinas, produccionRaw);
      } else if (vista === 'finanzas') {
        await generateFinancePDF(label, metricasFinanzas, chartBase64, tipoReporte === 'detallado', pedidosFin, abonosFin);
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

            {/* Gráfico Rollos */}
            <CustomCard style={{ marginBottom: 16 }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
                <Text variant="titleMedium" style={globalStyles.sectionTitle}>
                  Tendencia de Producción (Rollos)
                </Text>
              </View>
              <ViewShot ref={chartRefRollos} options={{ format: 'png', quality: 0.9, result: 'base64' }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', backgroundColor: theme.colors.surface }}>
                  {lineDataRollos.every(d => d.value === 0) ? (
                    <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 40 }}>
                      Sin producción en este período.
                    </Text>
                  ) : (
                    <LineChart
                      areaChart
                      curved
                      data={lineDataRollos}
                      height={200}
                      width={Dimensions.get('window').width - 120}
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
                      spacing={lineDataRollos.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (lineDataRollos.length - 1) : 45}
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
                                  {item?.value ?? 0} rollos
                                </Text>
                              </View>
                            </View>
                          );
                        },
                      }}
                    />
                  )}
                </View>
              </ViewShot>
              <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} />
                  <Text variant="bodySmall">Rollos producidos</Text>
                </View>
              </View>
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
                  {lineDataKg.every(d => d.value === 0) ? (
                    <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 40 }}>
                      Sin consumo en este período.
                    </Text>
                  ) : (
                    <LineChart
                      areaChart
                      curved
                      data={lineDataKg}
                      height={200}
                      width={Dimensions.get('window').width - 120}
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
                      spacing={lineDataKg.length > 1 ? (Dimensions.get('window').width - 120 - 30) / (lineDataKg.length - 1) : 45}
                      initialSpacing={15}
                      endSpacing={15}
                      yAxisLabelSuffix=" kg"
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
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b', marginRight: 6 }} />
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                                  {(item?.value ?? 0).toFixed(1)} kg
                                </Text>
                              </View>
                            </View>
                          );
                        },
                      }}
                    />
                  )}
                </View>
              </ViewShot>
              <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b' }} />
                  <Text variant="bodySmall">Kg consumidos</Text>
                </View>
              </View>
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
  }
});

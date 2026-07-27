import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Appbar, useTheme, SegmentedButtons, Button, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { globalStyles } from '@core/theme/globalStyles';
import { CustomCard } from '@components/ui/CustomCard';
import { DatePickerInput } from '@components/ui/DatePickerInput';
import { useQuery } from '@powersync/react';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import Toast from 'react-native-toast-message';
import ViewShot from 'react-native-view-shot';
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
      SELECT peso_inicial_kg, peso_actual_kg, peso_muerto_kg, merma_core_kg
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

  const { data: pedidosFin = [] } = useQuery(queryDataPedidos.queryStr, queryDataPedidos.params);
  const { data: abonosFin = [] } = useQuery(queryDataAbonos.queryStr, queryDataAbonos.params);
  const { data: gastosViaje = [] } = useQuery(queryDataLogistica.queryStr, queryDataLogistica.params);

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

  // Datos para el gráfico de torta (Donut)
  const pieData = [
    { value: metricasMermas.util, color: theme.colors.primary, text: 'Útil' },
    { value: metricasMermas.desperdicio, color: theme.colors.error, text: 'Mermas' },
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
      try {
        if (chartRef.current?.capture) {
          // Obtenemos la captura del gráfico directamente en Base64
          chartBase64 = await chartRef.current.capture();
        }
      } catch (e) {
        console.warn('No se pudo capturar el gráfico, el PDF se generará sin él', e);
      }
      
      if (vista === 'produccion') {
        await generateProductionPDF(label, metricasMermas, chartBase64, tipoReporte === 'detallado', bobinas);
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
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>Eficiencia de Materia Prima</Text>
              
              {metricasMermas.bruto > 0 ? (
                <ViewShot ref={chartRef} options={{ format: 'jpg', quality: 0.9, result: 'base64' }} style={styles.chartContainer}>
                  <PieChart
                    donut
                    data={pieData}
                    radius={100}
                    innerRadius={60}
                    centerLabelComponent={() => {
                      const porcentajeUtil = ((metricasMermas.util / (metricasMermas.util + metricasMermas.desperdicio)) * 100).toFixed(1);
                      return (
                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{porcentajeUtil}%</Text>
                          <Text style={{ fontSize: 12 }}>Eficiencia</Text>
                        </View>
                      );
                    }}
                  />
                  
                  <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: theme.colors.primary }]} />
                      <Text variant="bodyMedium">Papel Útil: {metricasMermas.util.toFixed(2)} kg</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: theme.colors.error }]} />
                      <Text variant="bodyMedium">Mermas (Core + Muerto): {metricasMermas.desperdicio.toFixed(2)} kg</Text>
                    </View>
                    <Divider style={{ marginVertical: 8 }} />
                    <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                      Total Bruto Comprado: {metricasMermas.bruto.toFixed(2)} kg
                    </Text>
                  </View>
                </ViewShot>
              ) : (
                <View style={styles.emptyState}>
                  <Text variant="bodyMedium" style={{ color: '#9ca3af' }}>No hay registros de bobinas en este período.</Text>
                </View>
              )}
            </View>
          </CustomCard>
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
  }
});

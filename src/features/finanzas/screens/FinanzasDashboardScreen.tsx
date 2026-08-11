import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo, useState, useEffect } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface, FAB, ActivityIndicator, Menu, Portal, Modal, Divider } from 'react-native-paper';
import { CustomCard } from '@components/ui/CustomCard';
import { CalendarCustom } from '@components/ui/CalendarCustom';
import { useQuery } from '@powersync/react';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getTasaDolarBCV } from '@core/api/dolar';
import { generateFinanzasPdf } from '../utils/generateFinanzasPdf';

const { width } = Dimensions.get('window');

export function FinanzasDashboardScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();

  const [tasaBCV, setTasaBCV] = useState<number>(0);

  // Estados para orden y filtro
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguos' | 'monto'>('recientes');
  const [filterType, setFilterType] = useState<'todos' | 'ingresos' | 'gastos'>('todos');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    getTasaDolarBCV().then(tasa => {
      if (tasa) setTasaBCV(tasa);
    }).catch(console.error);
  }, []);

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
      ap.monto as monto, 
      ap.moneda as moneda, 
      ap.tasa_cambio as tasa_cambio, 
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
          deudaAlDia += saldo;
        }
      }
    }

    let ingresosMes = 0;
    let egresosMes = 0;
    
    let liquidezVES = 0;
    let liquidezUSD = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    for (const f of flujoCaja as any[]) {
      const fd = new Date(f.fecha);
      
      // Cálculo mensual
      if (fd.getMonth() === currentMonth && fd.getFullYear() === currentYear) {
        const montoUsd = f.moneda === 'USD' ? f.monto : (f.monto / (f.tasa_cambio || 1));
        if (f.tipo === 'ingreso') ingresosMes += montoUsd;
        else egresosMes += montoUsd;
      }
      
      // Cálculo histórico (Liquidez total y ROI)
      if (f.moneda === 'VES') {
        if (f.tipo === 'ingreso') liquidezVES += f.monto;
        else liquidezVES -= f.monto;
      } else {
        if (f.tipo === 'ingreso') liquidezUSD += f.monto;
        else liquidezUSD -= f.monto;
      }

      // Sumar para ROI Global (usando USD o convirtiendo VES a USD de la fecha)
      const montoUsd = f.moneda === 'USD' ? f.monto : (f.monto / (f.tasa_cambio || 1));
      if (f.tipo === 'ingreso') ingresosMes += montoUsd; // Usamos ingresosMes y egresosMes como globales para el cálculo rápido
      else egresosMes += montoUsd;
    }
    
    const estimadaUSD = liquidezUSD + (tasaBCV > 0 ? (liquidezVES / tasaBCV) : 0);
    const roiGlobal = egresosMes > 0 ? ((ingresosMes - egresosMes) / egresosMes) * 100 : 0;

    return { 
      deudaTotal, deudaAlDia, deudaPorVencer, deudaAtrasada, 
      ingresosMes, egresosMes, liquidezVES, liquidezUSD, estimadaUSD, roiGlobal
    };
  }, [deudas, flujoCaja, tasaBCV]);

  const formatUsd = (val: number) => `$${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`;
  const formatNumber = (val: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  // Procesar flujo de caja con filtros y ordenamiento
  const processedFlujo = useMemo(() => {
    let result = [...flujoCaja];

    // Filtrar por tipo
    if (filterType === 'ingresos') {
      result = result.filter((mov: any) => mov.tipo === 'ingreso');
    } else if (filterType === 'gastos') {
      result = result.filter((mov: any) => mov.tipo !== 'ingreso');
    }

    // Filtrar por fecha
    if (dateFilter) {
      result = result.filter((mov: any) => {
        if (!mov.fecha) return false;
        // La fecha de DB suele ser 'YYYY-MM-DD HH:MM:SS' o ISO. Tomamos los primeros 10 caracteres.
        const movDateStr = mov.fecha.substring(0, 10);
        return movDateStr === dateFilter;
      });
    }

    // Ordenar
    result.sort((a: any, b: any) => {
      if (sortBy === 'monto') {
        const montoA = a.moneda === 'USD' ? a.monto : (a.monto / (a.tasa_cambio || 1));
        const montoB = b.moneda === 'USD' ? b.monto : (b.monto / (b.tasa_cambio || 1));
        return montoB - montoA; // Mayor a menor
      }
      
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      return sortBy === 'recientes' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [flujoCaja, filterType, sortBy, dateFilter]);

  // Agrupar flujo de caja por fecha
  const groupedFlujo = useMemo(() => {
    const groups: { dateLabel: string; items: any[] }[] = [];
    
    // Si ordenamos por monto, no agrupamos por fecha visualmente para no romper la lista
    if (sortBy === 'monto') {
      if (processedFlujo.length > 0) {
        groups.push({ 
          dateLabel: 'Ordenado por Mayor Monto', 
          items: processedFlujo.slice(0, 50) 
        });
      }
      return groups;
    }

    let currentLabel = '';
    let currentGroup: any[] = [];

    processedFlujo.slice(0, 50).forEach((mov: any) => {
      // Intentar formatear la fecha correctamente
      let dateLabel = 'Fecha desconocida';
      if (mov.fecha) {
        // Para evitar problemas de zona horaria con strings YYYY-MM-DD, parseamos manualmente o usamos UTC
        const parts = mov.fecha.substring(0, 10).split('-');
        if (parts.length === 3) {
          dateLabel = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      
      if (dateLabel !== currentLabel) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentLabel, items: currentGroup });
        }
        currentLabel = dateLabel;
        currentGroup = [mov];
      } else {
        currentGroup.push(mov);
      }
    });
    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentLabel, items: currentGroup });
    }
    return groups;
  }, [processedFlujo, sortBy]);

  const handlePrintPDF = async () => {
    setIsGeneratingPdf(true);
    await generateFinanzasPdf(processedFlujo, dateFilter, filterType);
    setIsGeneratingPdf(false);
  };

  return (
    <View style={globalStyles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
        contentContainerStyle={[globalStyles.scrollContent, { paddingBottom: Math.max(insets.bottom + 80, 100) }]}
      >
        {/* TARJETA DE LIQUIDEZ */}
        <CustomCard style={{ marginBottom: 16, backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderWidth: 1 }}>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <MaterialCommunityIcons name="eye" size={16} color="#6b7280" />
              <Text variant="labelMedium" style={{ color: '#6b7280', fontWeight: 'bold' }}>
                Tu Liquidez Estimada
              </Text>
              <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                <Text variant="labelSmall" style={{ color: '#4b5563', fontSize: 10, fontWeight: 'bold' }}>
                  Tasa BCV {tasaBCV > 0 ? `(Bs. ${formatNumber(tasaBCV)})` : ''}
                </Text>
              </View>
            </View>
            
            {tasaBCV === 0 ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <Text variant="displaySmall" style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: 24 }}>
                $ {formatNumber(kpis.estimadaUSD)}
              </Text>
            )}

            <View style={{ width: '100%', height: 1, backgroundColor: '#e5e7eb', marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', gap: 16 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="labelMedium" style={{ color: '#6b7280', marginBottom: 4 }}>
                  Bolívares
                </Text>
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={1}>
                  Bs. {formatNumber(kpis.liquidezVES)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="labelMedium" style={{ color: '#6b7280', marginBottom: 4 }}>
                  Dólares
                </Text>
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={1}>
                  $ {formatNumber(kpis.liquidezUSD)}
                </Text>
              </View>
            </View>

            <View style={{ width: '100%', height: 1, backgroundColor: '#e5e7eb', marginVertical: 20 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="labelMedium" style={{ color: '#6b7280', marginRight: 8 }}>
                Rentabilidad Histórica (ROI):
              </Text>
              <View style={{ backgroundColor: kpis.roiGlobal >= 0 ? '#dcfce7' : '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: kpis.roiGlobal >= 0 ? '#16a34a' : '#dc2626' }}>
                  {kpis.roiGlobal > 0 ? '+' : ''}{kpis.roiGlobal.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        </CustomCard>

        {/* CUENTAS POR COBRAR COMPACTO */}
        <Surface style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 16, borderRadius: 16, marginBottom: 20 }} elevation={0}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color="#1d4ed8" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="labelMedium" style={{ color: '#1e3a8a', fontWeight: 'bold' }}>CUENTAS X COBRAR</Text>
            <Text variant="bodySmall" style={{ color: '#3b82f6' }}>Capital invertido en la calle</Text>
          </View>
          <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#1d4ed8' }}>
            {formatUsd(kpis.deudaTotal)}
          </Text>
        </Surface>

        {/* ESTADO DE LA DEUDA */}
        <CustomCard style={{ marginTop: 8 }}>
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

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                <Text variant="bodySmall">Al Día: {formatUsd(kpis.deudaAlDia)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text variant="bodySmall">Por Vencer: {formatUsd(kpis.deudaPorVencer)}</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text variant="bodySmall">Atrasada: {formatUsd(kpis.deudaAtrasada)}</Text>
              </View>
            </View>
          </View>
        </CustomCard>

        {/* HISTORIAL FLUJO DE CAJA */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#4b5563', fontSize: 13, letterSpacing: 1 }}>
            ORDEN Y FILTRO
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            
            {/* Filtro de Fecha Activo */}
            {dateFilter && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5e7eb', borderRadius: 16, paddingLeft: 8, paddingRight: 4, paddingVertical: 4, marginRight: 4 }}>
                <Text variant="labelSmall" style={{ color: '#4b5563', fontWeight: 'bold', marginRight: 4 }}>
                  {dateFilter.split('-').reverse().join('/')}
                </Text>
                <TouchableOpacity onPress={() => setDateFilter(null)}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}

            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                  <MaterialCommunityIcons name="swap-vertical" size={20} color={sortBy !== 'recientes' || filterType !== 'todos' ? theme.colors.primary : '#9ca3af'} />
                </TouchableOpacity>
              }
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: 12, elevation: 4 }}
            >
              <Text variant="labelSmall" style={{ color: '#6b7280', marginLeft: 16, marginTop: 8, marginBottom: 4 }}>ORDENAR POR</Text>
              <Menu.Item 
                onPress={() => { setSortBy('recientes'); setMenuVisible(false); }} 
                title="Más recientes" 
                titleStyle={{ color: '#1f2937' }}
                trailingIcon={sortBy === 'recientes' ? () => <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} /> : undefined}
              />
              <Menu.Item 
                onPress={() => { setSortBy('antiguos'); setMenuVisible(false); }} 
                title="Más antiguos" 
                titleStyle={{ color: '#1f2937' }}
                trailingIcon={sortBy === 'antiguos' ? () => <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} /> : undefined}
              />
              <Menu.Item 
                onPress={() => { setSortBy('monto'); setMenuVisible(false); }} 
                title="Monto mayor" 
                titleStyle={{ color: '#1f2937' }}
                trailingIcon={sortBy === 'monto' ? () => <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} /> : undefined}
              />
              
              <Divider style={{ backgroundColor: '#e5e7eb', marginVertical: 8 }} />
              
              <Text variant="labelSmall" style={{ color: '#6b7280', marginLeft: 16, marginBottom: 4 }}>FILTRAR POR</Text>
              <Menu.Item 
                onPress={() => { setFilterType('todos'); setMenuVisible(false); }} 
                title="Todos" 
                titleStyle={{ color: '#1f2937' }}
                trailingIcon={filterType === 'todos' ? () => <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} /> : undefined}
              />
              <Menu.Item 
                onPress={() => { setFilterType('ingresos'); setMenuVisible(false); }} 
                title="Ingresos" 
                titleStyle={{ color: '#1f2937' }}
                trailingIcon={filterType === 'ingresos' ? () => <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} /> : undefined}
              />
              <Menu.Item 
                onPress={() => { setFilterType('gastos'); setMenuVisible(false); }} 
                title="Gastos" 
                titleStyle={{ color: '#1f2937' }}
                trailingIcon={filterType === 'gastos' ? () => <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} /> : undefined}
              />
            </Menu>

            <TouchableOpacity onPress={() => setCalendarVisible(true)}>
              <MaterialCommunityIcons name="calendar-blank" size={20} color={dateFilter ? theme.colors.primary : '#9ca3af'} />
            </TouchableOpacity>

            {isGeneratingPdf ? (
              <ActivityIndicator size={20} color={theme.colors.primary} style={{ marginLeft: 8 }} />
            ) : (
              <TouchableOpacity onPress={handlePrintPDF} style={{ marginLeft: 8 }}>
                <MaterialCommunityIcons name="printer" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {groupedFlujo.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' }}>
            <MaterialCommunityIcons name="text-box-search-outline" size={48} color="#d1d5db" />
            <Text variant="titleMedium" style={{ color: '#6b7280', marginTop: 16, textAlign: 'center', fontWeight: 'bold' }}>
              No hay movimientos
            </Text>
            <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
              Intenta cambiar los filtros o la fecha seleccionada.
            </Text>
          </View>
        ) : (
          groupedFlujo.map((group, groupIdx) => (
            <View key={groupIdx} style={{ marginBottom: 16 }}>
              <Text variant="labelMedium" style={{ color: '#6b7280', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>
                {group.dateLabel}
              </Text>
            
            {group.items.map((mov: any, index: number) => {
              const isIngreso = mov.tipo === 'ingreso';
              const isUSD = mov.moneda === 'USD';
              const colorBase = isIngreso ? '#10b981' : '#ef4444'; // Verde/Rojo vibrante
              const bgLigero = isIngreso ? '#ecfdf5' : '#fef2f2';
              
              let eqString = '';
              if (mov.moneda === 'VES' && mov.tasa_cambio) {
                const usdVal = mov.monto / mov.tasa_cambio;
                eqString = `≈ $${formatNumber(usdVal)}`;
              } else if (mov.moneda === 'USD' && mov.tasa_cambio && mov.tasa_cambio > 1) {
                const vesVal = mov.monto * mov.tasa_cambio;
                eqString = `≈ Bs. ${formatNumber(vesVal)}`;
              } else if (mov.moneda === 'USD') {
                eqString = 'Pago en divisas';
              }

              return (
                <Surface key={index} style={[styles.movCard, { borderColor: colorBase, borderWidth: 1, backgroundColor: '#ffffff' }]} elevation={0}>
                  <View style={styles.movContent}>
                    {/* Icono Izquierdo */}
                    <View style={[styles.iconBox, { backgroundColor: colorBase }]}>
                      <MaterialCommunityIcons 
                        name={isIngreso ? 'arrow-up' : 'arrow-down'} 
                        size={20} 
                        color="#ffffff" 
                      />
                    </View>
                    
                    {/* Centro (Descripción y Equivalencia) */}
                    <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
                      <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: '#1f2937' }} numberOfLines={1}>
                        {mov.descripcion}
                      </Text>
                      <Text variant="bodySmall" style={{ color: '#d97706', fontWeight: 'bold', marginTop: 2 }}>
                        {eqString} {mov.tasa_cambio > 1 ? `(Tasa: ${formatNumber(mov.tasa_cambio)})` : ''}
                      </Text>
                    </View>
                    
                    {/* Derecha (Monto principal y Moneda) */}
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colorBase }}>
                        {isIngreso ? '+' : '-'} {formatNumber(mov.monto)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                        {mov.moneda}
                      </Text>
                    </View>
                  </View>
                </Surface>
              );
            })}
          </View>
          ))
        )}

        {flujoCaja.length === 0 && (
          <Text variant="bodyMedium" style={{ color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>
            Sin movimientos financieros registrados.
          </Text>
        )}

      </ScrollView>

      {/* FAB REGISTRAR GASTO */}
      <FAB
        icon="cash-plus"
        label="Registrar"
        style={[styles.fab, { bottom: Math.max(insets.bottom + 16, 24) }]}
        onPress={() => router.push('/(screens)/registrar-gasto')}
      />
      <Portal>
        <Modal 
          visible={calendarVisible} 
          onDismiss={() => setCalendarVisible(false)} 
          contentContainerStyle={{ backgroundColor: 'white', margin: 20, borderRadius: 16, padding: 16 }}
        >
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
            Filtrar por Fecha
          </Text>
          <CalendarCustom 
            current={dateFilter || undefined}
            onDayPress={(day: any) => {
              setDateFilter(day.dateString);
              setCalendarVisible(false);
            }}
            markedDates={dateFilter ? {
              [dateFilter]: { selected: true, selectedColor: theme.colors.primary }
            } : undefined}
          />
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiBox: { flex: 1, padding: 16, borderRadius: 16 },
  kpiBoxMini: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6' },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  
  deudaBarContainer: { height: 12, borderRadius: 6, backgroundColor: '#f3f4f6', flexDirection: 'row', overflow: 'hidden', marginBottom: 12 },
  deudaSegment: { height: '100%' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },

  movCard: { borderRadius: 16, marginBottom: 10 },
  movContent: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  
  fab: { position: 'absolute', right: 16 }
});

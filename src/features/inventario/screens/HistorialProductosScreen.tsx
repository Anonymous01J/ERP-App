import React, { useState, useMemo } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Appbar, useTheme, Divider, Chip, SegmentedButtons } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@powersync/react';
import { CustomCard } from '@components/ui/CustomCard';
import { DatePickerInput } from '@components/ui/DatePickerInput';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function HistorialProductosScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const router = useRouter();
  const theme = useTheme();
  const { id_producto } = useLocalSearchParams<{ id_producto?: string }>();

  // Filtros
  const [tipoMovimiento, setTipoMovimiento] = useState('todos'); // 'todos', 'entrada', 'salida'
  const [filtroTiempo, setFiltroTiempo] = useState('mensual');
  const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState('');
  const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState('');

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

  const queryData = useMemo(() => {
    let queryStr = `
      SELECT 
        hp.id,
        hp.fecha,
        hp.cantidad,
        hp.tipo,
        hp.origen,
        hp.entidad_relacionada,
        pr.nombre_producto
      FROM historial_productos hp
      JOIN productos_reventa pr ON pr.id = hp.id_producto
      WHERE hp.fecha >= ?
    `;
    let params: any[] = [fechaInicio];

    if (id_producto) {
      queryStr += ` AND hp.id_producto = ?`;
      params.push(id_producto);
    }

    if (tipoMovimiento !== 'todos') {
      queryStr += ` AND hp.tipo = ?`;
      params.push(tipoMovimiento);
    }

    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND hp.fecha <= ?`;
      const end = new Date(fechaFinPersonalizada);
      end.setHours(23, 59, 59, 999);
      params.push(end.toISOString());
    }
    
    queryStr += ` ORDER BY hp.fecha DESC`;
    
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada, id_producto, tipoMovimiento]);

  const { data: productosData = [] } = useQuery(queryData.queryStr, queryData.params);

  const formatFecha = (f: string) => {
    try {
      const d = new Date(f);
      return d.toLocaleDateString('es-VE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return f;
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Historial de Productos" subtitle="Entradas y Salidas" />
      </Appbar.Header>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>
        
        {/* Pestañas de Movimientos (Todos | Entradas | Salidas) */}
        <View style={{ marginBottom: 16 }}>
          <SegmentedButtons
            value={tipoMovimiento}
            onValueChange={setTipoMovimiento}
            buttons={[
              { value: 'todos', label: 'Todos' },
              { value: 'entrada', label: 'Entradas' },
              { value: 'salida', label: 'Salidas' },
            ]}
          />
        </View>

        {/* Pestañas de Tiempo */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <SegmentedButtons
            value={filtroTiempo}
            onValueChange={setFiltroTiempo}
            buttons={[
              { value: 'mensual', label: '1 Mes' },
              { value: 'trimestral', label: '3 Meses' },
              { value: 'semestral', label: '6 Meses' },
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

        {productosData.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={56} color="#d1d5db" />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No hay historial en este periodo.
            </Text>
          </View>
        ) : (
          productosData.map((mov: any, index: number) => {
            const isEntrada = mov.tipo === 'entrada';
            
            return (
              <CustomCard key={mov.id + index} style={styles.card}>
                <View style={styles.cardContent}>
                  
                  {/* Cabecera del movimiento */}
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 }}>
                      <MaterialCommunityIcons name="calendar-clock" size={18} color={theme.colors.primary} />
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#1f2937', flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
                        {formatFecha(mov.fecha)}
                      </Text>
                    </View>
                    <Chip 
                      mode="flat" 
                      textStyle={{ fontSize: 11, fontWeight: 'bold' }}
                      style={{ backgroundColor: isEntrada ? '#dcfce7' : '#fee2e2' }}
                    >
                      {mov.origen === 'viaje_compra' ? 'Viaje de Compra' : mov.origen === 'venta_pedido' ? 'Venta' : 'Ajuste Manual'}
                    </Chip>
                  </View>

                  <Divider style={{ marginVertical: 8 }} />

                  {/* Resultados */}
                  <View style={styles.prodRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: isEntrada ? '#16a34a' : theme.colors.error }}>
                        {isEntrada ? '+' : '-'}{mov.cantidad}
                      </Text>
                      <Text variant="bodyMedium" style={{ color: '#4b5563', flexShrink: 1 }} numberOfLines={2}>
                        {mov.nombre_producto}
                      </Text>
                    </View>
                    
                    {/* Entidad (Cliente o Proveedor) */}
                    {(mov.entidad_relacionada || mov.origen === 'ajuste_manual') && (
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text variant="bodySmall" style={{ color: '#6b7280', flexShrink: 1, textAlign: 'right' }}>
                          {isEntrada ? 'De: ' : 'Para: '}
                          <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>
                            {mov.entidad_relacionada || 'Manual'}
                          </Text>
                        </Text>
                      </View>
                    )}
                  </View>

                </View>
              </CustomCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 16 },
  cardContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  prodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  rangoFechasContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  emptyState: { alignItems: 'center', marginTop: 60, padding: 24 },
  emptyText: { color: '#9ca3af', marginTop: 16, textAlign: 'center' },
});

import React, { useState, useMemo } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Appbar, useTheme, Divider, Chip, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@powersync/react';
import { CustomCard } from '@components/ui/CustomCard';
import { DatePickerInput } from '@components/ui/DatePickerInput';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function HistorialPotesScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const router = useRouter();
  const theme = useTheme();

  // Filtro de Tiempo
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
        dp.id,
        p.fecha_creacion as fecha,
        dp.cantidad_solicitada,
        dp.cantidad_producida,
        ip.capacidad,
        c.razon_social as cliente,
        p.estado
      FROM detalles_pedido dp
      JOIN pedidos p ON p.id = dp.id_pedido
      JOIN inventario_potes ip ON ip.id = dp.id_pote
      LEFT JOIN clientes c ON c.id = p.id_cliente
      WHERE dp.id_pote IS NOT NULL AND p.fecha_creacion >= ?
    `;
    let params: any[] = [fechaInicio];

    if (filtroTiempo === 'personalizado' && fechaFinPersonalizada) {
      queryStr += ` AND p.fecha_creacion <= ?`;
      const end = new Date(fechaFinPersonalizada);
      end.setHours(23, 59, 59, 999);
      params.push(end.toISOString());
    }
    
    queryStr += ` ORDER BY p.fecha_creacion DESC`;
    
    return { queryStr, params };
  }, [fechaInicio, filtroTiempo, fechaFinPersonalizada]);

  const { data: potesData = [] } = useQuery(queryData.queryStr, queryData.params);

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
        <Appbar.Content title="Historial de Potes" subtitle="Salidas por pedidos" />
      </Appbar.Header>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>
        
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

        {potesData.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={56} color="#d1d5db" />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No hay historial de salidas de potes.
            </Text>
          </View>
        ) : (
          potesData.map((mov: any, index: number) => {
            const isCancelado = mov.estado === 'cancelado';
            
            return (
              <CustomCard key={mov.id + index} style={styles.card}>
                <View style={styles.cardContent}>
                  
                  {/* Cabecera del movimiento */}
                  <View style={styles.headerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="calendar-clock" size={18} color={theme.colors.primary} />
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#1f2937' }}>
                        {formatFecha(mov.fecha)}
                      </Text>
                    </View>
                    <Chip 
                      mode="flat" 
                      textStyle={{ fontSize: 11, fontWeight: 'bold' }}
                      style={{ backgroundColor: isCancelado ? '#fee2e2' : '#e0e7ff' }}
                    >
                      {isCancelado ? 'Cancelado' : 'Pedido'}
                    </Chip>
                  </View>

                  <Divider style={{ marginVertical: 8 }} />

                  {/* Resultados */}
                  <View style={styles.prodRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: isCancelado ? '#9ca3af' : theme.colors.error }}>
                        -{mov.cantidad_solicitada}
                      </Text>
                      <Text variant="bodyMedium" style={{ color: '#4b5563' }}>
                        Potes {mov.capacidad}
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                        Cliente: <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>{mov.cliente}</Text>
                      </Text>
                    </View>
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

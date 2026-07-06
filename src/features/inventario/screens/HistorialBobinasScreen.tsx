import React from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import {  View, StyleSheet, ScrollView , RefreshControl } from 'react-native';
import { Text, Appbar, useTheme, Divider, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@powersync/react';
import { CustomCard } from '@ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function HistorialBobinasScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const router = useRouter();
  const theme = useTheme();

  const { data: bobinasAgotadas = [] } = useQuery(`
    SELECT bg.id, bg.id_tipo_papel, bg.peso_inicial_kg, bg.peso_actual_kg,
           bg.merma_core_kg, bg.peso_muerto_kg, bg.costo_bobina,
           bg.fecha_llegada, bg.fecha_uso, bg.fecha_gasto,
           tp.nombre as tipo_papel_nombre
    FROM bobinas_grandes bg
    LEFT JOIN tipos_papel tp ON bg.id_tipo_papel = tp.id
    WHERE bg.estado = 'agotada'
    ORDER BY bg.fecha_gasto DESC
  `);

  const formatFecha = (f: string | null) => {
    if (!f) return '—';
    return new Date(f).toLocaleDateString('es-VE');
  };

  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Historial de Bobinas" subtitle="Bobinas consumidas" />
      </Appbar.Header>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>
        {(bobinasAgotadas as any[]).length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="archive-check-outline" size={56} color="#d1d5db" />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No hay bobinas agotadas aún.
            </Text>
            <Text variant="bodySmall" style={{ color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
              Aparecerán aquí cuando se consuman por completo desde el inventario.
            </Text>
          </View>
        ) : (
          (bobinasAgotadas as any[]).map((bobina: any, index: number) => {
            const mermaTotal = (bobina.merma_core_kg ?? 0) + (bobina.peso_muerto_kg ?? 0);
            const rendimientoUtil = (bobina.peso_inicial_kg ?? 0) - mermaTotal;
            const eficiencia = bobina.peso_inicial_kg > 0
              ? (rendimientoUtil / bobina.peso_inicial_kg * 100).toFixed(1)
              : '—';

            return (
              <CustomCard key={bobina.id} style={styles.card}>
                <View style={styles.cardContent}>
                  {/* Header */}
                  <View style={styles.headerRow}>
                    <View style={styles.tipoContainer}>
                      <View style={[
                        styles.tipoBadge,
                        { backgroundColor: '#6366f1' }
                      ]}>
                        <Text style={styles.tipoBadgeText}>Tipo {bobina.tipo_papel_nombre ?? '?'}</Text>
                      </View>
                      <Text variant="titleMedium" style={styles.titulo}>
                        Bobina #{(bobinasAgotadas as any[]).length - index}
                      </Text>
                    </View>
                    <Chip
                      icon="check-circle"
                      mode="flat"
                      style={{ backgroundColor: '#f3f4f6' }}
                      textStyle={{ color: '#6b7280', fontSize: 11 }}
                    >
                      Agotada
                    </Chip>
                  </View>

                  {/* Fechas */}
                  <View style={styles.fechasRow}>
                    <View style={styles.fechaItem}>
                      <Text variant="labelSmall" style={styles.fechaLabel}>LLEGADA</Text>
                      <Text variant="bodySmall">{formatFecha(bobina.fecha_llegada)}</Text>
                    </View>
                    {bobina.fecha_uso && (
                      <View style={styles.fechaItem}>
                        <Text variant="labelSmall" style={styles.fechaLabel}>EN USO</Text>
                        <Text variant="bodySmall">{formatFecha(bobina.fecha_uso)}</Text>
                      </View>
                    )}
                    <View style={styles.fechaItem}>
                      <Text variant="labelSmall" style={styles.fechaLabel}>AGOTADA</Text>
                      <Text variant="bodySmall">{formatFecha(bobina.fecha_gasto)}</Text>
                    </View>
                  </View>

                  <Divider style={{ marginVertical: 12 }} />

                  {/* Métricas de rendimiento */}
                  <Text variant="labelMedium" style={styles.metricsHeader}>BALANCE DE PESO</Text>

                  <View style={styles.metricRow}>
                    <Text variant="bodySmall" style={{ color: '#374151' }}>Peso inicial</Text>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                      {bobina.peso_inicial_kg?.toFixed(1)} kg
                    </Text>
                  </View>

                  {mermaTotal > 0 && (
                    <>
                      {bobina.merma_core_kg > 0 && (
                        <View style={styles.metricRow}>
                          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                            Merma (papel roto/sobrante)
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                            −{bobina.merma_core_kg.toFixed(1)} kg
                          </Text>
                        </View>
                      )}
                      {bobina.peso_muerto_kg > 0 && (
                        <View style={styles.metricRow}>
                          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                            Peso muerto / Core
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                            −{bobina.peso_muerto_kg.toFixed(1)} kg
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  <Divider style={{ marginVertical: 8 }} />

                  <View style={styles.metricRow}>
                    <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>Rendimiento útil</Text>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#16a34a' }}>
                      {rendimientoUtil.toFixed(1)} kg
                    </Text>
                  </View>

                  {/* Eficiencia */}
                  <View style={[styles.eficienciaBox, {
                    backgroundColor: parseFloat(eficiencia) >= 95
                      ? '#dcfce7'
                      : parseFloat(eficiencia) >= 90
                      ? '#fef9c3'
                      : '#fee2e2'
                  }]}>
                    <MaterialCommunityIcons
                      name={parseFloat(eficiencia) >= 95 ? 'trending-up' : parseFloat(eficiencia) >= 90 ? 'trending-neutral' : 'trending-down'}
                      size={16}
                      color={parseFloat(eficiencia) >= 95 ? '#16a34a' : parseFloat(eficiencia) >= 90 ? '#d97706' : theme.colors.error}
                    />
                    <Text variant="bodySmall" style={{ marginLeft: 6, fontWeight: 'bold' }}>
                      Eficiencia: {eficiencia}% de la bobina convertida en producto útil
                    </Text>
                  </View>

                  {bobina.costo_bobina > 0 && (
                    <Text variant="bodySmall" style={{ color: '#9ca3af', marginTop: 8, textAlign: 'right' }}>
                      Costo: ${bobina.costo_bobina?.toFixed(2)} USD
                    </Text>
                  )}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tipoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tipoBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  titulo: { fontWeight: 'bold', color: '#1f2937' },
  fechasRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  fechaItem: { alignItems: 'center', gap: 2 },
  fechaLabel: { color: '#9ca3af', letterSpacing: 0.5 },
  metricsHeader: { color: '#9ca3af', letterSpacing: 0.5, marginBottom: 8 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  eficienciaBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 10, marginTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 60, padding: 24 },
  emptyText: { color: '#9ca3af', marginTop: 16, textAlign: 'center' },
});

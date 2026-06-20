import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar, useTheme, Divider, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@powersync/react';
import { CustomCard } from '@components/ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function HistorialProduccionScreen() {
  const router = useRouter();
  const theme = useTheme();

  const { data: produccionData = [] } = useQuery(`
    SELECT 
      pd.id, 
      pd.fecha, 
      pd.cantidad_rollos_total,
      pd.id_pedido_destino,
      pp.nombre as presentacion,
      cb.kg_consumidos,
      bg.tipo_papel,
      bg.id as bobina_id,
      c.razon_social as cliente
    FROM produccion_diaria pd
    JOIN productos_presentacion pp ON pp.id = pd.id_producto
    LEFT JOIN consumo_bobinas cb ON cb.id_produccion = pd.id
    LEFT JOIN bobinas_grandes bg ON bg.id = cb.id_bobina
    LEFT JOIN pedidos p ON p.id = pd.id_pedido_destino
    LEFT JOIN clientes c ON c.id = p.id_cliente
    ORDER BY pd.fecha DESC
  `);

  // Agrupar la producción por lote (misma fecha de inserción exacta)
  const lotes = useMemo(() => {
    const agrupados: Record<string, any> = {};
    for (const row of produccionData as any[]) {
      const key = row.fecha; // timestamp exacto ISO
      if (!agrupados[key]) {
        agrupados[key] = {
          fecha: key,
          bobina: row.tipo_papel ? `Tipo ${row.tipo_papel}` : 'Desconocida',
          bobina_id: row.bobina_id?.split('-')[0] || '---',
          totalKg: 0,
          resultado: []
        };
      }
      agrupados[key].totalKg += (row.kg_consumidos || 0);
      agrupados[key].resultado.push({
        id: row.id,
        presentacion: row.presentacion,
        cantidad: row.cantidad_rollos_total,
        destino: row.id_pedido_destino ? `Pedido: ${row.cliente}` : 'Stock General',
        esStock: !row.id_pedido_destino
      });
    }
    return Object.values(agrupados).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [produccionData]);

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
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Historial de Producción" subtitle="Lotes procesados" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {lotes.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={56} color="#d1d5db" />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No hay historial de producción.
            </Text>
          </View>
        ) : (
          lotes.map((lote: any, index: number) => (
            <CustomCard key={lote.fecha + index} style={styles.card}>
              <View style={styles.cardContent}>
                
                {/* Cabecera del lote */}
                <View style={styles.headerRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="calendar-clock" size={18} color={theme.colors.primary} />
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#1f2937' }}>
                      {formatFecha(lote.fecha)}
                    </Text>
                  </View>
                  <Chip 
                    mode="flat" 
                    textStyle={{ fontSize: 11, fontWeight: 'bold' }}
                    style={{ backgroundColor: lote.bobina.includes('A') ? '#e0e7ff' : '#fef3c7' }}
                  >
                    Bobina {lote.bobina}
                  </Chip>
                </View>

                {/* Subcabecera: kg consumidos */}
                <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                    Se descontaron <Text style={{ fontWeight: 'bold', color: theme.colors.error }}>{lote.totalKg.toFixed(2)} kg</Text> de la bobina
                  </Text>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <Text variant="labelMedium" style={{ color: '#9ca3af', letterSpacing: 0.5, marginBottom: 8 }}>
                  ROLLOS PRODUCIDOS
                </Text>
                
                {/* Resultados */}
                {lote.resultado.map((prod: any, idx: number) => (
                  <View key={prod.id || idx} style={styles.prodRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#1f2937' }}>
                        +{prod.cantidad}
                      </Text>
                      <Text variant="bodyMedium" style={{ color: '#4b5563' }}>
                        {prod.presentacion}
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Chip 
                        compact 
                        style={{ backgroundColor: prod.esStock ? '#dcfce7' : '#f3e8ff' }}
                        textStyle={{ fontSize: 10, color: prod.esStock ? '#16a34a' : '#9333ea' }}
                      >
                        {prod.destino}
                      </Chip>
                    </View>
                  </View>
                ))}

              </View>
            </CustomCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 12, paddingBottom: 32 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  prodRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
  },
  emptyState: { alignItems: 'center', marginTop: 60, padding: 24 },
  emptyText: { color: '#9ca3af', marginTop: 16, textAlign: 'center' },
});

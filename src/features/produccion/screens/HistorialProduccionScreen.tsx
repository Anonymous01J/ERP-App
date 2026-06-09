import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar, useTheme, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';

export function HistorialProduccionScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Mock data of production batches
  const historial = [
    {
      id: '1',
      fecha: 'Hoy, 08:30 AM',
      operario: 'Carlos M.',
      bobinaOrigen: 'BOB-046 (Papel A)',
      resultado: [
        { presentacion: '600g', cantidad: 150 },
        { presentacion: '1kg', cantidad: 50 },
      ],
      observaciones: 'Producción sin novedades',
    },
    {
      id: '2',
      fecha: 'Ayer, 04:15 PM',
      operario: 'Pedro A.',
      bobinaOrigen: 'BOB-046 (Papel A)',
      resultado: [
        { presentacion: '1kg', cantidad: 200 },
      ],
      observaciones: 'Corte de luz, se pausó 2 horas',
    },
    {
      id: '3',
      fecha: '05/06/2026, 10:00 AM',
      operario: 'José L.',
      bobinaOrigen: 'BOB-045 (Papel A)',
      resultado: [
        { presentacion: '2.5kg', cantidad: 80 },
        { presentacion: '600g', cantidad: 100 },
      ],
      observaciones: 'Bobina agotada en este lote',
    },
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Historial de Producción" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {historial.map((lote) => (
          <CustomCard key={lote.id} style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {lote.fecha}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  {lote.operario}
                </Text>
              </View>
              
              <Text variant="bodySmall" style={{ color: '#555', marginBottom: 8 }}>
                <Text style={{fontWeight: 'bold'}}>Bobina Origen:</Text> {lote.bobinaOrigen}
              </Text>

              <Divider style={{ marginVertical: 8 }} />

              <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                Rollos Producidos:
              </Text>
              
              {lote.resultado.map((prod, index) => (
                <View key={index} style={styles.prodRow}>
                  <Text variant="bodySmall">• {prod.presentacion}:</Text>
                  <Text variant="bodySmall" style={{ fontWeight: 'bold', color: '#16a34a' }}>
                    +{prod.cantidad} unds
                  </Text>
                </View>
              ))}

              <Text variant="bodySmall" style={{ color: '#888', marginTop: 12, fontStyle: 'italic' }}>
                Nota: {lote.observaciones}
              </Text>
            </View>
          </CustomCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingVertical: 2,
  },
});

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar, useTheme, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';

export default function HistorialBobinasScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Mock data of consumed bobinas
  const historial = [
    {
      id: '1',
      codigo: 'BOB-045',
      tipo: 'Papel A',
      pesoOriginal: 340,
      fechaIngreso: '10/05/2026',
      fechaInicio: '28/05/2026',
      fechaAgotada: '05/06/2026',
      produccion: [
        { presentacion: '600g', cantidad: 1200 },
        { presentacion: '1kg', cantidad: 450 },
      ],
      merma: 2.3, // kg
      pesoMuerto: 3,
    },
    {
      id: '2',
      codigo: 'BOB-044',
      tipo: 'Papel B',
      pesoOriginal: 345,
      fechaIngreso: '01/05/2026',
      fechaInicio: '15/05/2026',
      fechaAgotada: '01/06/2026',
      produccion: [
        { presentacion: '1kg', cantidad: 600 },
        { presentacion: '2.5kg', cantidad: 60 },
      ],
      merma: 4, // kg
      pesoMuerto: 1.8,
    },
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Historial de Bobinas Consumidas" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {historial.map((bobina) => (
          <CustomCard key={bobina.id} style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {bobina.codigo} - {bobina.tipo}
                </Text>
              </View>
              
              <Text variant="bodySmall" style={{ color: '#555', marginBottom: 2 }}>
                <Text style={{fontWeight: 'bold'}}>Llegó al deposito:</Text> {bobina.fechaIngreso}
              </Text>
              <Text variant="bodySmall" style={{ color: '#555', marginBottom: 2 }}>
                <Text style={{fontWeight: 'bold'}}>Se empezó a usar:</Text> {bobina.fechaInicio}
              </Text>
              <Text variant="bodySmall" style={{ color: '#555', marginBottom: 8 }}>
                <Text style={{fontWeight: 'bold'}}>Se gastó por completo:</Text> {bobina.fechaAgotada}
              </Text>
              
              <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                Peso Inicial: {bobina.pesoOriginal} kg
              </Text>

              <Divider style={{ marginVertical: 8 }} />

              <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                Rendimiento Obtenido:
              </Text>
              
              {bobina.produccion.map((prod, index) => (
                <View key={index} style={styles.prodRow}>
                  <Text variant="bodySmall">• Rollos de {prod.presentacion}:</Text>
                  <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{prod.cantidad} unds</Text>
                </View>
              ))}

              <View style={[styles.prodRow, { marginTop: 8 }]}>
                <Text variant="bodySmall" style={{ color: theme.colors.error }}>Merma Registrada:</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: 'bold' }}>{bobina.merma} kg</Text>
              </View>
              <View style={[styles.prodRow, {}]}>
                <Text variant="bodySmall" style={{ color: theme.colors.error }}>Peso Muerto:</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: 'bold' }}>{bobina.pesoMuerto} kg</Text>
              </View>

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
    marginBottom: 8,
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingVertical: 2,
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SegmentedButtons, List, Text, Button, Divider, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/CustomCard';

export default function InventarioScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [tab, setTab] = useState('bobinas');

  // Mock data
  const bobinas = [
    { id: '1', tipo: 'Papel A', kg: 1500, status: 'activa' },
    { id: '2', tipo: 'Papel B', kg: 800, status: 'activa' },
  ];

  const productoTerminado = [
    { presentacion: '600g', rollos: 14, paquetes: 2, porPaquete: 7 },
    { presentacion: '1kg', rollos: 30, paquetes: 5, porPaquete: 6 },
    { presentacion: '2.5kg', rollos: 12, paquetes: 3, porPaquete: 4 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'bobinas', label: 'Bobinas Grandes' },
            { value: 'terminado', label: 'Producto Terminado' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === 'bobinas' ? (
          <List.Section>
            {bobinas.map((bobina) => (
              <List.Accordion
                key={bobina.id}
                title={`Bobina ${bobina.tipo} - ${bobina.kg}kg`}
                left={props => <List.Icon {...props} icon="archive-outline" />}
                style={styles.accordion}
              >
                <View style={styles.accordionContent}>
                  <Text variant="bodyMedium">Kg Disponibles: {bobina.kg}</Text>
                  <Button 
                    mode="contained-tonal" 
                    icon="alert-circle-outline"
                    onPress={() => console.log('Registrar Merma')}
                    style={styles.actionButton}
                  >
                    Registrar Merma / Core
                  </Button>
                </View>
              </List.Accordion>
            ))}
          </List.Section>
        ) : (
          <View>
            <View style={styles.headerRow}>
              <Text variant="titleLarge" style={styles.sectionTitle}>Rollos Empaquetados</Text>
              <Button 
                mode="outlined"
                icon="pencil-outline"
                onPress={() => router.push('/(screens)/gestionar-presentaciones')}
                style={{ marginRight: 16 }}
              >
                Gestionar
              </Button>
            </View>
            {productoTerminado.map((prod, index) => (
              <CustomCard key={index}>
                <View style={styles.cardContent}>
                  <View>
                    <Text variant="titleMedium">Presentación {prod.presentacion}</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      {prod.rollos} rollos sueltos / {prod.paquetes} paquetes ({prod.porPaquete}x)
                    </Text>
                  </View>
                </View>
              </CustomCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 8,
  },
  accordion: {
    backgroundColor: '#ffffff',
    marginVertical: 4,
    borderRadius: 8,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  actionButton: {
    marginTop: 12,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 0, // Adjusted for the new button style
  },
});
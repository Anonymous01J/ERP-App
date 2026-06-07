import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Text, Button, useTheme, Chip, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function ViajesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [filtro, setFiltro] = useState('Todos');

  const filtros = ['Todos', 'Compras (Bobinas)', 'Entregas (Pedidos)'];

  // Mock data minimalist approach
  const viajes = [
    { id: '1', tipo: 'compra', origen: 'Distribuidora Central', estado: 'En Curso', fecha: 'Hoy, 08:30 AM', items: '2 Bobinas (1500kg)', conductor: 'Carlos M.' },
    { id: '2', tipo: 'entrega', destino: 'Librería Escolar', estado: 'Entregado', fecha: 'Ayer, 02:15 PM', items: '150 Rollos (1kg)', conductor: 'José L.' },
    { id: '3', tipo: 'entrega', destino: 'Papelera Norte', estado: 'En Curso', fecha: 'Hoy, 10:00 AM', items: '300 Rollos (600g)', conductor: 'Pedro A.' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filtros.map(f => (
            <Chip
              key={f}
              selected={filtro === f}
              onPress={() => setFiltro(f)}
              style={styles.chip}
              showSelectedOverlay
            >
              {f}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <List.Section>
          {viajes.map((viaje) => (
            <List.Accordion
              key={viaje.id}
              title={viaje.tipo === 'compra' ? `Compra: ${viaje.origen}` : `Entrega: ${viaje.destino}`}
              description={`${viaje.fecha} • ${viaje.estado}`}
              left={props => <List.Icon {...props} icon={viaje.tipo === 'compra' ? 'inbox-arrow-down' : 'truck-delivery'} color={viaje.tipo === 'compra' ? theme.colors.primary : theme.colors.tertiary} />}
              style={styles.accordion}
              titleStyle={{ fontWeight: 'bold' }}
            >
              <View style={styles.accordionContent}>
                <Text variant="bodyMedium" style={styles.detailText}>Carga: <Text style={{fontWeight:'bold'}}>{viaje.items}</Text></Text>
                <Text variant="bodyMedium" style={styles.detailText}>Conductor: {viaje.conductor}</Text>
                
                <View style={styles.actionRow}>
                  {viaje.estado === 'En Curso' && (
                    <Button mode="contained" onPress={() => console.log('Completar Viaje')} style={styles.actionButton}>
                      Finalizar
                    </Button>
                  )}
                  <Button mode="outlined" onPress={() => console.log('Ver Detalles')} style={styles.actionButton}>
                    Ver Completo
                  </Button>
                </View>
              </View>
            </List.Accordion>
          ))}
        </List.Section>
      </ScrollView>

      <IconButton
        icon="truck-plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={styles.fab}
        onPress={() => router.push('/(screens)/registrar-viaje')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chip: {
    marginHorizontal: 4,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 100,
  },
  accordion: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    borderRadius: 8,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailText: {
    marginBottom: 4,
    color: '#444',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
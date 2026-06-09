import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { List, Text, Button, useTheme, Chip, IconButton, TextInput, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Subcomponente para el formulario de gastos dentro de un viaje activo
const GastoViajeForm = ({ theme }: { theme: any }) => {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [esIngreso, setEsIngreso] = useState(false);
  const [moneda, setMoneda] = useState('VES');

  return (
    <CustomCard style={styles.inputCard}>
      <Text variant="titleSmall" style={{ marginBottom: 8, color: '#555', paddingHorizontal: 8 }}>
        Registrar Gasto Rápido
      </Text>
      
      <View style={styles.inputRow}>
        <TextInput
          mode="flat"
          placeholder="Descripción..."
          value={descripcion}
          onChangeText={setDescripcion}
          style={[styles.textInput, { flex: 1, backgroundColor: 'transparent' }]}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        <Button mode="outlined" icon="calendar" compact style={styles.dateBtn} labelStyle={{ marginHorizontal: 8 }}>
          09/06
        </Button>
      </View>
      
      <Divider style={styles.divider} />

      <View style={styles.inputRow}>
        <TextInput
          mode="flat"
          placeholder={`Monto en ${moneda}`}
          value={monto}
          onChangeText={setMonto}
          keyboardType="numeric"
          style={[styles.textInput, { flex: 1, backgroundColor: 'transparent' }]}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, { backgroundColor: esIngreso ? '#4ade80' : '#f87171' }]}
            onPress={() => setEsIngreso(!esIngreso)}
          >
            <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 12 }}>
              {esIngreso ? '+ Ingreso' : '- Egreso'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.toggleBtn, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => setMoneda(moneda === 'VES' ? 'USD' : 'VES')}
          >
            <Text style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              {moneda}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#4ade80' }]}>
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </CustomCard>
  );
};

export default function ViajesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [filtro, setFiltro] = useState('Todos');

  const filtros = ['Todos', 'Compras (Bobinas)', 'Entregas (Pedidos)'];

  // Mock data minimalist approach
  const viajes = [
    { id: '1', tipo: 'compra', origen: 'Distribuidora Central', estado: 'En Curso', fecha: 'Hoy, 08:30 AM', items: '2 Bobinas (1500kg)' },
    { id: '3', tipo: 'entrega', destino: 'Papelera Norte', estado: 'En Curso', fecha: 'Hoy, 10:00 AM', items: '300 Rollos (600g)' },
    { id: '2', tipo: 'entrega', destino: 'Librería Escolar', estado: 'Entregado', fecha: 'Ayer, 02:15 PM', items: '150 Rollos (1kg)' },
  ];

  const viajesActivos = viajes.filter(v => v.estado === 'En Curso');
  const viajesPasados = viajes.filter(v => v.estado !== 'En Curso');

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        
        {/* VIAJES ACTIVOS */}
        {viajesActivos.length > 0 && (
          <List.Section>
            <Text variant="titleMedium" style={styles.sectionHeader}>Viajes en Curso</Text>
            {viajesActivos.map((viaje) => (
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
                  {/* Formulario de Gastos */}
                  <View style={{ marginTop: 16 }}>
                    <GastoViajeForm theme={theme} />
                  </View>
                  
                  <View style={styles.actionRow}>
                    <Button mode="contained" onPress={() => console.log('Completar Viaje')} style={styles.actionButton}>
                      Finalizar Viaje
                    </Button>
                    <Button mode="outlined" onPress={() => console.log('Ver Detalles')} style={styles.actionButton}>
                      Ver Completo
                    </Button>
                  </View>
                </View>
              </List.Accordion>
            ))}
          </List.Section>
        )}

        {/* HISTORIAL DE VIAJES */}
        {viajesPasados.length > 0 && (
          <List.Section>
            <Text variant="titleMedium" style={[styles.sectionHeader, { marginTop: 16 }]}>Historial</Text>
            {viajesPasados.map((viaje) => (
              <List.Accordion
                key={viaje.id}
                title={viaje.tipo === 'compra' ? `Compra: ${viaje.origen}` : `Entrega: ${viaje.destino}`}
                description={`${viaje.fecha} • ${viaje.estado}`}
                left={props => <List.Icon {...props} icon={viaje.tipo === 'compra' ? 'inbox-arrow-down' : 'truck-delivery'} color="#888" />}
                style={styles.accordion}
                titleStyle={{ fontWeight: 'bold', color: '#555' }}
              >
                <View style={styles.accordionContent}>
                  <Text variant="bodyMedium" style={styles.detailText}>Carga: <Text style={{fontWeight:'bold'}}>{viaje.items}</Text></Text>

                  <View style={styles.actionRow}>
                    <Button mode="outlined" onPress={() => console.log('Ver Detalles')} style={styles.actionButton}>
                      Ver Detalles
                    </Button>
                  </View>
                </View>
              </List.Accordion>
            ))}
          </List.Section>
        )}

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
    </KeyboardAvoidingView>
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
  sectionHeader: {
    fontWeight: 'bold',
    marginLeft: 8,
    marginBottom: 8,
    color: '#333',
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
    marginTop: 16,
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
  // Estilos copiados para el formulario de gasto rápido
  inputCard: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 0,
    shadowOpacity: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  textInput: {
    height: 48,
    fontSize: 14,
  },
  dateBtn: {
    borderRadius: 8,
    borderColor: '#e0e0e0',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
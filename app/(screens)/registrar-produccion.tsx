import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, Switch, Divider, Menu, SegmentedButtons, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { NumericInput } from '@components/ui/NumericInput';
import { CustomCard } from '@components/ui/CustomCard';

export default function RegistrarProduccionScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form state
  const [menuVisible, setMenuVisible] = useState(false);
  const [bobinaSeleccionada, setBobinaSeleccionada] = useState<string | null>(null);
  
  const [rollos600g, setRollos600g] = useState(0);
  const [rollos1kg, setRollos1kg] = useState(0);
  const [rollos2kg, setRollos2kg] = useState(0);
  const [rollos5kg, setRollos5kg] = useState(0); // Added 5kg
  
  const [vincularPedido, setVincularPedido] = useState(false);
  const [pedidosVinculados, setPedidosVinculados] = useState<string[]>([]);

  const mockPedidosPendientes = [
    { id: '1', cliente: 'Distribuidora Norte', req: '300x 2.5kg (Papel A)' },
    { id: '5', cliente: 'Almacén Don Pepe', req: '500x 600g (Kraft)' },
  ];

  const handleTogglePedido = (id: string) => {
    if (pedidosVinculados.includes(id)) {
      setPedidosVinculados(pedidosVinculados.filter(p => p !== id));
    } else {
      setPedidosVinculados([...pedidosVinculados, id]);
    }
  };

  const handleGuardar = () => {
    console.log('Guardar Producción:', { bobinaSeleccionada, rollos600g, rollos1kg, rollos2kg, rollos5kg, pedidosVinculados });
    router.back();
  };

  const totalProducido = rollos600g + rollos1kg + rollos2kg + rollos5kg;

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Registrar Producción" />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>1. Origen y Material</Text>
              
              <Text variant="bodyMedium" style={{ marginBottom: 8, color: '#555' }}>Bobina Madre a Descontar</Text>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible(true)} 
                    style={styles.menuAnchor}
                    icon="chevron-down"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                  >
                    {bobinaSeleccionada ? bobinaSeleccionada : 'Seleccionar Bobina'}
                  </Button>
                }
              >
                <Menu.Item onPress={() => { setBobinaSeleccionada('Bobina Papel A - 1500kg'); setMenuVisible(false); }} title="Bobina Papel A - 1500kg" />
                <Menu.Item onPress={() => { setBobinaSeleccionada('Bobina Kraft - 800kg'); setMenuVisible(false); }} title="Bobina Kraft - 800kg" />
              </Menu>
            </View>
          </CustomCard>

          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>2. Rollos Producidos</Text>
              
              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Rollos 600g</Text>
                <NumericInput value={rollos600g} onChange={setRollos600g} />
              </View>
              <Divider style={styles.divider} />
              
              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Rollos 1kg</Text>
                <NumericInput value={rollos1kg} onChange={setRollos1kg} />
              </View>
              <Divider style={styles.divider} />

              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Rollos 2.5kg</Text>
                <NumericInput value={rollos2kg} onChange={setRollos2kg} />
              </View>
              <Divider style={styles.divider} />

              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Rollos 5kg</Text>
                <NumericInput value={rollos5kg} onChange={setRollos5kg} />
              </View>
            </View>
          </CustomCard>

          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>3. Destino y Asignación</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text variant="bodyLarge">Vincular a Pedidos Pendientes</Text>
                  <Text variant="bodySmall" style={{ color: '#666' }}>Reserva el material de inmediato para despachos.</Text>
                </View>
                <Switch value={vincularPedido} onValueChange={setVincularPedido} color={theme.colors.primary} />
              </View>
              
              {vincularPedido && (
                <View style={{ marginTop: 16 }}>
                  <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Selecciona los pedidos a cubrir:</Text>
                  {mockPedidosPendientes.map(p => (
                    <Checkbox.Item 
                      key={p.id} 
                      label={`${p.cliente} (${p.req})`} 
                      status={pedidosVinculados.includes(p.id) ? 'checked' : 'unchecked'}
                      onPress={() => handleTogglePedido(p.id)}
                      mode="android"
                      labelStyle={{ fontSize: 14 }}
                    />
                  ))}
                  
                  <View style={styles.infoBox}>
                    <Text variant="bodySmall" style={{ color: '#555', textAlign: 'center' }}>
                      Nota: La producción se asignará a los pedidos seleccionados hasta cubrir sus cuotas. Cualquier cantidad excedente pasará automáticamente al inventario libre.
                    </Text>
                  </View>
                </View>
              )}

              {!vincularPedido && (
                <View style={[styles.infoBox, { backgroundColor: '#f0fdf4' }]}>
                  <Text variant="bodySmall" style={{ color: '#16a34a', textAlign: 'center' }}>
                    Esta producción irá completa al Inventario Libre (Rollos no vinculados).
                  </Text>
                </View>
              )}
            </View>
          </CustomCard>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          disabled={!bobinaSeleccionada || totalProducido === 0}
        >
          Guardar Producción
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 24,
    gap: 8,
  },
  cardContent: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  menuAnchor: {
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  divider: {
    marginVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    borderRadius: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
});

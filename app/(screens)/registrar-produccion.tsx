import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Appbar, useTheme, Switch, Divider, Menu, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { NumericInput } from '@components/NumericInput';
import { CustomCard } from '@components/CustomCard';

export default function RegistrarProduccionScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form state
  const [menuVisible, setMenuVisible] = useState(false);
  const [bobinaSeleccionada, setBobinaSeleccionada] = useState<string | null>(null);
  const [rollos600g, setRollos600g] = useState(0);
  const [rollos1kg, setRollos1kg] = useState(0);
  const [rollos2kg, setRollos2kg] = useState(0);
  const [vincularPedido, setVincularPedido] = useState(false);
  const [pedidoId, setPedidoId] = useState('');

  const handleGuardar = () => {
    console.log('Guardar Producción');
    router.back();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Registrar Producción" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CustomCard>
          <View style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionTitle}>1. Bobina de Origen</Text>
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
              <Menu.Item onPress={() => { setBobinaSeleccionada('Bobina A - 1500kg'); setMenuVisible(false); }} title="Bobina A - 1500kg" />
              <Menu.Item onPress={() => { setBobinaSeleccionada('Bobina B - 800kg'); setMenuVisible(false); }} title="Bobina B - 800kg" />
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
          </View>
        </CustomCard>

        <CustomCard>
          <View style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionTitle}>3. Destino</Text>
            <View style={styles.switchRow}>
              <Text variant="bodyLarge">Vincular a un Pedido Específico</Text>
              <Switch value={vincularPedido} onValueChange={setVincularPedido} color={theme.colors.primary} />
            </View>
            
            {vincularPedido && (
              <TextInput
                mode="outlined"
                label="ID del Pedido o Cliente"
                value={pedidoId}
                onChangeText={setPedidoId}
                style={styles.textInput}
              />
            )}
          </View>
        </CustomCard>

      </ScrollView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          disabled={!bobinaSeleccionada || (rollos600g === 0 && rollos1kg === 0 && rollos2kg === 0)}
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
  scrollContent: {
    padding: 8,
    paddingBottom: 24,
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
    marginTop: 8,
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
  textInput: {
    marginTop: 16,
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

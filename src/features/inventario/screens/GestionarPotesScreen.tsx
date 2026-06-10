import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Dialog, Portal } from 'react-native-paper';

export function GestionarPotesScreen() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [capacidad, setCapacidad] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [costoTotal, setCostoTotal] = useState('');

  const hideDialog = () => setVisible(false);
  const showDialog = () => setVisible(true);

  const handleGuardar = () => {
    console.log('Guardando compra de pote:', { capacidad, cantidad, costoTotal });
    // Aquí iría el llamado a PowerSync/Supabase -> sp_registrar_compra_potes
    hideDialog();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="titleLarge" style={styles.title}>Registro de Compra de Potes</Text>
        <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
          Al registrar una compra, el inventario se actualizará automáticamente y se generará un gasto operativo en la caja.
        </Text>

        <Button mode="contained" onPress={showDialog} icon="plus">
          Registrar Nueva Compra
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog}>
          <Dialog.Title>Registrar Compra</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Capacidad (ej. 500g, 1L)"
              value={capacidad}
              onChangeText={setCapacidad}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Cantidad de unidades"
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Costo Total (USD)"
              value={costoTotal}
              onChangeText={setCostoTotal}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancelar</Button>
            <Button onPress={handleGuardar}>Guardar Compra</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
  },
});

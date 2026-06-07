import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function RegistrarGastoScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form state
  const [viaje, setViaje] = useState('V-102'); // Example active trip
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('gasolina');

  const handleGuardar = () => {
    console.log('Guardar Gasto:', { viaje, monto, categoria });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Registrar Gasto en Ruta" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.formContainer}>
          <Text variant="titleMedium" style={styles.label}>Viaje Activo</Text>
          <TextInput
            mode="outlined"
            value={viaje}
            onChangeText={setViaje}
            style={styles.input}
            disabled
            left={<TextInput.Icon icon="truck-fast-outline" />}
          />

          <Text variant="titleMedium" style={styles.label}>Monto ($)</Text>
          <TextInput
            mode="outlined"
            value={monto}
            onChangeText={setMonto}
            keyboardType="numeric"
            style={[styles.input, styles.montoInput]}
            placeholder="0.00"
            left={<TextInput.Affix text="$" />}
          />

          <Text variant="titleMedium" style={styles.label}>Categoría</Text>
          <SegmentedButtons
            value={categoria}
            onValueChange={setCategoria}
            buttons={[
              { value: 'gasolina', label: 'Gasolina', icon: 'gas-station' },
              { value: 'peaje', label: 'Peaje', icon: 'boom-gate' },
              { value: 'viatico', label: 'Viático', icon: 'food' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          labelStyle={styles.saveButtonLabel}
          disabled={!monto || isNaN(Number(monto))}
        >
          Guardar Gasto
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 24,
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    marginBottom: 24,
  },
  montoInput: {
    fontSize: 24,
    height: 64,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 36, // Extra padding for mobile
  },
  saveButton: {
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 12,
  },
  saveButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

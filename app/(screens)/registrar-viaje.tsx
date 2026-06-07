import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function RegistrarViajeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [tipoViaje, setTipoViaje] = useState('entrega');
  const [destinoOrigen, setDestinoOrigen] = useState('');
  const [conductor, setConductor] = useState('');
  const [notas, setNotas] = useState('');

  const handleGuardar = () => {
    console.log('Iniciar Viaje:', { tipoViaje, destinoOrigen, conductor, notas });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Registrar Viaje" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text variant="titleMedium" style={styles.label}>Tipo de Viaje</Text>
          <SegmentedButtons
            value={tipoViaje}
            onValueChange={setTipoViaje}
            buttons={[
              { value: 'entrega', label: 'Entrega a Cliente', icon: 'truck-delivery' },
              { value: 'compra', label: 'Compra de Bobinas', icon: 'inbox-arrow-down' },
            ]}
            style={styles.segmented}
          />

          <TextInput
            mode="outlined"
            label={tipoViaje === 'entrega' ? 'Cliente Destino' : 'Proveedor Origen'}
            value={destinoOrigen}
            onChangeText={setDestinoOrigen}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Conductor Asignado"
            value={conductor}
            onChangeText={setConductor}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Notas de Carga (Opcional)"
            value={notas}
            onChangeText={setNotas}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          disabled={!destinoOrigen || !conductor}
        >
          Iniciar Viaje
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
    marginBottom: 8,
    fontWeight: 'bold',
  },
  segmented: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 12,
  },
});

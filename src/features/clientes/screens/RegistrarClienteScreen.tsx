import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Appbar, useTheme, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';

export function RegistrarClienteScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('');

  const handleGuardar = () => {
    console.log('Guardar Cliente:', { nombre, telefono, direccion, limiteCredito });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Registrar Cliente" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Nombre o Razón Social"
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Teléfono"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Dirección"
            value={direccion}
            onChangeText={setDireccion}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Límite de Crédito Opcional ($)"
            value={limiteCredito}
            onChangeText={setLimiteCredito}
            keyboardType="numeric"
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
          disabled={!nombre}
        >
          Guardar Cliente
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
  input: {
    marginBottom: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
  },
  saveButton: {
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 12,
  },
});

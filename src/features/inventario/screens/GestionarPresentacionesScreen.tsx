import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, IconButton, List } from 'react-native-paper';
import { useRouter } from 'expo-router';

export function GestionarPresentacionesScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Mock data
  const [presentaciones, setPresentaciones] = useState([
    { id: '1', nombre: '600g', pesoNominal: 600, pesoReal: 615, unidades: 7 },
    { id: '2', nombre: '1kg', pesoNominal: 1000, pesoReal: 1020, unidades: 6 },
    { id: '3', nombre: '2.5kg', pesoNominal: 2500, pesoReal: 2550, unidades: 4 },
  ]);

  const [nombre, setNombre] = useState('');
  const [pesoNominal, setPesoNominal] = useState('');
  const [pesoReal, setPesoReal] = useState('');
  const [unidades, setUnidades] = useState('');

  const handleGuardar = () => {
    const newPres = {
      id: Date.now().toString(),
      nombre,
      pesoNominal: parseInt(pesoNominal),
      pesoReal: parseInt(pesoReal),
      unidades: parseInt(unidades),
    };
    setPresentaciones([...presentaciones, newPres]);
    setNombre(''); setPesoNominal(''); setPesoReal(''); setUnidades('');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Tipos de Rollo (Presentaciones)" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant="titleMedium" style={styles.title}>Nueva Presentación</Text>
          <View style={styles.formContainer}>
            <TextInput
              mode="outlined"
              label="Nombre (Ej. 600g)"
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Peso Nominal (g)"
                value={pesoNominal}
                onChangeText={setPesoNominal}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
              <TextInput
                mode="outlined"
                label="Peso Real (g)"
                value={pesoReal}
                onChangeText={setPesoReal}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
            </View>
            <TextInput
              mode="outlined"
              label="Unidades por Paquete"
              value={unidades}
              onChangeText={setUnidades}
              keyboardType="numeric"
              style={styles.input}
            />
            <Button mode="contained" onPress={handleGuardar} style={styles.addButton}>
              Agregar Presentación
            </Button>
          </View>

          <Text variant="titleMedium" style={styles.title}>Presentaciones Activas</Text>
          {presentaciones.map(pres => (
            <List.Item
              key={pres.id}
              title={`Rollo ${pres.nombre}`}
              description={`Nominal: ${pres.pesoNominal}g | Real: ${pres.pesoReal}g | ${pres.unidades} unds/paq`}
              left={props => <List.Icon {...props} icon="package-variant-closed" />}
              right={props => <IconButton {...props} icon="delete" onPress={() => setPresentaciones(presentaciones.filter(p => p.id !== pres.id))} />}
              style={styles.listItem}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  half: {
    width: '48%',
  },
  addButton: {
    marginTop: 8,
  },
  listItem: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    borderRadius: 8,
  },
});

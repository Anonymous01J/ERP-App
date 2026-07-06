import React, { useState, useEffect } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Appbar, TextInput, Button, useTheme, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function RegistrarTipoPapelScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const { id } = useLocalSearchParams();

  const isEditing = !!id;
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (isEditing) {
      cargarDatos();
    }
  }, [id]);

  const cargarDatos = async () => {
    try {
      const res = await powerSync.getAll('SELECT nombre FROM tipos_papel WHERE id = ?', [id]);
      if (res.length > 0) {
        setNombre(res[0].nombre);
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando datos' });
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Toast.show({ type: 'error', text1: 'Ingresa un nombre' });
      return;
    }

    try {
      if (isEditing) {
        await powerSync.execute('UPDATE tipos_papel SET nombre = ? WHERE id = ?', [nombre.trim(), id]);
        Toast.show({ type: 'success', text1: 'Actualizado' });
      } else {
        await powerSync.execute(
          'INSERT INTO tipos_papel (id, nombre, estado) VALUES (?, ?, ?)',
          [uuidv4(), nombre.trim(), 'activo']
        );
        Toast.show({ type: 'success', text1: 'Registrado' });
      }
      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error guardando datos' });
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditing ? 'Editar Tipo' : 'Nuevo Tipo de Papel'} />
      </Appbar.Header>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={globalStyles.scrollContent}>
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: 'bold' }}>Datos del Tipo de Papel</Text>
            
            <TextInput
              mode="outlined"
              label="Nombre (Ej. Químico, Bond)"
              value={nombre}
              onChangeText={setNombre}
              style={{ marginBottom: 24, backgroundColor: '#fff' }}
            />

            <Button mode="contained" onPress={handleGuardar} style={{ borderRadius: 8, paddingVertical: 4 }}>
              {isEditing ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  
  
  
  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
});

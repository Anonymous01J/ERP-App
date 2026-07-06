import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Appbar, useTheme, TextInput, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import { globalStyles } from '@core/theme/globalStyles';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export function RegistrarClienteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const cargarCliente = async () => {
        try {
          const result = await powerSync.get('SELECT * FROM clientes WHERE id = ?', [id]);
          if (result) {
            setNombre(result.razon_social || '');
            setTelefono(result.telefono || '');
            setLimiteCredito(result.limite_credito ? result.limite_credito.toString() : '');
          }
        } catch (error) {
          console.error('Error cargando cliente:', error);
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los datos del cliente.' });
        }
      };
      cargarCliente();
    }
  }, [id, isEditing, powerSync]);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Toast.show({ type: 'error', text1: 'Campo Requerido', text2: 'El nombre o razón social es obligatorio.' });
      return;
    }

    setLoading(true);
    try {
      const creditoNumerico = limiteCredito ? parseFloat(limiteCredito) : 0;

      if (isEditing && id) {
        await powerSync.execute(
          'UPDATE clientes SET razon_social = ?, telefono = ?, limite_credito = ? WHERE id = ?',
          [nombre.trim(), telefono.trim(), creditoNumerico, id]
        );
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          'INSERT INTO clientes (id, razon_social, telefono, limite_credito, estado, saldo_a_favor_usd) VALUES (?, ?, ?, ?, ?, ?)',
          [newId, nombre.trim(), telefono.trim(), creditoNumerico, 'activo', 0]
        );
      }
      
      Toast.show({
        type: 'success',
        text1: isEditing ? 'Cliente Actualizado' : 'Cliente Guardado Localmente',
        text2: 'Sincronizando con el servidor...'
      });

      setTimeout(() => router.back(), 800);

    } catch (error) {
      console.error('Error guardando cliente:', error);
      Toast.show({ type: 'error', text1: 'Error al Guardar', text2: 'Hubo un problema al guardar el cliente.' });
    } finally {
      setLoading(false);
    }
  };

  const canSave = nombre.trim().length > 0 && !loading;

  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: '#ffffff', elevation: 0 }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={loading} />
        <Appbar.Content title={isEditing ? "Editar Cliente" : "Registrar Cliente"} />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={globalStyles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text variant="titleMedium" style={globalStyles.sectionTitle}>Datos Principales</Text>
          <TextInput
            mode="outlined"
            label="Nombre o Razón Social"
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
            disabled={loading}
          />
          <TextInput
            mode="outlined"
            label="Teléfono"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            style={styles.input}
            disabled={loading}
          />
          <TextInput
            mode="outlined"
            label="Límite de Crédito Opcional ($)"
            value={limiteCredito}
            onChangeText={setLimiteCredito}
            keyboardType="numeric"
            style={styles.input}
            disabled={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[globalStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={globalStyles.saveButton}
          contentStyle={globalStyles.saveButtonContent}
          disabled={!canSave}
          loading={loading}
        >
          {isEditing ? "Guardar Cambios" : "Guardar Cliente"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    padding: 24,
  },
  input: {
    marginBottom: 16,
  },
});

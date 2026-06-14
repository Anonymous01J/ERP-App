import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Appbar, useTheme, TextInput } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';

// Generador simple de UUID v4 para la base de datos offline
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function RegistrarClienteScreen() {
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
      // Cargar datos del cliente existente
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
        // Actualizar
        await powerSync.execute(
          'UPDATE clientes SET razon_social = ?, telefono = ?, limite_credito = ? WHERE id = ?',
          [nombre.trim(), telefono.trim(), creditoNumerico, id]
        );
      } else {
        // Insertar
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

      // Volver atrás después de un breve momento para ver el toast
      setTimeout(() => router.back(), 800);

    } catch (error) {
      console.error('Error guardando cliente:', error);
      Toast.show({ type: 'error', text1: 'Error al Guardar', text2: 'Hubo un problema al guardar el cliente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={loading} />
        <Appbar.Content title={isEditing ? "Editar Cliente" : "Registrar Cliente"} />
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

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          disabled={!nombre || loading}
          loading={loading}
        >
          {isEditing ? "Guardar Cambios" : "Guardar Cliente"}
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

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function RegistrarPoteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const { id } = useLocalSearchParams();

  const [capacidad, setCapacidad] = useState('');
  const [stock, setStock] = useState('0');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      cargarDatos();
    }
  }, [id]);

  const cargarDatos = async () => {
    try {
      const result = await powerSync.getAll(
        `SELECT * FROM inventario_potes WHERE id = ?`,
        [id]
      );
      if (result.length > 0) {
        const pote = result[0];
        setCapacidad(pote.capacidad || '');
        setStock(pote.stock_unidades ? pote.stock_unidades.toString() : '0');
        setPrecioCompra(pote.precio_compra_usd ? pote.precio_compra_usd.toString() : '');
        setPrecioVenta(pote.precio_venta_usd ? pote.precio_venta_usd.toString() : '');
      }
    } catch (error) {
      console.error('Error cargando pote:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los datos del pote.',
      });
    }
  };

  const handleGuardar = async () => {
    if (!capacidad.trim() || !precioCompra || !precioVenta) {
      Toast.show({
        type: 'error',
        text1: 'Campos incompletos',
        text2: 'Por favor completa todos los campos requeridos.',
      });
      return;
    }

    try {
      if (isEditing) {
        await powerSync.execute(
          `UPDATE inventario_potes 
           SET capacidad = ?, stock_unidades = ?, precio_compra_usd = ?, precio_venta_usd = ? 
           WHERE id = ?`,
          [capacidad.trim(), parseInt(stock) || 0, parseFloat(precioCompra), parseFloat(precioVenta), id]
        );
        Toast.show({
          type: 'success',
          text1: 'Guardado',
          text2: 'El pote ha sido actualizado exitosamente.',
        });
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          `INSERT INTO inventario_potes (id, capacidad, stock_unidades, precio_compra_usd, precio_venta_usd, estado) 
           VALUES (?, ?, ?, ?, ?, 'activo')`,
          [newId, capacidad.trim(), parseInt(stock) || 0, parseFloat(precioCompra), parseFloat(precioVenta)]
        );
        Toast.show({
          type: 'success',
          text1: 'Guardado',
          text2: 'El pote ha sido creado exitosamente.',
        });
      }
      
      // Regresar después de guardar
      setTimeout(() => {
        router.back();
      }, 500);

    } catch (error) {
      console.error('Error guardando pote:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Hubo un problema al guardar el pote.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditing ? 'Editar Pote' : 'Nuevo Pote'} />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.title}>
              Datos del Pote
            </Text>
            
            <TextInput
              mode="outlined"
              label="Capacidad (Ej. 250g, 1L)"
              value={capacidad}
              onChangeText={setCapacidad}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="Stock Inicial (unidades)"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Precio Compra ($)"
                value={precioCompra}
                onChangeText={setPrecioCompra}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
              <TextInput
                mode="outlined"
                label="Precio Venta ($)"
                value={precioVenta}
                onChangeText={setPrecioVenta}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
            </View>
            
            <Button 
              mode="contained" 
              onPress={handleGuardar} 
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Pote'}
            </Button>
          </View>
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
    marginBottom: 16,
    color: '#444',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  half: {
    width: '48%',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  }
});

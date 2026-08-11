import React, { useState, useEffect } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import { CurrencyInput } from '@components/ui/CurrencyInput';
import { parseCurrency } from '@core/utils/currency';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { StatusBar } from 'expo-status-bar';

export default function RegistrarProductoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const { id } = useLocalSearchParams();

  const [nombreProducto, setNombreProducto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [stock, setStock] = useState('0');
  const [stockAnterior, setStockAnterior] = useState(0);
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
        `SELECT * FROM productos_reventa WHERE id = ?`,
        [id]
      );
      if (result.length > 0) {
        const prod = result[0];
        setNombreProducto(prod.nombre_producto || '');
        setDescripcion(prod.descripcion || '');
        const stockInt = prod.stock_unidades ? parseInt(prod.stock_unidades.toString(), 10) : 0;
        setStock(stockInt.toString());
        setStockAnterior(stockInt);
        setPrecioCompra(prod.precio_compra_usd ? prod.precio_compra_usd.toString() : '');
        setPrecioVenta(prod.precio_venta_usd ? prod.precio_venta_usd.toString() : '');
      }
    } catch (error) {
      console.error('Error cargando producto:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los datos del producto.',
      });
    }
  };

  const handleGuardar = async () => {
    if (!nombreProducto.trim() || !precioCompra || !precioVenta) {
      Toast.show({
        type: 'error',
        text1: 'Campos incompletos',
        text2: 'Por favor completa todos los campos requeridos.',
      });
      return;
    }

    try {
      const nuevoStock = parseInt(stock) || 0;
      const now = new Date().toISOString();

      if (isEditing) {
        await powerSync.execute(
          `UPDATE productos_reventa 
           SET nombre_producto = ?, descripcion = ?, stock_unidades = ?, precio_compra_usd = ?, precio_venta_usd = ? 
           WHERE id = ?`,
          [nombreProducto.trim(), descripcion.trim() || null, nuevoStock, parseCurrency(precioCompra), parseCurrency(precioVenta), id]
        );
        
        // Registrar ajuste manual si hubo cambio de stock
        const diff = nuevoStock - stockAnterior;
        if (diff !== 0) {
          const tipo = diff > 0 ? 'entrada' : 'salida';
          await powerSync.execute(
            `INSERT INTO historial_productos (id, id_producto, cantidad, tipo, origen, referencia_id, entidad_relacionada, fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), id, Math.abs(diff), tipo, 'ajuste_manual', id, 'Administrador', now]
          );
        }

        Toast.show({
          type: 'success',
          text1: 'Guardado',
          text2: 'El producto ha sido actualizado exitosamente.',
        });
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          `INSERT INTO productos_reventa (id, nombre_producto, descripcion, stock_unidades, precio_compra_usd, precio_venta_usd, estado) 
           VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
          [newId, nombreProducto.trim(), descripcion.trim() || null, nuevoStock, parseCurrency(precioCompra), parseCurrency(precioVenta)]
        );

        if (nuevoStock > 0) {
          await powerSync.execute(
            `INSERT INTO historial_productos (id, id_producto, cantidad, tipo, origen, referencia_id, entidad_relacionada, fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), newId, nuevoStock, 'entrada', 'ajuste_manual', newId, 'Administrador', now]
          );
        }

        Toast.show({
          type: 'success',
          text1: 'Guardado',
          text2: 'El producto ha sido creado exitosamente.',
        });
      }
      
      // Regresar después de guardar
      setTimeout(() => {
        router.back();
      }, 500);

    } catch (error) {
      console.error('Error guardando producto:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Hubo un problema al guardar el producto.',
      });
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditing ? 'Editar Producto' : 'Nuevo Producto'} />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={globalStyles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={globalStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.title}>
              Datos del Producto
            </Text>
            
            <TextInput
              mode="outlined"
              label="Nombre del Producto"
              value={nombreProducto}
              onChangeText={setNombreProducto}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Descripción (opcional)"
              value={descripcion}
              onChangeText={setDescripcion}
              style={styles.input}
              multiline
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
              <CurrencyInput
                mode="outlined"
                label="Costo Unitario ($)"
                value={precioCompra}
                onChangeText={setPrecioCompra}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
              <CurrencyInput
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
              {isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  }
});

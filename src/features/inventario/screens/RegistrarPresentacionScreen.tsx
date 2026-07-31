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

export default function RegistrarPresentacionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const { id } = useLocalSearchParams();

  const [nombre, setNombre] = useState('');
  const [pesoNominal, setPesoNominal] = useState('');
  const [pesoReal, setPesoReal] = useState('');
  const [unidades, setUnidades] = useState('');
  const [precio, setPrecio] = useState('');
  const [tiempoPaquete, setTiempoPaquete] = useState('');

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      cargarDatos();
    }
  }, [id]);

  const cargarDatos = async () => {
    try {
      const result = await powerSync.getAll(
        `SELECT * FROM productos_presentacion WHERE id = ?`,
        [id]
      );
      if (result.length > 0) {
        const pres = result[0];
        setNombre(pres.nombre || '');
        setPesoNominal(pres.peso_nominal_g ? pres.peso_nominal_g.toString() : '');
        setPesoReal(pres.peso_real_g ? pres.peso_real_g.toString() : '');
        setUnidades(pres.rollos_por_paquete ? pres.rollos_por_paquete.toString() : '');
        setPrecio(pres.precio_USD ? pres.precio_USD.toString() : '');
        setTiempoPaquete(pres.tiempo_x_paquete_min ? pres.tiempo_x_paquete_min.toString() : '');
      }
    } catch (error) {
      console.error('Error cargando presentación:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los datos de la presentación.',
      });
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim() || !pesoNominal || !pesoReal || !unidades || !precio) {
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
          `UPDATE productos_presentacion 
           SET nombre = ?, peso_nominal_g = ?, peso_real_g = ?, rollos_por_paquete = ?, precio_USD = ?, tiempo_x_paquete_min = ? 
           WHERE id = ?`,
          [nombre.trim(), parseInt(pesoNominal), parseInt(pesoReal), parseInt(unidades), parseCurrency(precio), tiempoPaquete ? parseFloat(tiempoPaquete) : null, id]
        );
        Toast.show({
          type: 'success',
          text1: 'Guardado',
          text2: 'La presentación ha sido actualizada exitosamente.',
        });
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          `INSERT INTO productos_presentacion (id, nombre, peso_nominal_g, peso_real_g, rollos_por_paquete, precio_USD, tiempo_x_paquete_min, estado) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 'activo')`,
          [newId, nombre.trim(), parseInt(pesoNominal), parseInt(pesoReal), parseInt(unidades), parseCurrency(precio), tiempoPaquete ? parseFloat(tiempoPaquete) : null]
        );
        Toast.show({
          type: 'success',
          text1: 'Guardado',
          text2: 'La presentación ha sido creada exitosamente.',
        });
      }
      
      // Regresar después de guardar
      setTimeout(() => {
        router.back();
      }, 500);

    } catch (error) {
      console.error('Error guardando presentación:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Hubo un problema al guardar la presentación.',
      });
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditing ? 'Editar Presentación' : 'Nueva Presentación'} />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={globalStyles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={globalStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.title}>
              Datos de la Presentación
            </Text>
            
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
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Unidades por Paquete"
                value={unidades}
                onChangeText={setUnidades}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
              <CurrencyInput
                mode="outlined"
                label="Precio x Rollo (USD)"
                value={precio}
                onChangeText={setPrecio}
                style={[styles.input, styles.half]}
              />
            </View>
            <TextInput
              mode="outlined"
              label="Tiempo Aprox. por Paquete (min)"
              value={tiempoPaquete}
              onChangeText={setTiempoPaquete}
              keyboardType="decimal-pad"
              left={<TextInput.Icon icon="timer-outline" />}
              style={styles.input}
            />
            <Button 
              mode="contained" 
              onPress={handleGuardar} 
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Presentación'}
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
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  }
});

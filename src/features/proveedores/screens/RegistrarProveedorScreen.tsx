import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export function RegistrarProveedorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const params = useLocalSearchParams();
  const idProveedor = params.id as string;

  const esEdicion = !!idProveedor;

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos si es edición
  const { data: proveedorData } = useQuery(
    `SELECT * FROM proveedores WHERE id = ?`,
    [idProveedor]
  );

  React.useEffect(() => {
    if (esEdicion && proveedorData && proveedorData.length > 0) {
      const p = proveedorData[0];
      setNombre(p.nombre_empresa || '');
      setTelefono(p.telefono || '');
      setDireccion(p.direccion || '');
      setNotas(p.notas || '');
    }
  }, [proveedorData, esEdicion]);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Datos Incompletos',
        text2: 'El nombre de la empresa es obligatorio.',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (esEdicion) {
        await powerSync.execute(
          `UPDATE proveedores SET nombre_empresa = ?, telefono = ?, direccion = ?, notas = ? WHERE id = ?`,
          [nombre.trim(), telefono.trim() || null, direccion.trim() || null, notas.trim() || null, idProveedor]
        );
        Toast.show({ type: 'success', text1: 'Proveedor Actualizado', text2: 'Se guardaron los cambios correctamente.' });
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          `INSERT INTO proveedores (id, nombre_empresa, telefono, direccion, notas, estado) VALUES (?, ?, ?, ?, ?, 'activo')`,
          [newId, nombre.trim(), telefono.trim() || null, direccion.trim() || null, notas.trim() || null]
        );
        Toast.show({ type: 'success', text1: 'Proveedor Registrado', text2: 'Se añadió el proveedor a la base de datos.' });
      }

      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error('Error guardando proveedor:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema al intentar guardar los datos.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={isLoading} />
        <Appbar.Content title={esEdicion ? "Editar Proveedor" : "Nuevo Proveedor"} />
      </Appbar.Header>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Nombre de la Empresa *"
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
            left={<TextInput.Icon icon="domain" />}
          />
          <TextInput
            mode="outlined"
            label="Teléfono"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />
          <TextInput
            mode="outlined"
            label="Dirección"
            value={direccion}
            onChangeText={setDireccion}
            multiline
            numberOfLines={2}
            style={styles.input}
            left={<TextInput.Icon icon="map-marker" />}
          />
          <TextInput
            mode="outlined"
            label="Notas Adicionales"
            value={notas}
            onChangeText={setNotas}
            multiline
            numberOfLines={3}
            style={styles.input}
            left={<TextInput.Icon icon="text-box-outline" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[globalStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          loading={isLoading}
          disabled={isLoading || !nombre.trim()}
          style={globalStyles.saveButton}
          contentStyle={globalStyles.saveButtonContent}
        >
          {esEdicion ? 'Guardar Cambios' : 'Registrar Proveedor'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  
  
  formContainer: { padding: 24 },
  input: { marginBottom: 16 },
  
  
  
});

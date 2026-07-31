import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { consultarCedula } from '@core/api/cedula';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { StatusBar } from 'expo-status-bar';

export function RegistrarProveedorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const params = useLocalSearchParams();
  const idProveedor = params.id as string;

  const esEdicion = !!idProveedor;

  const [nacionalidad, setNacionalidad] = useState<string>('V');
  const [menuVisible, setMenuVisible] = useState(false);
  const [cedula, setCedula] = useState('');
  const [rif, setRif] = useState('');
  const [encargado, setEncargado] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchingCedula, setSearchingCedula] = useState(false);

  // Cargar datos si es edición
  const { data: proveedorData } = useQuery(
    `SELECT * FROM proveedores WHERE id = ?`,
    [idProveedor]
  );

  React.useEffect(() => {
    if (esEdicion && proveedorData && proveedorData.length > 0) {
      const p = proveedorData[0];
      setEncargado(p.encargado || '');
      setNombre(p.nombre_empresa || '');
      setTelefono(p.telefono || '');
      setDireccion(p.direccion || '');
      setNotas(p.notas || '');

      if (p.cedula) {
        const nac = p.cedula.charAt(0);
        const num = p.cedula.substring(1);
        if (['V', 'E', 'J', 'G', 'P', 'C'].includes(nac)) {
          setNacionalidad(nac);
          setCedula(num);
        } else {
          setCedula(p.cedula);
        }
      }
      if (p.rif) {
        setRif(p.rif);
      }
    }
  }, [proveedorData, esEdicion]);

  const handleBuscarCedula = async () => {
    if (!cedula.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Ingresa un número de cédula válido.' });
      return;
    }
    
    setSearchingCedula(true);
    try {
      const data = await consultarCedula(nacionalidad, cedula.trim());
      if (data) {
        const nombres = [data.primer_nombre, data.segundo_nombre].filter(Boolean).join(' ');
        const apellidos = [data.primer_apellido, data.segundo_apellido].filter(Boolean).join(' ');
        const nombreCompleto = `${nombres} ${apellidos}`.trim();
        
        if (nombreCompleto) {
          setEncargado(nombreCompleto);
          Toast.show({ type: 'success', text1: 'Datos Encontrados', text2: nombreCompleto });
        } else {
          Toast.show({ type: 'info', text1: 'Sin Nombre', text2: 'La API no retornó el nombre.' });
        }
        
        if (data.rif) {
          setRif(data.rif);
        }
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error en consulta', text2: error.message || 'No se pudo buscar la cédula' });
    } finally {
      setSearchingCedula(false);
    }
  };

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
      const cedulaCompleta = cedula.trim() ? `${nacionalidad}${cedula.trim()}` : null;

      if (esEdicion) {
        await powerSync.execute(
          `UPDATE proveedores SET nombre_empresa = ?, telefono = ?, direccion = ?, notas = ?, cedula = ?, rif = ?, encargado = ? WHERE id = ?`,
          [nombre.trim(), telefono.trim() || null, direccion.trim() || null, notas.trim() || null, cedulaCompleta, rif.trim() || null, encargado.trim() || null, idProveedor]
        );
        Toast.show({ type: 'success', text1: 'Proveedor Actualizado', text2: 'Se guardaron los cambios correctamente.' });
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          `INSERT INTO proveedores (id, nombre_empresa, telefono, direccion, notas, estado, cedula, rif, encargado) VALUES (?, ?, ?, ?, ?, 'activo', ?, ?, ?)`,
          [newId, nombre.trim(), telefono.trim() || null, direccion.trim() || null, notas.trim() || null, cedulaCompleta, rif.trim() || null, encargado.trim() || null]
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
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={isLoading} />
        <Appbar.Content title={esEdicion ? "Editar Proveedor" : "Nuevo Proveedor"} />
      </Appbar.Header>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text variant="titleMedium" style={globalStyles.sectionTitle}>Identificación</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 85 }}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible(true)}
                    style={{ height: 50, justifyContent: 'center', borderRadius: 4, marginTop: 6, borderColor: theme.colors.outline }}
                    contentStyle={{ height: '100%', flexDirection: 'row-reverse' }}
                    labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                    icon="menu-down"
                  >
                    {nacionalidad}
                  </Button>
                }
              >
                <Menu.Item onPress={() => { setNacionalidad('V'); setMenuVisible(false); }} title="V - Venezolano" />
                <Menu.Item onPress={() => { setNacionalidad('E'); setMenuVisible(false); }} title="E - Extranjero" />
                <Menu.Item onPress={() => { setNacionalidad('J'); setMenuVisible(false); }} title="J - Jurídico" />
                <Menu.Item onPress={() => { setNacionalidad('G'); setMenuVisible(false); }} title="G - Gubernamental" />
                <Menu.Item onPress={() => { setNacionalidad('P'); setMenuVisible(false); }} title="P - Pasaporte" />
                <Menu.Item onPress={() => { setNacionalidad('C'); setMenuVisible(false); }} title="C - Comuna" />
              </Menu>
            </View>
            <TextInput
              mode="outlined"
              label="Documento (Cédula o RIF)"
              value={cedula}
              onChangeText={setCedula}
              keyboardType="number-pad"
              style={{ flex: 1, marginTop: -6 }}
              disabled={isLoading || searchingCedula}
              right={<TextInput.Icon icon="magnify" onPress={handleBuscarCedula} disabled={isLoading || searchingCedula} />}
            />
          </View>

          <Button 
            mode="contained-tonal" 
            onPress={handleBuscarCedula} 
            loading={searchingCedula} 
            disabled={isLoading || searchingCedula || !cedula.trim()}
            style={{ marginBottom: 24 }}
            icon="card-search"
          >
            Buscar Datos
          </Button>

          <TextInput
            mode="outlined"
            label="Registro de Información Fiscal (RIF)"
            value={rif}
            onChangeText={setRif}
            style={[styles.input, { marginBottom: 24 }]}
            disabled={isLoading}
            placeholder="Ej. J-12345678-9"
          />

          <TextInput
            mode="outlined"
            label="Encargado / Contacto de la Empresa"
            value={encargado}
            onChangeText={setEncargado}
            style={[styles.input, { marginBottom: 24 }]}
            disabled={isLoading}
            left={<TextInput.Icon icon="account-tie" />}
          />

          <Text variant="titleMedium" style={globalStyles.sectionTitle}>Datos Principales</Text>
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

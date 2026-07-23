import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Appbar, useTheme, TextInput, Text, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import { globalStyles } from '@core/theme/globalStyles';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyInput } from '@components/ui/CurrencyInput';
import { parseCurrency, formatCurrencyATM } from '@core/utils/currency';
import { consultarCedula } from '@core/api/cedula';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function RegistrarClienteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [nacionalidad, setNacionalidad] = useState<'V' | 'E'>('V');
  const [menuVisible, setMenuVisible] = useState(false);
  const [cedula, setCedula] = useState('');
  const [rif, setRif] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingCedula, setSearchingCedula] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const cargarCliente = async () => {
        try {
          const result = await powerSync.get('SELECT * FROM clientes WHERE id = ?', [id]);
          if (result) {
            setNombre(result.razon_social || '');
            setTelefono(result.telefono || '');
            setLimiteCredito(result.limite_credito ? formatCurrencyATM(result.limite_credito.toString()) : '');
            
            // Si la cedula existe, extraer nacionalidad y numero
            if (result.cedula) {
              const nac = result.cedula.charAt(0);
              const num = result.cedula.substring(1);
              if (nac === 'V' || nac === 'E') {
                setNacionalidad(nac as 'V' | 'E');
                setCedula(num);
              } else {
                setCedula(result.cedula);
              }
            }
            if (result.rif) {
              setRif(result.rif);
            }
          }
        } catch (error) {
          console.error('Error cargando cliente:', error);
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los datos del cliente.' });
        }
      };
      cargarCliente();
    }
  }, [id, isEditing, powerSync]);

  const handleBuscarCedula = async () => {
    if (!cedula.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Ingresa un número de cédula válido.' });
      return;
    }
    
    setSearchingCedula(true);
    try {
      const data = await consultarCedula(nacionalidad, cedula.trim());
      if (data) {
        // Construir nombre completo
        const nombres = [data.primer_nombre, data.segundo_nombre].filter(Boolean).join(' ');
        const apellidos = [data.primer_apellido, data.segundo_apellido].filter(Boolean).join(' ');
        const nombreCompleto = `${nombres} ${apellidos}`.trim();
        
        if (nombreCompleto) {
          setNombre(nombreCompleto);
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
      Toast.show({ type: 'error', text1: 'Campo Requerido', text2: 'El nombre o razón social es obligatorio.' });
      return;
    }

    setLoading(true);
    try {
      const creditoNumerico = limiteCredito ? parseCurrency(limiteCredito) : 0;
      const cedulaCompleta = cedula.trim() ? `${nacionalidad}${cedula.trim()}` : null;

      if (isEditing && id) {
        await powerSync.execute(
          'UPDATE clientes SET razon_social = ?, telefono = ?, limite_credito = ?, cedula = ?, rif = ? WHERE id = ?',
          [nombre.trim(), telefono.trim(), creditoNumerico, cedulaCompleta, rif.trim() || null, id]
        );
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          'INSERT INTO clientes (id, razon_social, telefono, limite_credito, estado, saldo_a_favor_usd, cedula, rif) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [newId, nombre.trim(), telefono.trim(), creditoNumerico, 'activo', 0, cedulaCompleta, rif.trim() || null]
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
              </Menu>
            </View>
            <TextInput
              mode="outlined"
              label="Número de Cédula"
              value={cedula}
              onChangeText={setCedula}
              keyboardType="number-pad"
              style={{ flex: 1, marginTop: -6 }}
              disabled={loading || searchingCedula}
              right={<TextInput.Icon icon="magnify" onPress={handleBuscarCedula} disabled={loading || searchingCedula} />}
            />
          </View>

          <Button 
            mode="contained-tonal" 
            onPress={handleBuscarCedula} 
            loading={searchingCedula} 
            disabled={loading || searchingCedula || !cedula.trim()}
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
            disabled={loading}
            placeholder="Ej. J-12345678-9"
          />

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
          <CurrencyInput
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

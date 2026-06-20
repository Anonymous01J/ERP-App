import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Appbar, useTheme, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { NumericInput } from '@ui/NumericInput';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface FilaBobina {
  key: string;
  tipoPapel: 'A' | 'B';
  pesoKg: string;
}

export function CargarBobinasViajeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const params = useLocalSearchParams();
  const idViaje = params.id as string;

  const [filas, setFilas] = useState<FilaBobina[]>([
    { key: uuidv4(), tipoPapel: 'A', pesoKg: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAgregarFila = () => {
    setFilas(prev => [...prev, { key: uuidv4(), tipoPapel: 'A', pesoKg: '' }]);
  };

  const handleEliminarFila = (key: string) => {
    if (filas.length === 1) return; // Siempre al menos una fila
    setFilas(prev => prev.filter(f => f.key !== key));
  };

  const handleCambiarTipo = (key: string, tipo: 'A' | 'B') => {
    setFilas(prev => prev.map(f => f.key === key ? { ...f, tipoPapel: tipo } : f));
  };

  const handleCambiarPeso = (key: string, valor: string) => {
    setFilas(prev => prev.map(f => f.key === key ? { ...f, pesoKg: valor } : f));
  };

  const handleConfirmarCarga = async () => {
    const filasValidas = filas.filter(f => f.pesoKg.trim() !== '' && parseFloat(f.pesoKg) > 0);

    if (filasValidas.length === 0) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Ingresa el peso de al menos una bobina.' });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      for (const fila of filasValidas) {
        const pesoKg = parseFloat(fila.pesoKg);
        await powerSync.execute(
          `INSERT INTO bobinas_grandes (id, id_viaje_compra, peso_inicial_kg, tipo_papel, peso_actual_kg, fecha_llegada, estado)
           VALUES (?, ?, ?, ?, ?, ?, 'disponible')`,
          [uuidv4(), idViaje, pesoKg, fila.tipoPapel, pesoKg, now]
        );
      }

      // Avanzar el estado del viaje a 'retornando'
      await powerSync.execute(
        `UPDATE viajes SET estado = 'retornando', fecha_viaje_retorno = ? WHERE id = ?`,
        [now, idViaje]
      );

      Toast.show({
        type: 'success',
        text1: 'Carga Registrada',
        text2: `${filasValidas.length} bobina(s) añadidas al inventario.`,
      });
      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error('Error registrando bobinas:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema al guardar las bobinas.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetornarSinCarga = () => {
    Alert.alert(
      'Retornar Sin Carga',
      '¿Confirmas que el proveedor no tenía stock disponible? El viaje pasará a "Retornando" sin registrar bobinas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const now = new Date().toISOString();
              await powerSync.execute(
                `UPDATE viajes SET estado = 'retornando', fecha_viaje_retorno = ? WHERE id = ?`,
                [now, idViaje]
              );
              Toast.show({ type: 'info', text1: 'Retornando Sin Carga', text2: 'El viaje avanzó a Retornando.' });
              setTimeout(() => router.back(), 500);
            } catch {
              Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el viaje.' });
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const totalKg = filas.reduce((acc, f) => acc + (parseFloat(f.pesoKg) || 0), 0);

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={isSaving} />
        <Appbar.Content title="Cargar Bobinas" subtitle="Registra el material adquirido" />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          
          <Text variant="bodyMedium" style={styles.instruccion}>
            Agrega una fila por cada bobina grande que estás cargando al camión.
          </Text>

          {/* Encabezado de columnas */}
          <View style={styles.headerRow}>
            <Text variant="labelSmall" style={[styles.colHeader, { flex: 1.2 }]}>TIPO PAPEL</Text>
            <Text variant="labelSmall" style={[styles.colHeader, { flex: 1.5 }]}>PESO (kg)</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Filas de bobinas */}
          {filas.map((fila, index) => (
            <View key={fila.key}>
              <View style={styles.filaContainer}>
                {/* Número de fila */}
                <View style={[styles.numBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.numText, { color: theme.colors.onPrimaryContainer }]}>
                    #{index + 1}
                  </Text>
                </View>

                <View style={styles.filaInputs}>
                  {/* Tipo A / B */}
                  <View style={styles.tipoRow}>
                    <TouchableOpacity
                      style={[
                        styles.tipoBtn,
                        fila.tipoPapel === 'A' && { backgroundColor: theme.colors.primary },
                      ]}
                      onPress={() => handleCambiarTipo(fila.key, 'A')}
                    >
                      <Text style={[styles.tipoBtnText, fila.tipoPapel === 'A' && { color: '#fff' }]}>
                        Tipo A
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tipoBtn,
                        fila.tipoPapel === 'B' && { backgroundColor: theme.colors.secondary },
                      ]}
                      onPress={() => handleCambiarTipo(fila.key, 'B')}
                    >
                      <Text style={[styles.tipoBtnText, fila.tipoPapel === 'B' && { color: '#fff' }]}>
                        Tipo B
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Peso */}
                  <NumericInput
                    label="Kg"
                    value={fila.pesoKg}
                    onChangeText={(val) => handleCambiarPeso(fila.key, val)}
                    style={styles.pesoInput}
                    decimal
                  />
                </View>

                {/* Eliminar fila */}
                <TouchableOpacity
                  onPress={() => handleEliminarFila(fila.key)}
                  style={styles.deleteBtn}
                  disabled={filas.length === 1}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={22}
                    color={filas.length === 1 ? '#ccc' : theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
              {index < filas.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}

          {/* Botón añadir */}
          <Button
            mode="outlined"
            icon="plus"
            onPress={handleAgregarFila}
            style={styles.addBtn}
          >
            Añadir Bobina
          </Button>

          {/* Total */}
          {totalKg > 0 && (
            <View style={[styles.totalCard, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                Total a ingresar al inventario
              </Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {totalKg.toLocaleString('es-VE')} kg
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>
                {filas.filter(f => parseFloat(f.pesoKg) > 0).length} bobina(s)
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleConfirmarCarga}
          loading={isSaving}
          disabled={isSaving}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          icon="check-circle"
        >
          Confirmar Carga y Retornar
        </Button>
        <Button
          mode="text"
          onPress={handleRetornarSinCarga}
          disabled={isSaving}
          textColor={theme.colors.error}
          style={{ marginTop: 8 }}
        >
          Retornar Sin Carga
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1 },
  formContainer: { padding: 24, paddingBottom: 40 },
  instruccion: { color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  colHeader: { color: '#9ca3af', fontWeight: 'bold', letterSpacing: 0.5 },
  filaContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  numBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  numText: { fontWeight: 'bold', fontSize: 12 },
  filaInputs: { flex: 1, gap: 8 },
  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  tipoBtnText: { fontWeight: 'bold', color: '#374151', fontSize: 13 },
  pesoInput: { marginBottom: 0 },
  deleteBtn: { padding: 8, marginLeft: 8 },
  divider: { marginVertical: 4, backgroundColor: '#f3f4f6' },
  addBtn: { marginTop: 16, borderStyle: 'dashed', borderRadius: 10 },
  totalCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  footer: { padding: 24, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  saveButton: { borderRadius: 12 },
  saveButtonContent: { paddingVertical: 12 },
});

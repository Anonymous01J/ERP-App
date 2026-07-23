import React, { useState } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, useTheme, TextInput, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CustomCard } from '@components/ui/CustomCard';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyInput } from '@components/ui/CurrencyInput';
import { parseCurrency, formatCurrencyATM } from '@core/utils/currency';
import { getTasaDolarBCV } from '@core/api/dolar';

const CATEGORIAS = [
  { key: 'nomina',      label: 'Nómina',      icon: 'account-group' },
  { key: 'alquiler',    label: 'Alquiler',    icon: 'home-city' },
  { key: 'servicios',   label: 'Servicios',   icon: 'lightning-bolt' },
  { key: 'suministros', label: 'Suministros', icon: 'printer-3d' },
  { key: 'otros',       label: 'Otros',       icon: 'dots-horizontal' },
] as const;

export function RegistrarGastoGeneralScreen() {
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');
  const [categoria, setCategoria] = useState<string>('nomina');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [tasaCambio, setTasaCambio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  const handleGuardar = async () => {
    const valMonto = parseCurrency(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      Toast.show({ type: 'error', text1: 'Monto inválido', text2: 'Ingresa una cantidad mayor a 0.' });
      return;
    }

    if (categoria === 'otros' && descripcion.trim().length === 0) {
      Toast.show({ type: 'error', text1: 'Descripción obligatoria', text2: 'Por favor, describe en qué consiste este gasto.' });
      return;
    }

    const valTasa = parseCurrency(tasaCambio) || 1;

    setSaving(true);
    try {
      const catLabel = CATEGORIAS.find(c => c.key === categoria)?.label || 'General';
      const descripToUse = categoria === 'otros' ? descripcion.trim() : '';
      const descripFinal = descripToUse 
        ? `${catLabel}: ${descripToUse}` 
        : `Gasto General: ${catLabel}`;

      await powerSync.execute(
        `INSERT INTO movimientos (id, descripcion, tipo, monto, moneda, tasa_cambio, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), descripFinal, tipo, valMonto, moneda, valTasa, new Date().toISOString()]
      );

      Toast.show({ type: 'success', text1: 'Movimiento registrado', text2: 'El balance general ha sido actualizado.' });
      router.back();
    } catch (e) {
      console.error('Error registrando gasto general:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo guardar el registro.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={saving} />
        <Appbar.Content title="Registrar Gasto / Ingreso" />
      </Appbar.Header>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={globalStyles.scrollContent}>
          <CustomCard>
            <View style={styles.cardContent}>
              
              {/* TIPO DE MOVIMIENTO */}
              <View style={styles.tipoRow}>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipo === 'egreso' && { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }]}
                  onPress={() => setTipo('egreso')}
                >
                  <MaterialCommunityIcons name="arrow-up-bold" size={20} color={tipo === 'egreso' ? theme.colors.error : '#9ca3af'} />
                  <Text style={[styles.tipoBtnText, tipo === 'egreso' && { color: theme.colors.error }]}>EGRESO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBtn, tipo === 'ingreso' && { backgroundColor: '#dcfce7', borderColor: '#16a34a' }]}
                  onPress={() => setTipo('ingreso')}
                >
                  <MaterialCommunityIcons name="arrow-down-bold" size={20} color={tipo === 'ingreso' ? '#16a34a' : '#9ca3af'} />
                  <Text style={[styles.tipoBtnText, tipo === 'ingreso' && { color: '#16a34a' }]}>INGRESO</Text>
                </TouchableOpacity>
              </View>

              {/* CATEGORÍA */}
              <Text variant="labelMedium" style={styles.sectionLabel}>CATEGORÍA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasScroll}>
                {CATEGORIAS.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoriaBtn,
                      categoria === cat.key && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setCategoria(cat.key)}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={18}
                      color={categoria === cat.key ? '#fff' : '#6b7280'}
                    />
                    <Text style={[styles.categoriaBtnText, categoria === cat.key && { color: '#fff' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* MONTO Y MONEDA */}
              <View style={styles.montoRow}>
                <CurrencyInput
                  mode="outlined"
                  label={`Monto en ${moneda}`}
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="numeric"
                  style={[styles.montoInput, { flex: 1 }]}
                  left={<TextInput.Icon icon={moneda === 'USD' ? 'currency-usd' : 'currency-brl'} />}
                  outlineStyle={{ borderRadius: 10 }}
                />
                <TouchableOpacity
                  style={[styles.monedaToggle, { backgroundColor: moneda === 'USD' ? '#1d4ed8' : theme.colors.primaryContainer }]}
                  onPress={() => setMoneda(moneda === 'VES' ? 'USD' : 'VES')}
                >
                  <Text style={[styles.monedaText, { color: moneda === 'USD' ? '#fff' : theme.colors.primary }]}>
                    {moneda}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TASA DE CAMBIO (Si es VES) */}
              {moneda === 'VES' && (
                <CurrencyInput
                  mode="outlined"
                  label="Tasa de Cambio (Ej. 36.5)"
                  value={tasaCambio}
                  onChangeText={setTasaCambio}
                  keyboardType="numeric"
                  style={styles.tasaInput}
                  left={<TextInput.Icon icon="calculator" />}
                  outlineStyle={{ borderRadius: 10 }}
                />
              )}

              {/* DESCRIPCIÓN */}
              {categoria === 'otros' && (
                <TextInput
                  mode="outlined"
                  label="Descripción (Obligatorio)"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  style={styles.descripcionInput}
                  outlineStyle={{ borderRadius: 10 }}
                />
              )}

              {/* BOTÓN GUARDAR */}
              <Button
                mode="contained"
                onPress={handleGuardar}
                loading={saving}
                disabled={saving || !monto}
                style={[styles.guardarBtn, { backgroundColor: tipo === 'egreso' ? theme.colors.error : '#16a34a' }]}
                contentStyle={{ paddingVertical: 6 }}
                icon={tipo === 'egreso' ? 'cash-minus' : 'cash-plus'}
              >
                {tipo === 'egreso' ? 'Registrar Gasto' : 'Registrar Ingreso'}
              </Button>

            </View>
          </CustomCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  
  
  
  cardContent: { padding: 16 },
  sectionLabel: { color: '#9ca3af', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 10 },
  tipoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  tipoBtnText: { fontWeight: 'bold', fontSize: 14, color: '#9ca3af' },
  categoriasScroll: { marginBottom: 20 },
  categoriaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#f3f4f6', marginRight: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  categoriaBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  montoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  montoInput: { marginBottom: 0, backgroundColor: '#fff' },
  tasaInput: { marginBottom: 16, backgroundColor: '#fff' },
  monedaToggle: {
    width: 56, height: 56, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 6
  },
  monedaText: { fontWeight: 'bold', fontSize: 14 },
  descripcionInput: { marginBottom: 24, backgroundColor: '#fff' },
  guardarBtn: { borderRadius: 12 },
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Appbar, useTheme, TextInput, IconButton, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function RegistrarGastoScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form State
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [esIngreso, setEsIngreso] = useState(false);
  const [moneda, setMoneda] = useState('VES');

  // Mock Summary
  const resumen = {
    bsNeto: 13369.15,
    usdNeto: 80.00,
  };

  // Mock Transactions
  const transacciones = [
    {
      fecha: 'Ayer',
      data: [
        { id: '1', descripcion: 'Pago front-cont jaykel', montoVes: 2817.00, montoUsd: 5.00, esIngreso: true, moneda: 'VES' },
        { id: '2', descripcion: 'Colaboración mía', montoVes: 2816.45, montoUsd: 5.00, esIngreso: false, moneda: 'VES' },
        { id: '3', descripcion: 'Pago Dariana 1/2', montoVes: 5632.89, montoUsd: 10.00, esIngreso: true, moneda: 'VES' },
        { id: '4', descripcion: 'Pago cantv', montoVes: 2602.77, montoUsd: 4.62, esIngreso: false, moneda: 'VES' },
        { id: '5', descripcion: 'Correccion', montoVes: 9.99, montoUsd: 0.02, esIngreso: true, moneda: 'VES' },
      ],
    },
    {
      fecha: '07/06/2026',
      data: [
        { id: '6', descripcion: 'Pago refresco+pan', montoVes: 1620.00, montoUsd: 2.88, esIngreso: false, moneda: 'VES' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Agenda de Gastos" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: '#4ade80' }]}>
              <Text variant="bodySmall" style={{ color: '#666' }}>Bs. Neto</Text>
              <Text variant="titleMedium" style={{ color: '#16a34a', fontWeight: 'bold' }}>Bs. {resumen.bsNeto.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: theme.colors.primary }]}>
              <Text variant="bodySmall" style={{ color: '#666' }}>$ Neto</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>$ {resumen.usdNeto.toFixed(2)}</Text>
            </View>
          </View>

          {/* Input Form Card */}
          <CustomCard style={styles.inputCard}>
            <View style={styles.inputRow}>
              <TextInput
                mode="flat"
                placeholder="Descripción..."
                value={descripcion}
                onChangeText={setDescripcion}
                style={[styles.textInput, { flex: 1, backgroundColor: 'transparent' }]}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
              <Button mode="outlined" icon="calendar" compact style={styles.dateBtn} labelStyle={{ marginHorizontal: 8 }}>
                09/06
              </Button>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.inputRow}>
              <TextInput
                mode="flat"
                placeholder={`Monto en ${moneda}`}
                value={monto}
                onChangeText={setMonto}
                keyboardType="numeric"
                style={[styles.textInput, { flex: 1, backgroundColor: 'transparent' }]}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
              
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, { backgroundColor: esIngreso ? '#4ade80' : '#f87171' }]}
                  onPress={() => setEsIngreso(!esIngreso)}
                >
                  <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 12 }}>
                    {esIngreso ? '+ Ingreso' : '- Egreso'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.toggleBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                  onPress={() => setMoneda(moneda === 'VES' ? 'USD' : 'VES')}
                >
                  <Text style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                    {moneda}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#4ade80' }]}>
                  <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </CustomCard>

          {/* Order and Filter */}
          <View style={styles.filterRow}>
            <Text variant="labelSmall" style={{ color: '#888', letterSpacing: 1, fontWeight: 'bold' }}>ORDEN Y FILTRO</Text>
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="swap-vertical" size={20} iconColor="#888" />
              <IconButton icon="calendar-outline" size={20} iconColor="#888" />
            </View>
          </View>

          {/* Transactions List */}
          {transacciones.map((grupo, gIndex) => (
            <View key={gIndex} style={styles.groupContainer}>
              <Text variant="titleSmall" style={styles.groupHeader}>{grupo.fecha}</Text>
              
              {grupo.data.map((item) => (
                <View key={item.id} style={[styles.txCard, { borderColor: item.esIngreso ? '#bbf7d0' : '#fecaca' }]}>
                  <View style={styles.txLeft}>
                    <View style={[styles.txIconContainer, { backgroundColor: item.esIngreso ? '#4ade80' : '#f87171' }]}>
                      <MaterialCommunityIcons 
                        name={item.esIngreso ? 'arrow-up' : 'arrow-down'} 
                        size={18} 
                        color="#fff" 
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        {item.descripcion}
                      </Text>
                      <Text variant="bodySmall" style={{ color: '#eab308', fontWeight: 'bold' }}>
                        ≈ ${item.montoUsd.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.txRight}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: item.esIngreso ? '#16a34a' : '#dc2626' }}>
                      {item.esIngreso ? '+' : '-'} {item.montoVes.toFixed(2)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: item.esIngreso ? '#16a34a' : '#dc2626', textAlign: 'right', fontSize: 10 }}>
                      {item.moneda}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Light theme background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 0.48,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  textInput: {
    height: 48,
    fontSize: 14,
  },
  dateBtn: {
    borderRadius: 8,
    borderColor: '#e0e0e0',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

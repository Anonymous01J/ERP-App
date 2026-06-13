import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, Divider, Menu, SegmentedButtons, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { NumericInput } from '@components/ui/NumericInput';
import { CustomCard } from '@components/ui/CustomCard';
import { DatePickerInput } from '@components/ui/DatePickerInput';
import { PedidoItem } from '../types/pedidos.types';

export function NuevoPedidoScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form state
  const [menuVisible, setMenuVisible] = useState(false);
  const [cliente, setCliente] = useState<string | null>(null);
  const [fechaEntrega, setFechaEntrega] = useState<string>('');
  
  // Item Form state
  const [tipoItem, setTipoItem] = useState<'papel' | 'pote'>('papel');
  const [papel, setPapel] = useState('Papel A');
  const [presentacion, setPresentacion] = useState('600g');
  const [poteCapacidad, setPoteCapacidad] = useState('500g');
  const [cantidad, setCantidad] = useState(0);

  // List of added items
  const [items, setItems] = useState<PedidoItem[]>([]);

  const handleAgregarItem = () => {
    if (cantidad > 0) {
      setItems([...items, { 
        id: Date.now().toString(), 
        tipoItem, 
        papel: tipoItem === 'papel' ? papel : undefined, 
        presentacion: tipoItem === 'papel' ? presentacion : poteCapacidad, 
        cantidad 
      }]);
      setCantidad(0); // Reset quantity for next item
    }
  };

  const handleRemoverItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleGuardar = () => {
    console.log('Guardar Pedido a Crédito:', { cliente, fechaEntrega, items });
    router.back();
  };

  const totalRollos = items.reduce((acc, curr) => acc + curr.cantidad, 0);

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Nuevo Pedido (Crédito a 30 días)" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* 1. Cliente y Entrega */}
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>1. Cliente y Entrega</Text>
              
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible(true)} 
                    style={styles.menuAnchor}
                    icon="chevron-down"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                  >
                    {cliente ? cliente : 'Seleccionar Cliente'}
                  </Button>
                }
              >
                <Menu.Item onPress={() => { setCliente('Distribuidora Norte'); setMenuVisible(false); }} title="Distribuidora Norte" />
                <Menu.Item onPress={() => { setCliente('Papelera Central'); setMenuVisible(false); }} title="Papelera Central" />
                <Menu.Item onPress={() => { setCliente('Librería Escolar'); setMenuVisible(false); }} title="Librería Escolar" />
              </Menu>
              
              {!cliente && (
                <Button mode="text" style={{ marginTop: 8 }} onPress={() => router.push('/(screens)/registrar-cliente')}>
                  + Registrar Nuevo Cliente
                </Button>
              )}

              <View style={{ marginTop: 16 }}>
                <DatePickerInput
                  label="Fecha de Entrega"
                  value={fechaEntrega}
                  onChange={setFechaEntrega}
                />
              </View>
            </View>
          </CustomCard>

          {/* 2. Constructor de Productos */}
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>2. Añadir Productos</Text>
              
              <SegmentedButtons
                value={tipoItem}
                onValueChange={(val) => setTipoItem(val as 'papel' | 'pote')}
                buttons={[
                  { value: 'papel', label: 'Rollos de Papel' },
                  { value: 'pote', label: 'Envases (Potes)' },
                ]}
                style={{ marginBottom: 16 }}
              />

              {tipoItem === 'papel' ? (
                <>
                  <Text variant="bodyMedium" style={{ marginBottom: 8, color: '#555' }}>Tipo de Papel</Text>
                  <SegmentedButtons
                    value={papel}
                    onValueChange={setPapel}
                    buttons={[
                      { value: 'Papel A', label: 'Papel A' },
                      { value: 'Papel B', label: 'Papel B' },
                      { value: 'Kraft', label: 'Kraft' },
                    ]}
                    style={{ marginBottom: 16 }}
                  />

                  <Text variant="bodyMedium" style={{ marginBottom: 8, color: '#555' }}>Presentación</Text>
                  <SegmentedButtons
                    value={presentacion}
                    onValueChange={setPresentacion}
                    buttons={[
                      { value: '600g', label: '600g' },
                      { value: '1kg', label: '1kg' },
                      { value: '2.5kg', label: '2.5kg' },
                    ]}
                    style={{ marginBottom: 16 }}
                  />
                </>
              ) : (
                <>
                  <Text variant="bodyMedium" style={{ marginBottom: 8, color: '#555' }}>Capacidad del Pote</Text>
                  <SegmentedButtons
                    value={poteCapacidad}
                    onValueChange={setPoteCapacidad}
                    buttons={[
                      { value: '250g', label: '250g' },
                      { value: '500g', label: '500g' },
                      { value: '1kg', label: '1kg' },
                    ]}
                    style={{ marginBottom: 16 }}
                  />
                </>
              )}
              
              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Cantidad de Rollos</Text>
                <NumericInput value={cantidad} onChange={setCantidad} />
              </View>

              <Button 
                mode="contained-tonal" 
                icon="plus" 
                onPress={handleAgregarItem} 
                style={{ marginTop: 16 }} 
                disabled={cantidad === 0}
              >
                Añadir al Pedido
              </Button>
            </View>
          </CustomCard>

          {/* 3. Resumen del Pedido */}
          {items.length > 0 && (
            <CustomCard>
              <View style={styles.cardContent}>
                <Text variant="titleMedium" style={styles.sectionTitle}>3. Resumen del Pedido</Text>
                
                {items.map((item) => (
                  <View key={item.id} style={styles.itemAddedRow}>
                    <Text variant="bodyMedium" style={{ flex: 1, color: '#333' }}>
                      • {item.cantidad} x {item.presentacion} {item.tipoItem === 'papel' ? `(${item.papel})` : '(Pote)'}
                    </Text>
                    <IconButton 
                      icon="close-circle-outline" 
                      iconColor={theme.colors.error} 
                      size={20} 
                      onPress={() => handleRemoverItem(item.id as string)} 
                      style={{ margin: 0 }}
                    />
                  </View>
                ))}
                
                <Divider style={styles.divider} />
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', textAlign: 'right' }}>
                  Total Rollos: {totalRollos}
                </Text>
              </View>
            </CustomCard>
          )}

          <View style={styles.infoBox}>
            <Text variant="bodyMedium" style={{ color: '#555', textAlign: 'center' }}>
              Nota: Este pedido será registrado bajo la modalidad de crédito a 1 cuota, pagadero a los 30 días posteriores a la entrega.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          labelStyle={styles.saveButtonLabel}
          disabled={!cliente || items.length === 0 || !fechaEntrega}
        >
          Guardar Pedido
        </Button>
      </View>
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
    padding: 8,
    paddingBottom: 24,
    gap: 8,
  },
  cardContent: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  menuAnchor: {
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  itemAddedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 12,
  },
  infoBox: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 12,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

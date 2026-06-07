import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, Divider, Menu, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { NumericInput } from '@components/NumericInput';
import { CustomCard } from '@components/CustomCard';

export default function NuevoPedidoScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form state
  const [menuVisible, setMenuVisible] = useState(false);
  const [cliente, setCliente] = useState<string | null>(null);
  const [rollos600g, setRollos600g] = useState(0);
  const [rollos1kg, setRollos1kg] = useState(0);
  const [rollos2kg, setRollos2kg] = useState(0);

  const handleGuardar = () => {
    console.log('Guardar Pedido a Crédito:', { cliente, rollos600g, rollos1kg, rollos2kg });
    router.back();
  };

  const totalRollos = rollos600g + rollos1kg + rollos2kg;

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
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>1. Selección de Cliente</Text>
              
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
            </View>
          </CustomCard>

          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>2. Productos Requeridos</Text>
              
              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Rollos 600g</Text>
                <NumericInput value={rollos600g} onChange={setRollos600g} />
              </View>
              <Divider style={styles.divider} />
              
              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Rollos 1kg</Text>
                <NumericInput value={rollos1kg} onChange={setRollos1kg} />
              </View>
              <Divider style={styles.divider} />

              <View style={styles.inputRow}>
                <Text variant="bodyLarge">Rollos 2.5kg</Text>
                <NumericInput value={rollos2kg} onChange={setRollos2kg} />
              </View>
            </View>
          </CustomCard>

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
          disabled={!cliente || totalRollos === 0}
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
  divider: {
    marginVertical: 8,
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

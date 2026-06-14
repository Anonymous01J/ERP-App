import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export function RegistrarViajeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  const [tipoViaje, setTipoViaje] = useState('entrega');
  const [destinoOrigen, setDestinoOrigen] = useState('');
  const [notas, setNotas] = useState('');

  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<string[]>([]);

  // Mock pedidos pendientes - Esto se reemplazará más adelante por consultas reales a 'pedidos'
  const pedidosPendientes = [
    { id: '1', titulo: 'Pedido #001 - Librería Escolar' },
    { id: '2', titulo: 'Pedido #002 - Papelera Central' },
    { id: '3', titulo: 'Pedido #003 - Distribuidora X' },
  ];

  const handleTogglePedido = (id: string) => {
    if (pedidosSeleccionados.includes(id)) {
      setPedidosSeleccionados(pedidosSeleccionados.filter(p => p !== id));
    } else {
      setPedidosSeleccionados([...pedidosSeleccionados, id]);
    }
  };

  const handleGuardar = async () => {
    // Validación manual
    if (tipoViaje === 'compra' && !destinoOrigen.trim()) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Debes indicar el proveedor de origen.' });
      return;
    }
    if (tipoViaje === 'entrega' && pedidosSeleccionados.length === 0) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Debes seleccionar al menos un pedido.' });
      return;
    }
    if (tipoViaje === 'mixto' && (!destinoOrigen.trim() || pedidosSeleccionados.length === 0)) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Para viajes mixtos, requieres proveedor y pedidos.' });
      return;
    }

    try {
      const newId = uuidv4();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO viajes (id, tipo_viaje, destino_origen, notas, fecha_viaje_inicio, estado) 
         VALUES (?, ?, ?, ?, ?, 'en_progreso')`,
        [newId, tipoViaje, tipoViaje !== 'entrega' ? destinoOrigen.trim() : null, notas.trim(), now]
      );

      // Quedará pendiente insertar en entregas_viaje si hay pedidosSeleccionados
      
      Toast.show({
        type: 'success',
        text1: 'Viaje Iniciado',
        text2: 'El viaje ha comenzado exitosamente.',
      });

      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error('Error iniciando viaje:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema al intentar iniciar el viaje.' });
    }
  };

  const isBotonDeshabilitado = 
    (tipoViaje === 'compra' && !destinoOrigen) ||
    (tipoViaje === 'entrega' && pedidosSeleccionados.length === 0) ||
    (tipoViaje === 'mixto' && (!destinoOrigen || pedidosSeleccionados.length === 0));

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Registrar Viaje" />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text variant="titleMedium" style={styles.label}>Tipo de Viaje</Text>
          <SegmentedButtons
            value={tipoViaje}
            onValueChange={setTipoViaje}
            buttons={[
              { value: 'entrega', label: 'Entregas', icon: 'truck-delivery' },
              { value: 'compra', label: 'Compras', icon: 'inbox-arrow-down' },
              { value: 'mixto', label: 'Mixto', icon: 'swap-vertical' },
            ]}
            style={styles.segmented}
          />

          {(tipoViaje === 'entrega' || tipoViaje === 'mixto') && (
            <View style={styles.pedidosContainer}>
              <Text variant="titleMedium" style={styles.label}>Pedidos a Transportar</Text>
              {pedidosPendientes.map((pedido) => {
                const seleccionado = pedidosSeleccionados.includes(pedido.id);
                return (
                  <Button
                    key={pedido.id}
                    mode={seleccionado ? 'contained' : 'outlined'}
                    icon={seleccionado ? 'check-circle' : 'package-variant'}
                    onPress={() => handleTogglePedido(pedido.id)}
                    style={styles.pedidoItem}
                    contentStyle={{ justifyContent: 'flex-start' }}
                  >
                    {pedido.titulo}
                  </Button>
                );
              })}
            </View>
          )}

          {(tipoViaje === 'compra' || tipoViaje === 'mixto') && (
            <TextInput
              mode="outlined"
              label="Proveedor Origen (Retorno)"
              value={destinoOrigen}
              onChangeText={setDestinoOrigen}
              style={styles.input}
            />
          )}

          <TextInput
            mode="outlined"
            label="Notas de Carga (Opcional)"
            value={notas}
            onChangeText={setNotas}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleGuardar} 
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          disabled={isBotonDeshabilitado}
        >
          Iniciar Viaje
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 24,
  },
  label: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  segmented: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 12,
  },
  pedidosContainer: {
    marginBottom: 24,
  },
  pedidoItem: {
    marginBottom: 8,
    borderRadius: 8,
  },
});

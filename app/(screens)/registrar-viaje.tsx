import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function RegistrarViajeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [tipoViaje, setTipoViaje] = useState('entrega');
  const [destinoOrigen, setDestinoOrigen] = useState('');
  const [conductor, setConductor] = useState('');
  const [notas, setNotas] = useState('');

  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<string[]>([]);

  // Mock pedidos pendientes
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

  const handleGuardar = () => {
    console.log('Iniciar Viaje:', { tipoViaje, destinoOrigen, conductor, notas, pedidosSeleccionados });
    router.back();
  };

  const isBotonDeshabilitado = tipoViaje === 'compra' 
    ? (!destinoOrigen || !conductor)
    : (pedidosSeleccionados.length === 0);

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Registrar Viaje" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text variant="titleMedium" style={styles.label}>Tipo de Viaje</Text>
          <SegmentedButtons
            value={tipoViaje}
            onValueChange={setTipoViaje}
            buttons={[
              { value: 'entrega', label: 'Entrega a Cliente', icon: 'truck-delivery' },
              { value: 'compra', label: 'Compra de Bobinas', icon: 'inbox-arrow-down' },
            ]}
            style={styles.segmented}
          />

          {tipoViaje === 'compra' ? (
            <>
              <TextInput
                mode="outlined"
                label="Proveedor Origen"
                value={destinoOrigen}
                onChangeText={setDestinoOrigen}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Conductor Asignado"
                value={conductor}
                onChangeText={setConductor}
                style={styles.input}
              />
            </>
          ) : (
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, SegmentedButtons, Menu, Chip, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function RegistrarViajeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  const [tipoViaje, setTipoViaje] = useState('entrega');
  const [idProveedor, setIdProveedor] = useState<string | null>(null);
  const [menuProveedorVisible, setMenuProveedorVisible] = useState(false);
  const [notas, setNotas] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pedidos seleccionados con orden: [{ id, razon_social, orden }]
  const [paradasSeleccionadas, setParadasSeleccionadas] = useState<{ id: string; label: string; orden: number }[]>([]);

  // Queries de PowerSync
  const { data: proveedores = [] } = useQuery(
    'SELECT * FROM proveedores WHERE estado = ? ORDER BY nombre_empresa ASC',
    ['activo']
  );

  // Pedidos listos primero, luego en_produccion
  const { data: pedidosDisponibles = [] } = useQuery(`
    SELECT p.id, c.razon_social, p.estado
    FROM pedidos p
    JOIN clientes c ON c.id = p.id_cliente
    WHERE p.estado IN ('listo', 'en_produccion')
    ORDER BY 
      CASE WHEN p.estado = 'listo' THEN 0 ELSE 1 END ASC,
      c.razon_social ASC
  `);

  const handleTogglePedido = (id: string, label: string) => {
    const yaSeleccionado = paradasSeleccionadas.find(p => p.id === id);
    if (yaSeleccionado) {
      // Deseleccionar y reordenar
      const nuevas = paradasSeleccionadas
        .filter(p => p.id !== id)
        .map((p, idx) => ({ ...p, orden: idx + 1 }));
      setParadasSeleccionadas(nuevas);
    } else {
      setParadasSeleccionadas([
        ...paradasSeleccionadas,
        { id, label, orden: paradasSeleccionadas.length + 1 },
      ]);
    }
  };

  const handleGuardar = async () => {
    if (tipoViaje === 'compra' && !idProveedor) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Debes seleccionar un proveedor de origen.' });
      return;
    }
    if ((tipoViaje === 'entrega' || tipoViaje === 'mixto') && paradasSeleccionadas.length === 0) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Debes seleccionar al menos una parada/pedido.' });
      return;
    }
    if (tipoViaje === 'mixto' && !idProveedor) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Los viajes mixtos requieren un proveedor origen.' });
      return;
    }

    setIsSaving(true);
    try {
      const newId = uuidv4();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO viajes (id, tipo_viaje, id_proveedor, notas, fecha_viaje_inicio, estado)
         VALUES (?, ?, ?, ?, ?, 'en_progreso')`,
        [newId, tipoViaje, tipoViaje !== 'entrega' ? idProveedor : null, notas.trim() || null, now]
      );

      // Insertar paradas de entrega
      for (const parada of paradasSeleccionadas) {
        await powerSync.execute(
          `INSERT INTO entregas_viaje (id, id_viaje, id_pedido, orden, estado)
           VALUES (?, ?, ?, ?, 'pendiente')`,
          [uuidv4(), newId, parada.id, parada.orden]
        );
      }

      Toast.show({ type: 'success', text1: 'Viaje Iniciado', text2: 'El viaje ha comenzado exitosamente.' });
      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error('Error iniciando viaje:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema al intentar iniciar el viaje.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isBotonDeshabilitado =
    isSaving ||
    (tipoViaje === 'compra' && !idProveedor) ||
    ((tipoViaje === 'entrega' || tipoViaje === 'mixto') && paradasSeleccionadas.length === 0) ||
    (tipoViaje === 'mixto' && !idProveedor);

  const proveedorSeleccionado = proveedores.find((p: any) => p.id === idProveedor);

  return (
    <View style={globalStyles.containerWhite}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={isSaving} />
        <Appbar.Content title="Registrar Viaje" />
      </Appbar.Header>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          
          {/* Tipo de Viaje */}
          <Text variant="titleMedium" style={styles.label}>Tipo de Viaje</Text>
          <SegmentedButtons
            value={tipoViaje}
            onValueChange={(val) => {
              setTipoViaje(val);
              setParadasSeleccionadas([]);
              setIdProveedor(null);
            }}
            buttons={[
              { value: 'entrega', label: 'Entregas', icon: 'truck-delivery' },
              { value: 'compra', label: 'Compras', icon: 'inbox-arrow-down' },
              { value: 'mixto', label: 'Mixto', icon: 'swap-vertical' },
            ]}
            style={styles.segmented}
          />

          {/* Paradas de Entrega */}
          {(tipoViaje === 'entrega' || tipoViaje === 'mixto') && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.label}>
                Paradas de Entrega ({paradasSeleccionadas.length} seleccionadas)
              </Text>

              {/* Paradas seleccionadas con orden */}
              {paradasSeleccionadas.length > 0 && (
                <View style={styles.paradasOrden}>
                  {paradasSeleccionadas.map((p) => (
                    <View key={p.id} style={styles.paradaRow}>
                      <View style={[styles.ordenBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.ordenText}>{p.orden}</Text>
                      </View>
                      <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 8 }}>{p.label}</Text>
                      <TouchableOpacity onPress={() => handleTogglePedido(p.id, p.label)}>
                        <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Divider style={{ marginVertical: 12 }} />
                </View>
              )}

              {/* Lista de pedidos disponibles */}
              {pedidosDisponibles.length === 0 ? (
                <Text variant="bodySmall" style={styles.emptyText}>No hay pedidos listos o en producción disponibles.</Text>
              ) : (
                pedidosDisponibles.map((pedido: any) => {
                  const seleccionado = paradasSeleccionadas.find(p => p.id === pedido.id);
                  const esListo = pedido.estado === 'listo';
                  return (
                    <Chip
                      key={pedido.id}
                      selected={!!seleccionado}
                      onPress={() => handleTogglePedido(pedido.id, pedido.razon_social)}
                      icon={seleccionado ? 'check-circle' : (esListo ? 'package-variant-closed' : 'progress-wrench')}
                      style={[styles.chip, seleccionado && { backgroundColor: theme.colors.primaryContainer }]}
                      showSelectedCheck={false}
                    >
                      {pedido.razon_social}{!esListo ? ' (En Producción)' : ''}
                    </Chip>
                  );
                })
              )}
            </View>
          )}

          {/* Proveedor de Compra */}
          {(tipoViaje === 'compra' || tipoViaje === 'mixto') && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.label}>Proveedor (Origen de Carga)</Text>
              <Menu
                visible={menuProveedorVisible}
                onDismiss={() => setMenuProveedorVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuProveedorVisible(true)}
                    icon="domain"
                    contentStyle={{ justifyContent: 'flex-start', paddingVertical: 8 }}
                    style={{ backgroundColor: '#fff' }}
                    textColor={proveedorSeleccionado ? theme.colors.primary : '#555'}
                  >
                    {proveedorSeleccionado ? (proveedorSeleccionado as any).nombre_empresa : 'Seleccionar Proveedor...'}
                  </Button>
                }
              >
                {proveedores.map((prov: any) => (
                  <Menu.Item
                    key={prov.id}
                    onPress={() => { setIdProveedor(prov.id); setMenuProveedorVisible(false); }}
                    title={prov.nombre_empresa}
                  />
                ))}
                {proveedores.length === 0 && (
                  <Menu.Item title="No hay proveedores activos" disabled />
                )}
              </Menu>
            </View>
          )}

          {/* Notas */}
          <TextInput
            mode="outlined"
            label="Notas del Viaje (Opcional)"
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
          style={globalStyles.saveButton}
          contentStyle={globalStyles.saveButtonContent}
          disabled={isBotonDeshabilitado}
          loading={isSaving}
        >
          Iniciar Viaje
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  
  
  formContainer: { padding: 24, paddingBottom: 40 },
  label: { marginBottom: 10, fontWeight: 'bold', color: '#1f2937' },
  segmented: { marginBottom: 24 },
  section: { marginBottom: 24 },
  input: { marginBottom: 16 },
  
  
  
  chip: { marginBottom: 8, alignSelf: 'flex-start' },
  emptyText: { color: '#9ca3af', fontStyle: 'italic', marginTop: 4 },
  paradasOrden: { marginBottom: 8 },
  paradaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4 },
  ordenBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  ordenText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {
  Text, Button, Appbar, useTheme, Divider, Menu,
  IconButton, TextInput, SegmentedButtons, HelperText,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { NumericInput } from '@ui/NumericInput';
import { DatePickerInput } from '@ui/DatePickerInput';
import { CustomCard } from '@ui/CustomCard';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ItemFormulario } from '../types/pedidos.types';

export function NuevoPedidoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  // --- Estado del formulario principal ---
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [menuClienteVisible, setMenuClienteVisible] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [tasaCambio, setTasaCambio] = useState('');
  const [fetchingTasa, setFetchingTasa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Estado del constructor de items ---
  const [tipoItem, setTipoItem] = useState<'papel' | 'pote'>('papel');
  const [idProductoSel, setIdProductoSel] = useState<string | null>(null);
  const [menuProductoVisible, setMenuProductoVisible] = useState(false);
  const [idPoteSel, setIdPoteSel] = useState<string | null>(null);
  const [menuPoteVisible, setMenuPoteVisible] = useState(false);
  const [cantidadItem, setCantidadItem] = useState(0);
  const [precioItem, setPrecioItem] = useState('');

  // --- Lista de items del pedido ---
  const [items, setItems] = useState<ItemFormulario[]>([]);

  // --- Queries PowerSync ---
  const { data: clientes = [] } = useQuery(
    'SELECT id, razon_social FROM clientes WHERE estado = ? ORDER BY razon_social ASC',
    ['activo']
  );
  const { data: productos = [] } = useQuery(
    'SELECT id, nombre, peso_nominal_g FROM productos_presentacion WHERE estado = ? ORDER BY peso_nominal_g ASC',
    ['activo']
  );
  const { data: potes = [] } = useQuery(
    'SELECT id, capacidad FROM inventario_potes WHERE estado = ? ORDER BY capacidad ASC',
    ['activo']
  );

  // --- Fetch tasa de cambio al montar ---
  const fetchTasa = useCallback(async () => {
    setFetchingTasa(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].promedio) {
        setTasaCambio(parseFloat(data[0].promedio).toFixed(2));
      }
    } catch (e) {
      console.warn('No se pudo obtener la tasa de cambio:', e);
      Toast.show({ type: 'info', text1: 'Sin tasa automática', text2: 'Ingresa la tasa manualmente.' });
    } finally {
      setFetchingTasa(false);
    }
  }, []);

  useEffect(() => {
    fetchTasa();
  }, [fetchTasa]);

  // --- Helpers ---
  const clienteSeleccionado = clientes.find((c: any) => c.id === idCliente);
  const productoSel = productos.find((p: any) => p.id === idProductoSel);
  const poteSel = potes.find((p: any) => p.id === idPoteSel);

  const handleAgregarItem = () => {
    if (cantidadItem <= 0) {
      Toast.show({ type: 'error', text1: 'Cantidad inválida', text2: 'Ingresa al menos 1 unidad.' });
      return;
    }
    const precio = parseFloat(precioItem);
    if (isNaN(precio) || precio < 0) {
      Toast.show({ type: 'error', text1: 'Precio inválido', text2: 'Ingresa un precio en USD válido.' });
      return;
    }
    if (tipoItem === 'papel' && !idProductoSel) {
      Toast.show({ type: 'error', text1: 'Presentación requerida', text2: 'Selecciona una presentación de papel.' });
      return;
    }
    if (tipoItem === 'pote' && !idPoteSel) {
      Toast.show({ type: 'error', text1: 'Pote requerido', text2: 'Selecciona un tipo de pote.' });
      return;
    }

    const nombre = tipoItem === 'papel'
      ? `${productoSel?.nombre || 'Presentación'}`
      : `Pote ${poteSel?.capacidad || ''}`;

    setItems(prev => [...prev, {
      key: uuidv4(),
      tipo: tipoItem,
      id_referencia: tipoItem === 'papel' ? idProductoSel! : idPoteSel!,
      nombre_display: nombre,
      cantidad: cantidadItem,
      precio_unitario: precio,
    }]);

    // Reset item form
    setCantidadItem(0);
    setPrecioItem('');
  };

  const handleRemoverItem = (key: string) => {
    setItems(prev => prev.filter(i => i.key !== key));
  };

  const montoTotal = items.reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0);

  const handleGuardar = async () => {
    if (!idCliente) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Selecciona un cliente.' });
      return;
    }
    if (!fechaEntrega) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Selecciona una fecha de entrega.' });
      return;
    }
    if (items.length === 0) {
      Toast.show({ type: 'error', text1: 'Sin productos', text2: 'Agrega al menos un producto al pedido.' });
      return;
    }
    const tasa = parseFloat(tasaCambio);
    if (isNaN(tasa) || tasa <= 0) {
      Toast.show({ type: 'error', text1: 'Tasa de cambio inválida', text2: 'Ingresa la tasa VES/USD actual.' });
      return;
    }

    setIsSaving(true);
    try {
      const newId = uuidv4();
      const now = new Date().toISOString();

      // Calcular fecha de vencimiento de crédito: fecha de entrega + 30 días
      const fechaEntregaDate = new Date(fechaEntrega);
      fechaEntregaDate.setDate(fechaEntregaDate.getDate() + 30);
      const fechaVencimiento = fechaEntregaDate.toISOString().split('T')[0];

      await powerSync.execute(
        `INSERT INTO pedidos (id, id_cliente, fecha_creacion, fecha_entrega_estimada, estado, estado_pago, monto_total, tasa_cambio_creacion, fecha_vencimiento_credito)
         VALUES (?, ?, ?, ?, 'pendiente', 'pendiente', ?, ?, ?)`,
        [newId, idCliente, now, fechaEntrega, montoTotal, tasa, fechaVencimiento]
      );

      for (const item of items) {
        await powerSync.execute(
          `INSERT INTO detalles_pedido (id, id_pedido, id_producto, id_pote, cantidad_solicitada, precio_unitario)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(), newId,
            item.tipo === 'papel' ? item.id_referencia : null,
            item.tipo === 'pote' ? item.id_referencia : null,
            item.cantidad, item.precio_unitario,
          ]
        );
      }

      Toast.show({ type: 'success', text1: 'Pedido Registrado', text2: `Monto total: $${montoTotal.toFixed(2)} USD` });
      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error('Error guardando pedido:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema al registrar el pedido.' });
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !!idCliente && !!fechaEntrega && items.length > 0 && !isSaving;

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={isSaving} />
        <Appbar.Content title="Nuevo Pedido" subtitle="Crédito a 30 días" />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* SECCIÓN 1: Cliente y Entrega */}
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>1. Cliente y Fecha de Entrega</Text>

              {/* Selector de cliente */}
              <Menu
                visible={menuClienteVisible}
                onDismiss={() => setMenuClienteVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuClienteVisible(true)}
                    icon="account"
                    contentStyle={{ justifyContent: 'flex-start' }}
                    style={styles.menuBtn}
                    textColor={clienteSeleccionado ? theme.colors.primary : '#555'}
                  >
                    {(clienteSeleccionado as any)?.razon_social ?? 'Seleccionar Cliente...'}
                  </Button>
                }
              >
                {(clientes as any[]).map((c) => (
                  <Menu.Item key={c.id} onPress={() => { setIdCliente(c.id); setMenuClienteVisible(false); }} title={c.razon_social} />
                ))}
                {clientes.length === 0 && <Menu.Item title="No hay clientes activos" disabled />}
              </Menu>

              {!idCliente && (
                <Button mode="text" icon="plus" compact style={{ marginTop: 4, alignSelf: 'flex-start' }} onPress={() => router.push('/(screens)/registrar-cliente')}>
                  Registrar Nuevo Cliente
                </Button>
              )}

              <View style={{ marginTop: 16 }}>
                <DatePickerInput label="Fecha de Entrega Estimada" value={fechaEntrega} onChange={setFechaEntrega} />
              </View>
            </View>
          </CustomCard>

          {/* SECCIÓN 2: Tasa de Cambio */}
          <CustomCard>
            <View style={styles.cardContent}>
              <View style={styles.rowBetween}>
                <Text variant="titleMedium" style={styles.sectionTitle}>2. Tasa de Cambio (VES/USD)</Text>
                <TouchableOpacity onPress={fetchTasa} disabled={fetchingTasa} style={styles.refreshBtn}>
                  {fetchingTasa
                    ? <ActivityIndicator size={18} color={theme.colors.primary} />
                    : <MaterialCommunityIcons name="refresh" size={22} color={theme.colors.primary} />
                  }
                </TouchableOpacity>
              </View>
              <TextInput
                mode="outlined"
                label="Bs. por 1 USD"
                value={tasaCambio}
                onChangeText={setTasaCambio}
                keyboardType="numeric"
                left={<TextInput.Icon icon="currency-usd" />}
                style={styles.input}
              />
              <HelperText type="info">
                Tasa obtenida automáticamente de DolarAPI. Puedes editarla si es necesario.
              </HelperText>
            </View>
          </CustomCard>

          {/* SECCIÓN 3: Constructor de Productos */}
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>3. Añadir Productos</Text>

              <SegmentedButtons
                value={tipoItem}
                onValueChange={(v) => {
                  setTipoItem(v as 'papel' | 'pote');
                  setIdProductoSel(null);
                  setIdPoteSel(null);
                }}
                buttons={[
                  { value: 'papel', label: 'Rollos de Papel', icon: 'package-variant' },
                  { value: 'pote', label: 'Potes', icon: 'cup' },
                ]}
                style={{ marginBottom: 16 }}
              />

              {/* Selector de Presentación / Pote */}
              {tipoItem === 'papel' ? (
                <Menu
                  visible={menuProductoVisible}
                  onDismiss={() => setMenuProductoVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setMenuProductoVisible(true)}
                      icon="package-variant-closed"
                      contentStyle={{ justifyContent: 'flex-start' }}
                      style={styles.menuBtn}
                      textColor={productoSel ? theme.colors.primary : '#555'}
                    >
                      {(productoSel as any)?.nombre ?? 'Seleccionar Presentación...'}
                    </Button>
                  }
                >
                  {(productos as any[]).map(p => (
                    <Menu.Item key={p.id} onPress={() => { setIdProductoSel(p.id); setMenuProductoVisible(false); }} title={p.nombre} />
                  ))}
                  {productos.length === 0 && <Menu.Item title="No hay presentaciones activas" disabled />}
                </Menu>
              ) : (
                <Menu
                  visible={menuPoteVisible}
                  onDismiss={() => setMenuPoteVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setMenuPoteVisible(true)}
                      icon="cup"
                      contentStyle={{ justifyContent: 'flex-start' }}
                      style={styles.menuBtn}
                      textColor={poteSel ? theme.colors.primary : '#555'}
                    >
                      {(poteSel as any)?.capacidad ? `Pote ${(poteSel as any).capacidad}` : 'Seleccionar Pote...'}
                    </Button>
                  }
                >
                  {(potes as any[]).map(p => (
                    <Menu.Item key={p.id} onPress={() => { setIdPoteSel(p.id); setMenuPoteVisible(false); }} title={`Pote ${p.capacidad}`} />
                  ))}
                  {potes.length === 0 && <Menu.Item title="No hay potes activos" disabled />}
                </Menu>
              )}

              {/* Cantidad y Precio */}
              <View style={styles.rowBetween}>
                <Text variant="bodyMedium" style={{ color: '#555', marginTop: 16 }}>Cantidad</Text>
                <NumericInput value={cantidadItem} onChange={setCantidadItem} min={0} max={9999} />
              </View>

              <TextInput
                mode="outlined"
                label="Precio Unitario (USD)"
                value={precioItem}
                onChangeText={setPrecioItem}
                keyboardType="decimal-pad"
                left={<TextInput.Icon icon="currency-usd" />}
                style={[styles.input, { marginTop: 8 }]}
              />

              <Button
                mode="contained-tonal"
                icon="plus"
                onPress={handleAgregarItem}
                style={{ marginTop: 12, borderRadius: 10 }}
                disabled={cantidadItem === 0}
              >
                Añadir al Pedido
              </Button>
            </View>
          </CustomCard>

          {/* SECCIÓN 4: Resumen */}
          {items.length > 0 && (
            <CustomCard>
              <View style={styles.cardContent}>
                <Text variant="titleMedium" style={styles.sectionTitle}>4. Resumen del Pedido</Text>
                {items.map(item => (
                  <View key={item.key} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.nombre_display}</Text>
                      <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                        {item.cantidad} un. × ${item.precio_unitario.toFixed(2)} = ${(item.cantidad * item.precio_unitario).toFixed(2)}
                      </Text>
                    </View>
                    <IconButton
                      icon="close-circle-outline"
                      iconColor={theme.colors.error}
                      size={20}
                      onPress={() => handleRemoverItem(item.key)}
                      style={{ margin: 0 }}
                    />
                  </View>
                ))}
                <Divider style={{ marginVertical: 12 }} />
                <View style={styles.rowBetween}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>Total del Pedido</Text>
                  <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    ${montoTotal.toFixed(2)} USD
                  </Text>
                </View>
                {tasaCambio && !isNaN(parseFloat(tasaCambio)) && (
                  <Text variant="bodySmall" style={{ color: '#9ca3af', textAlign: 'right', marginTop: 2 }}>
                    ≈ Bs. {(montoTotal * parseFloat(tasaCambio)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </Text>
                )}

                <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryContainer, marginTop: 16 }]}>
                  <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 6, flex: 1 }}>
                    Fecha de vencimiento de crédito: 30 días después de la entrega.
                  </Text>
                </View>
              </View>
            </CustomCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleGuardar}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          disabled={!canSave}
          loading={isSaving}
        >
          Guardar Pedido
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1 },
  scrollContent: { padding: 8, paddingBottom: 32, gap: 8 },
  cardContent: { padding: 16 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12, color: '#1f2937' },
  menuBtn: { marginBottom: 4 },
  input: { marginBottom: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { padding: 6 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10 },
  footer: { padding: 16, paddingBottom: 24, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  saveButton: { borderRadius: 12 },
  saveButtonContent: { paddingVertical: 12 },
});

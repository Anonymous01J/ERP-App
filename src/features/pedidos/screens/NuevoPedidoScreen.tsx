import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {
  Text, Button, Appbar, useTheme, Divider, Menu,
  IconButton, TextInput, SegmentedButtons, HelperText,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePowerSync, useQuery } from '@powersync/react';
import { NumericInput } from '@ui/NumericInput';
import { DatePickerInput } from '@ui/DatePickerInput';
import { CustomCard } from '@ui/CustomCard';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyInput } from '@components/ui/CurrencyInput';
import { parseCurrency, formatCurrencyATM } from '@core/utils/currency';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ItemFormulario } from '../types/pedidos.types';
import { getTasaDolarBCV, getTasaEuroBCV } from '@core/api/dolar';

export function NuevoPedidoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  // --- Estado del formulario principal ---
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [menuClienteVisible, setMenuClienteVisible] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [tasaCambio, setTasaCambio] = useState('');
  const [tipoTasa, setTipoTasa] = useState<'dolar' | 'euro' | 'efectivo'>('dolar');
  const [valorDolar, setValorDolar] = useState('');
  const [valorEuro, setValorEuro] = useState('');
  const [fetchingTasa, setFetchingTasa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Estado del constructor de items ---
  const [tipoItem, setTipoItem] = useState<'papel' | 'producto_reventa'>('papel');
  const [idProductoSel, setIdProductoSel] = useState<string | null>(null);
  const [menuProductoVisible, setMenuProductoVisible] = useState(false);
  const [idProductoReventaSel, setIdProductoReventaSel] = useState<string | null>(null);
  const [menuProductoReventaVisible, setMenuProductoReventaVisible] = useState(false);
  const [idTipoPapelSel, setIdTipoPapelSel] = useState<string | null>(null);
  const [menuTipoPapelVisible, setMenuTipoPapelVisible] = useState(false);
  const [cantidadItem, setCantidadItem] = useState(0);
  const [precioItem, setPrecioItem] = useState('');

  // --- Lista de items del pedido ---
  const [items, setItems] = useState<ItemFormulario[]>([]);

  // --- Queries PowerSync ---
  const { data: clientes = [] } = useQuery(
    'SELECT id, razon_social FROM clientes WHERE estado = ? ORDER BY razon_social ASC',
    ['activo']
  );

  const prevClientesIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Autoseleccionar cliente recién creado (si detectamos un ID nuevo en la lista)
    if (clientes.length > 0 && prevClientesIdsRef.current.size > 0) {
      const newClients = clientes.filter(c => !prevClientesIdsRef.current.has(c.id));
      if (newClients.length === 1) {
        setIdCliente(newClients[0].id);
        Toast.show({ type: 'success', text1: 'Cliente seleccionado', text2: `${newClients[0].razon_social} ha sido seleccionado.` });
      }
    }
    prevClientesIdsRef.current = new Set(clientes.map(c => c.id));
  }, [clientes]);
  const { data: productos = [] } = useQuery(
    'SELECT id, nombre, peso_nominal_g, rollos_por_paquete, precio_USD FROM productos_presentacion WHERE estado = ? ORDER BY peso_nominal_g ASC',
    ['activo']
  );
  const { data: productosReventa = [] } = useQuery(
    'SELECT id, nombre_producto, precio_venta_usd FROM productos_reventa WHERE estado = ? ORDER BY nombre_producto ASC',
    ['activo']
  );
  const { data: tiposPapel = [] } = useQuery(
    'SELECT id, nombre FROM tipos_papel WHERE estado = ? ORDER BY nombre ASC',
    ['activo']
  );

  // --- Fetch tasa de cambio al montar ---
  const fetchTasa = useCallback(async () => {
    setFetchingTasa(true);
    try {
      const [dolarPromedio, euroPromedio] = await Promise.all([
        getTasaDolarBCV(),
        getTasaEuroBCV()
      ]);
      const dVal = formatCurrencyATM(dolarPromedio.toFixed(2));
      setValorDolar(dVal);
      setValorEuro(formatCurrencyATM(euroPromedio.toFixed(2)));
      if (tipoTasa === 'dolar') setTasaCambio(dVal);
    } catch (e) {
      console.warn('No se pudo obtener la tasa de cambio:', e);
      Toast.show({ type: 'info', text1: 'Sin tasa automática', text2: 'Ingresa la tasa manualmente.' });
    } finally {
      setFetchingTasa(false);
    }
  }, [tipoTasa]);

  useEffect(() => { fetchTasa(); }, [fetchTasa]);

  useEffect(() => {
    if (tipoTasa === 'dolar') setTasaCambio(valorDolar);
    else if (tipoTasa === 'euro') setTasaCambio(valorEuro);
    else setTasaCambio('');
  }, [tipoTasa, valorDolar, valorEuro]);

  // --- Helpers ---
  const clienteSeleccionado = (clientes as any[]).find(c => c.id === idCliente);
  const productoSel = (productos as any[]).find(p => p.id === idProductoSel);
  const productoReventaSel = (productosReventa as any[]).find(p => p.id === idProductoReventaSel);
  const tipoPapelSel = (tiposPapel as any[]).find(t => t.id === idTipoPapelSel);

  const handleAgregarItem = () => {
    if (cantidadItem <= 0) {
      Toast.show({ type: 'error', text1: 'Cantidad inválida', text2: 'Ingresa al menos 1 unidad.' });
      return;
    }
    const precio = parseCurrency(precioItem);
    if (isNaN(precio) || precio < 0) {
      Toast.show({ type: 'error', text1: 'Precio inválido', text2: 'Ingresa un precio en USD válido.' });
      return;
    }
    if (tipoItem === 'papel' && !idProductoSel) {
      Toast.show({ type: 'error', text1: 'Presentación requerida', text2: 'Selecciona una presentación de papel.' });
      return;
    }
    if (tipoItem === 'papel' && !idTipoPapelSel) {
      Toast.show({ type: 'error', text1: 'Tipo de papel requerido', text2: 'Selecciona el tipo de papel (A, B, etc.).' });
      return;
    }
    if (tipoItem === 'producto_reventa' && !idProductoReventaSel) {
      Toast.show({ type: 'error', text1: 'Producto requerido', text2: 'Selecciona un producto de reventa.' });
      return;
    }

    const nombre = tipoItem === 'papel'
      ? `${productoSel?.nombre || 'Presentación'} (${tipoPapelSel?.nombre ?? 'Tipo ?'})`
      : `${productoReventaSel?.nombre_producto || ''}`;

    setItems(prev => [...prev, {
      key: uuidv4(),
      tipo: tipoItem,
      id_referencia: tipoItem === 'papel' ? idProductoSel! : idProductoReventaSel!,
      id_tipo_papel: tipoItem === 'papel' ? idTipoPapelSel : null,
      nombre_display: nombre,
      cantidad: cantidadItem,
      precio_unitario: precio,
    }]);

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
    const tasa = parseCurrency(tasaCambio);
    if (isNaN(tasa) || tasa <= 0) {
      Toast.show({ type: 'error', text1: 'Tasa de cambio inválida', text2: 'Ingresa la tasa VES/USD actual.' });
      return;
    }

    setIsSaving(true);
    try {
      const newId = uuidv4();
      const now = new Date().toISOString();

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
          `INSERT INTO detalles_pedido (id, id_pedido, id_producto, id_producto_reventa, id_tipo_papel, cantidad_solicitada, precio_unitario)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(), newId,
            item.tipo === 'papel' ? item.id_referencia : null,
            item.tipo === 'producto_reventa' ? item.id_referencia : null,
            item.id_tipo_papel,
            item.cantidad, item.precio_unitario,
          ]
        );

        if (item.tipo === 'producto_reventa') {
          await powerSync.execute(
            `INSERT INTO historial_productos (id, id_producto, cantidad, tipo, origen, referencia_id, entidad_relacionada, fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(), 
              item.id_referencia, 
              item.cantidad, 
              'salida', 
              'venta_pedido', 
              newId, 
              clienteSeleccionado?.razon_social || 'Cliente', 
              now
            ]
          );
        }
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
    <View style={globalStyles.containerWhite}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={isSaving} />
        <Appbar.Content title="Nuevo Pedido" subtitle="Crédito a 30 días" />
      </Appbar.Header>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={globalStyles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* SECCIÓN 1: Cliente y Entrega */}
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>1. Cliente y Fecha de Entrega</Text>

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
                    {clienteSeleccionado?.razon_social ?? 'Seleccionar Cliente...'}
                  </Button>
                }
              >
                {(clientes as any[]).map(c => (
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
                <Text variant="titleMedium" style={globalStyles.sectionTitle}>2. Tasa de Cambio (Referencia)</Text>
                <TouchableOpacity onPress={fetchTasa} disabled={fetchingTasa} style={styles.refreshBtn}>
                  {fetchingTasa
                    ? <ActivityIndicator size={18} color={theme.colors.primary} />
                    : <MaterialCommunityIcons name="refresh" size={22} color={theme.colors.primary} />
                  }
                </TouchableOpacity>
              </View>

              <SegmentedButtons
                value={tipoTasa}
                onValueChange={v => setTipoTasa(v as 'dolar' | 'euro' | 'efectivo')}
                buttons={[
                  { value: 'dolar', label: 'BCV ($)', icon: 'currency-usd' },
                  { value: 'euro', label: 'BCV (€)', icon: 'currency-eur' },
                  { value: 'efectivo', label: 'Efectivo', icon: 'cash' },
                ]}
                style={{ marginBottom: 12 }}
              />

              <CurrencyInput
                mode="outlined"
                label={tipoTasa === 'euro' ? 'Bs. por 1 EUR' : 'Bs. por 1 USD'}
                value={tasaCambio}
                onChangeText={setTasaCambio}
                keyboardType="numeric"
                left={<TextInput.Icon icon={tipoTasa === 'euro' ? 'currency-eur' : 'currency-usd'} />}
                style={styles.input}
              />
              <HelperText type="info">
                {tipoTasa === 'efectivo'
                  ? 'Ingresa la tasa de divisa en efectivo manualmente.'
                  : 'Tasa obtenida de DolarAPI. Puedes editarla de ser necesario.'}
              </HelperText>
            </View>
          </CustomCard>

          {/* SECCIÓN 3: Constructor de Productos */}
          <CustomCard>
            <View style={styles.cardContent}>
              <Text variant="titleMedium" style={globalStyles.sectionTitle}>3. Añadir Productos</Text>

              <SegmentedButtons
                value={tipoItem}
                onValueChange={v => {
                  setTipoItem(v as 'papel' | 'producto_reventa');
                  setIdProductoSel(null);
                  setIdProductoReventaSel(null);
                  setIdTipoPapelSel(null);
                  setCantidadItem(0);
                  setPrecioItem('');
                }}
                buttons={[
                  { value: 'papel', label: 'Rollos de Papel', icon: 'package-variant' },
                  { value: 'producto_reventa', label: 'Otros', icon: 'shape-outline' },
                ]}
                style={{ marginBottom: 16 }}
              />

              {tipoItem === 'papel' ? (
                <>
                  {/* Selector de Presentación */}
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
                        {productoSel?.nombre ?? 'Seleccionar Presentación...'}
                      </Button>
                    }
                  >
                    {(productos as any[]).map(p => (
                      <Menu.Item
                        key={p.id}
                        onPress={() => {
                          setIdProductoSel(p.id);
                          setPrecioItem(p.precio_USD ? formatCurrencyATM(Number(p.precio_USD).toFixed(2)) : '');
                          setMenuProductoVisible(false);
                        }}
                        title={p.nombre}
                      />
                    ))}
                    {productos.length === 0 && <Menu.Item title="No hay presentaciones activas" disabled />}
                  </Menu>

                  {/* Selector de Tipo de Papel */}
                  <Menu
                    visible={menuTipoPapelVisible}
                    onDismiss={() => setMenuTipoPapelVisible(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setMenuTipoPapelVisible(true)}
                        icon="label-variant"
                        contentStyle={{ justifyContent: 'flex-start' }}
                        style={[styles.menuBtn, { marginTop: 8 }]}
                        textColor={tipoPapelSel ? theme.colors.primary : '#555'}
                      >
                        {tipoPapelSel?.nombre ?? 'Seleccionar Tipo de Papel...'}
                      </Button>
                    }
                  >
                    {(tiposPapel as any[]).map(t => (
                      <Menu.Item
                        key={t.id}
                        onPress={() => {
                          setIdTipoPapelSel(t.id);
                          setMenuTipoPapelVisible(false);
                        }}
                        title={t.nombre}
                      />
                    ))}
                    {tiposPapel.length === 0 && <Menu.Item title="No hay tipos de papel activos" disabled />}
                  </Menu>
                </>
              ) : (
                /* Selector de Producto de Reventa */
                <Menu
                  visible={menuProductoReventaVisible}
                  onDismiss={() => setMenuProductoReventaVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setMenuProductoReventaVisible(true)}
                      icon="shape-outline"
                      contentStyle={{ justifyContent: 'flex-start' }}
                      style={styles.menuBtn}
                      textColor={productoReventaSel ? theme.colors.primary : '#555'}
                    >
                      {productoReventaSel?.nombre_producto ? `${productoReventaSel.nombre_producto}` : 'Seleccionar Producto...'}
                    </Button>
                  }
                >
                  {(productosReventa as any[]).map(p => (
                    <Menu.Item
                      key={p.id}
                      onPress={() => {
                        setIdProductoReventaSel(p.id);
                        setPrecioItem(p.precio_venta_usd ? formatCurrencyATM(Number(p.precio_venta_usd).toFixed(2)) : '');
                        setMenuProductoReventaVisible(false);
                      }}
                      title={`${p.nombre_producto}`}
                    />
                  ))}
                  {productosReventa.length === 0 && <Menu.Item title="No hay productos activos" disabled />}
                </Menu>
              )}

              {/* Cantidad y Precio */}
              <View style={[styles.rowBetween, { marginTop: 16 }]}>
                <Text variant="bodyMedium" style={{ color: '#555', flex: 1, paddingRight: 8 }}>
                  {tipoItem === 'papel' ? 'Cantidad de Rollos (Unidades)' : 'Cantidad (Unidades)'}
                </Text>
                <NumericInput value={cantidadItem} onChange={setCantidadItem} min={0} max={9999} />
              </View>

              {tipoItem === 'papel' && productoSel && cantidadItem > 0 && (
                <HelperText type="info" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  {(() => {
                    const rpx = productoSel.rollos_por_paquete || 1;
                    const paqs = Math.floor(cantidadItem / rpx);
                    const sueltos = cantidadItem % rpx;
                    return `📦 Equivale a: ${paqs} paq. completos (${rpx} un/paq)${sueltos > 0 ? ` + ${sueltos} rollos sueltos` : ''}`;
                  })()}
                </HelperText>
              )}

              <CurrencyInput
                mode="outlined"
                label={tipoItem === 'papel' ? 'Precio x Rollo (USD)' : 'Precio Unitario (USD)'}
                value={precioItem}
                onChangeText={setPrecioItem}
                keyboardType="numeric"
                left={<TextInput.Icon icon="currency-usd" />}
                style={[styles.input, { marginTop: 8 }]}
              />

              {(() => {
                const p = parseCurrency(precioItem);
                if (cantidadItem > 0 && !isNaN(p) && p > 0) {
                  return (
                    <Text variant="titleMedium" style={{ textAlign: 'right', marginTop: 12, color: theme.colors.primary, fontWeight: 'bold' }}>
                      Subtotal: ${(cantidadItem * p).toFixed(2)} USD
                    </Text>
                  );
                }
                return null;
              })()}

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
                <Text variant="titleMedium" style={globalStyles.sectionTitle}>4. Resumen del Pedido</Text>
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
                <Divider style={{ marginBottom: 12 }} />
                <View style={styles.rowBetween}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>Total del Pedido</Text>
                  <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    ${montoTotal.toFixed(2)} USD
                  </Text>
                </View>
                {tasaCambio && !isNaN(parseCurrency(tasaCambio)) && parseCurrency(tasaCambio) > 0 && (
                  <Text variant="bodySmall" style={{ color: '#9ca3af', textAlign: 'right', marginTop: 2 }}>
                    ≈ Bs. {(montoTotal * parseCurrency(tasaCambio)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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

          {/* RESUMEN GLOBAL DE PEDIDO (TIPO CARGA DE MERCANCÍA) */}
          {items.length > 0 && (
            <View style={{ padding: 16, backgroundColor: '#f0fdf4', borderTopWidth: 1, borderColor: '#dcfce3', marginTop: 16 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#166534' }}>
                Resumen Global de Pedido
              </Text>

              {/* Desglose por Tipo de Papel (Solo para ítems de papel) */}
              {(() => {
                const itemsPapel = items.filter(i => i.tipo === 'papel');
                if (itemsPapel.length === 0) return null;
                
                const desglose = itemsPapel.reduce((acc, item) => {
                  const tipoPapelNombre = (tiposPapel as any[]).find(t => t.id === item.id_tipo_papel)?.nombre || 'Desconocido';
                  const presentacion = (productos as any[]).find(p => p.id === item.id_referencia);
                  const kilosPorPaquete = presentacion ? ((presentacion.peso_nominal_g * presentacion.rollos_por_paquete) / 1000) : 0;
                  const kilosTotales = item.cantidad * kilosPorPaquete;
                  
                  if (!acc[tipoPapelNombre]) acc[tipoPapelNombre] = { paquetes: 0, kilos: 0 };
                  acc[tipoPapelNombre].paquetes += item.cantidad;
                  acc[tipoPapelNombre].kilos += kilosTotales;
                  return acc;
                }, {} as Record<string, { paquetes: number, kilos: number }>);

                return (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#15803d', fontWeight: '600', marginBottom: 4 }}>Producción Estimada:</Text>
                    {Object.entries(desglose).map(([nombre, datos]) => (
                      <Text key={nombre} style={{ color: '#166534', fontSize: 13, fontStyle: 'italic', marginBottom: 2 }}>
                        • {datos.kilos.toFixed(1)} kg ({datos.paquetes} paquetes) - Papel {nombre}
                      </Text>
                    ))}
                  </View>
                );
              })()}

              {/* Desglose de Otros Productos */}
              {(() => {
                const itemsOtros = items.filter(i => i.tipo === 'producto_reventa');
                if (itemsOtros.length === 0) return null;
                
                const desglose = itemsOtros.reduce((acc, item) => {
                  const nombreLimpio = item.nombre_display;
                  if (!acc[nombreLimpio]) acc[nombreLimpio] = 0;
                  acc[nombreLimpio] += item.cantidad;
                  return acc;
                }, {} as Record<string, number>);

                return (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#15803d', fontWeight: '600', marginBottom: 4 }}>Otros Productos:</Text>
                    {Object.entries(desglose).map(([nombre, cantidad]) => (
                      <Text key={nombre} style={{ color: '#166534', fontSize: 13, fontStyle: 'italic', marginBottom: 2 }}>
                        • {cantidad} un. - {nombre}
                      </Text>
                    ))}
                  </View>
                );
              })()}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[globalStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          mode="contained"
          onPress={handleGuardar}
          style={globalStyles.saveButton}
          contentStyle={globalStyles.saveButtonContent}
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
  cardContent: { padding: 16 },
  menuBtn: { marginBottom: 4 },
  input: { marginBottom: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { padding: 6 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10 },
});

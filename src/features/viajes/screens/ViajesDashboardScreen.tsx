import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import {  View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform , RefreshControl } from 'react-native';
import { List, Text, Button, useTheme, Chip, IconButton, TextInput, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyInput } from '@components/ui/CurrencyInput';
import { parseCurrency } from '@core/utils/currency';

// Categorías disponibles con íconos
const CATEGORIAS = [
  { key: 'gasolina',      label: 'Gasolina',      icon: 'gas-station' },
  { key: 'peaje',         label: 'Peaje',          icon: 'road' },
  { key: 'viaticos',      label: 'Viáticos',       icon: 'food' },
  { key: 'mantenimiento', label: 'Mant.',          icon: 'wrench' },
  { key: 'operativos',    label: 'Operativos',     icon: 'briefcase-outline' },
  { key: 'otros',         label: 'Otros',          icon: 'dots-horizontal' },
] as const;

type Categoria = typeof CATEGORIAS[number]['key'];

// Subcomponente: Lista de movimientos de un viaje
const MovimientosViaje = ({ idViaje, theme }: { idViaje: string; theme: any }) => {
  const { data: movimientos = [] } = useQuery(
    `SELECT * FROM movimientos WHERE id_viaje = ? ORDER BY fecha DESC`,
    [idViaje]
  );

  if ((movimientos as any[]).length === 0) return null;

  const totalEgresos = (movimientos as any[]).filter(m => m.tipo === 'egreso').reduce((a, m) => a + (m.monto || 0), 0);
  const totalIngresos = (movimientos as any[]).filter(m => m.tipo === 'ingreso').reduce((a, m) => a + (m.monto || 0), 0);

  return (
    <View style={styles.movimientosContainer}>
      {/* Resumen */}
      <View style={styles.movResumen}>
        <View style={styles.movResumenItem}>
          <Text variant="labelSmall" style={{ color: '#9ca3af' }}>EGRESOS</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.error, fontWeight: 'bold' }}>
            −{totalEgresos.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.movResumenItem, { alignItems: 'center' }]}> 
          <Text variant="labelSmall" style={{ color: '#9ca3af' }}>BALANCE</Text>
          <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: (totalIngresos - totalEgresos) >= 0 ? '#16a34a' : theme.colors.error }}>
            {(totalIngresos - totalEgresos) >= 0 ? '+' : ''}{(totalIngresos - totalEgresos).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.movResumenItem, { alignItems: 'flex-end' }]}>
          <Text variant="labelSmall" style={{ color: '#9ca3af' }}>INGRESOS</Text>
          <Text variant="bodyMedium" style={{ color: '#16a34a', fontWeight: 'bold' }}>
            +{totalIngresos.toFixed(2)}
          </Text>
        </View>
      </View>

      <Divider style={{ marginBottom: 8 }} />

      {(movimientos as any[]).map((mov: any) => {
        const cat = CATEGORIAS.find(c => c.key === mov.categoria);
        const esIngreso = mov.tipo === 'ingreso';
        return (
          <View key={mov.id} style={styles.movRow}>
            <View style={[styles.movIconBox, { backgroundColor: esIngreso ? '#dcfce7' : '#fee2e2' }]}>
              <MaterialCommunityIcons
                name={(cat?.icon ?? 'dots-horizontal') as any}
                size={16}
                color={esIngreso ? '#16a34a' : theme.colors.error}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="bodySmall" style={{ fontWeight: 'bold', color: '#1f2937' }}>
                {mov.descripcion || cat?.label || 'Sin descripción'}
              </Text>
              <Text variant="bodySmall" style={{ color: '#9ca3af' }}>
                {cat?.label} · {mov.moneda}
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: esIngreso ? '#16a34a' : theme.colors.error }}>
              {esIngreso ? '+' : '−'}{mov.monto?.toFixed(2)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// Subcomponente: Formulario de Ingreso/Gasto Rápido
const GastoViajeForm = ({ idViaje, theme }: { idViaje: string; theme: any }) => {
  const powerSync = usePowerSync();
  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');
  const [categoria, setCategoria] = useState<Categoria>('gasolina');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<'VES' | 'USD'>('VES');
  const [saving, setSaving] = useState(false);

  const handleGuardar = async () => {
    const montoNum = parseCurrency(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      Toast.show({ type: 'error', text1: 'Monto inválido', text2: 'Ingresa un monto mayor a 0.' });
      return;
    }
    setSaving(true);
    try {
      const catLabel = CATEGORIAS.find(c => c.key === categoria)?.label || 'Gasto de viaje';
      const descripFinal = descripcion.trim() || catLabel;

      await powerSync.execute(
        `INSERT INTO movimientos (id, descripcion, monto, moneda, tasa_cambio, categoria, fecha, id_viaje, tipo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), descripFinal, montoNum, moneda, 1, categoria, new Date().toISOString(), idViaje, tipo]
      );
      Toast.show({
        type: 'success',
        text1: tipo === 'egreso' ? 'Gasto Registrado' : 'Ingreso Registrado',
        text2: `${montoNum.toFixed(2)} ${moneda} · ${CATEGORIAS.find(c => c.key === categoria)?.label}`,
      });
      setMonto('');
      setDescripcion('');
    } catch (e) {
      console.error('Error guardando movimiento:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo registrar el movimiento.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text variant="labelMedium" style={styles.formSectionLabel}>REGISTRAR MOVIMIENTO</Text>

      {/* Tipo: Egreso / Ingreso */}
      <View style={styles.tipoRow}>
        <TouchableOpacity
          style={[styles.tipoBtn, tipo === 'egreso' && { backgroundColor: theme.colors.error }]}
          onPress={() => setTipo('egreso')}
        >
          <MaterialCommunityIcons name="arrow-up-circle" size={16} color={tipo === 'egreso' ? '#fff' : '#9ca3af'} />
          <Text style={[styles.tipoBtnText, tipo === 'egreso' && { color: '#fff' }]}>Gasto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tipoBtn, tipo === 'ingreso' && { backgroundColor: '#16a34a' }]}
          onPress={() => setTipo('ingreso')}
        >
          <MaterialCommunityIcons name="arrow-down-circle" size={16} color={tipo === 'ingreso' ? '#fff' : '#9ca3af'} />
          <Text style={[styles.tipoBtnText, tipo === 'ingreso' && { color: '#fff' }]}>Ingreso</Text>
        </TouchableOpacity>
      </View>

      {/* Categorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasScroll}>
        {CATEGORIAS.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoriaBtn,
              categoria === cat.key && { backgroundColor: theme.colors.primary },
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

      {/* Monto + Moneda */}
      <View style={styles.montoRow}>
        <CurrencyInput
          mode="outlined"
          label={`Monto en ${moneda}`}
          value={monto}
          onChangeText={setMonto}
          style={[styles.montoInput, { flex: 1 }]}
          left={
            moneda === 'USD' 
              ? <TextInput.Icon icon="currency-usd" /> 
              : <TextInput.Icon icon={() => <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#555' }}>Bs.</Text>} />
          }
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

      {/* Descripción opcional */}
      <TextInput
        mode="outlined"
        label="Descripción (opcional)"
        value={descripcion}
        onChangeText={setDescripcion}
        style={styles.descripcionInput}
        outlineStyle={{ borderRadius: 10 }}
      />

      {/* Botón guardar */}
      <Button
        mode="contained"
        onPress={handleGuardar}
        loading={saving}
        disabled={saving || !monto}
        style={[styles.guardarBtn, { backgroundColor: tipo === 'egreso' ? theme.colors.error : '#16a34a' }]}
        contentStyle={{ paddingVertical: 4 }}
        icon={tipo === 'egreso' ? 'cash-minus' : 'cash-plus'}
      >
        {tipo === 'egreso' ? 'Registrar Gasto' : 'Registrar Ingreso'}
      </Button>
    </View>
  );
};

// Subcomponente: Lista de paradas de un viaje
const ParadasViaje = ({
  idViaje,
  theme,
  powerSync,
}: {
  idViaje: string;
  theme: any;
  powerSync: any;
}) => {
  const { data: paradas = [] } = useQuery(
    `SELECT ev.id, ev.id_pedido, ev.orden, ev.estado, ev.hora_llegada, c.razon_social,
        (
          SELECT GROUP_CONCAT(dp.cantidad_solicitada || 'x ' || COALESCE(pp.nombre, 'Pote ' || ip.capacidad), ', ')
          FROM detalles_pedido dp
          LEFT JOIN productos_presentacion pp ON pp.id = dp.id_producto
          LEFT JOIN inventario_potes ip ON ip.id = dp.id_pote
          WHERE dp.id_pedido = ev.id_pedido
        ) as productos
     FROM entregas_viaje ev
     JOIN pedidos p ON p.id = ev.id_pedido
     JOIN clientes c ON c.id = p.id_cliente
     WHERE ev.id_viaje = ?
     ORDER BY ev.orden ASC`,
    [idViaje]
  );

  const handleMarcarEntregado = async (idParada: string, idPedido: string, razonSocial: string) => {
    try {
      const now = new Date().toISOString();
      await powerSync.execute(
        `UPDATE entregas_viaje SET estado = 'entregado', hora_llegada = ? WHERE id = ?`,
        [now, idParada]
      );
      await powerSync.execute(
        `UPDATE pedidos SET estado = 'entregado' WHERE id = ?`,
        [idPedido]
      );
      Toast.show({ type: 'success', text1: 'Parada Completada', text2: `Entrega a ${razonSocial} registrada.` });
    } catch (error) {
      console.error('Error marcando parada:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar la parada.' });
    }
  };

  if (paradas.length === 0) return null;

  return (
    <View style={styles.paradasContainer}>
      <Text variant="labelMedium" style={styles.paradasHeader}>PARADAS DEL VIAJE</Text>
      {paradas.map((parada: any) => {
        const entregado = parada.estado === 'entregado';
        return (
          <View key={parada.id} style={styles.paradaItem}>
            <View style={[styles.paradaOrden, { backgroundColor: entregado ? '#4ade80' : theme.colors.primaryContainer }]}>
              {entregado
                ? <MaterialCommunityIcons name="check" size={14} color="#fff" />
                : <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold', fontSize: 12 }}>{parada.orden}</Text>
              }
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="bodyMedium" style={{ fontWeight: entregado ? 'normal' : 'bold', color: entregado ? '#9ca3af' : '#1f2937' }}>
                {parada.razon_social}
              </Text>
              {parada.productos ? (
                <Text variant="bodySmall" style={{ color: entregado ? '#9ca3af' : '#6b7280', marginTop: 2 }}>
                  Entregar: {parada.productos}
                </Text>
              ) : null}
              {entregado && parada.hora_llegada && (
                <Text variant="bodySmall" style={{ color: '#9ca3af', marginTop: 2 }}>
                  ✓ Entregado a las {new Date(parada.hora_llegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            {!entregado && (
              <Button
                mode="contained-tonal"
                compact
                onPress={() => handleMarcarEntregado(parada.id, parada.id_pedido, parada.razon_social)}
                style={{ borderRadius: 8 }}
                labelStyle={{ fontSize: 11 }}
              >
                Entregado
              </Button>
            )}
          </View>
        );
      })}
    </View>
  );
};

export function ViajesDashboardScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const { viajeId } = useLocalSearchParams();
  const powerSync = usePowerSync();
  const [filtro, setFiltro] = useState('Todos');

  const filtros = ['Todos', 'Compras (Bobinas)', 'Entregas (Pedidos)'];

  const filterToQuery: Record<string, string> = {
    'Todos': '',
    'Compras (Bobinas)': "AND tipo_viaje IN ('compra', 'mixto')",
    'Entregas (Pedidos)': "AND tipo_viaje IN ('entrega', 'mixto')",
  };

  const { data: viajesActivos = [] } = useQuery(
    `SELECT * FROM viajes WHERE estado != 'completado' ${filterToQuery[filtro]} ORDER BY fecha_viaje_inicio DESC`
  );

  const { data: viajesPasados = [] } = useQuery(
    `SELECT * FROM viajes WHERE estado = 'completado' ${filterToQuery[filtro]} ORDER BY fecha_viaje_inicio DESC`
  );

  const { data: proveedores = [] } = useQuery(`SELECT id, nombre_empresa FROM proveedores`);

  const formatFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Fecha desconocida';
    const date = new Date(fechaStr);
    return date.toLocaleDateString('es-VE') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatearEstadoUi = (estado: string) => {
    switch (estado) {
      case 'en_progreso': return 'En Tránsito (Ida)';
      case 'en_destino': return 'En Destino (Proveedor)';
      case 'retornando': return 'Retornando a Base';
      case 'completado': return 'Completado';
      default: return estado;
    }
  };

  const getViajeIcon = (tipo: string) => {
    if (tipo === 'mixto') return 'swap-vertical';
    if (tipo === 'compra') return 'inbox-arrow-down';
    return 'truck-delivery';
  };

  const getViajeColor = (tipo: string) => {
    if (tipo === 'mixto') return theme.colors.secondary;
    if (tipo === 'compra') return theme.colors.primary;
    return theme.colors.tertiary;
  };

  const getViajeTitle = (viaje: any) => {
    const proveedor = proveedores.find((p: any) => p.id === viaje.id_proveedor);
    const nombreProveedor = proveedor ? (proveedor as any).nombre_empresa : 'Proveedor';
    if (viaje.tipo_viaje === 'mixto') return `Mixto: Entregas + ${nombreProveedor}`;
    if (viaje.tipo_viaje === 'compra') return `Compra: ${nombreProveedor}`;
    return 'Entrega a Clientes';
  };

  // Determina el botón de acción principal dependiendo del tipo y estado del viaje
  const renderAccionPrincipal = (viaje: any, paradasData: any[]) => {
    const tipo = viaje.tipo_viaje;
    const estado = viaje.estado;

    // Viajes de compra: ciclo de estado normal, excepto en_destino que va a CargarBobinas
    if (tipo === 'compra') {
      if (estado === 'en_progreso') {
        return (
          <Button mode="contained" onPress={() => handleAvanzarEstadoSimple(viaje.id, 'en_destino', 'fecha_viaje_llegada_destino')} style={styles.actionButton}>
            Llegué al Proveedor
          </Button>
        );
      }
      if (estado === 'en_destino') {
        return (
          <Button mode="contained" icon="inbox-arrow-down" onPress={() => router.push(`/(screens)/cargar-bobinas-viaje?id=${viaje.id}`)} style={styles.actionButton}>
            Cargar Bobinas y Retornar
          </Button>
        );
      }
      if (estado === 'retornando') {
        return (
          <Button mode="contained" onPress={() => handleAvanzarEstadoSimple(viaje.id, 'completado', 'fecha_viaje_llegada_base')} style={styles.actionButton}>
            Llegué a Base (Fin)
          </Button>
        );
      }
    }

    // Viajes de entrega: depende del estado de las paradas
    if (tipo === 'entrega') {
      const todasEntregadas = paradasData.length > 0 && paradasData.every((p: any) => p.estado === 'entregado');
      if (estado === 'en_progreso' && todasEntregadas) {
        return (
          <Button mode="contained" icon="flag-checkered" onPress={() => handleCerrarViaje(viaje.id)} style={[styles.actionButton, { backgroundColor: '#4ade80' }]}>
            Cerrar Viaje (Todas Entregadas)
          </Button>
        );
      }
      if (estado === 'en_progreso' && !todasEntregadas) {
        return null; // El usuario va marcando paradas individualmente
      }
    }

    // Viajes mixtos: paradas + carga de bobinas al llegar al proveedor
    if (tipo === 'mixto') {
      if (estado === 'en_progreso') {
        // Pueden quedar paradas pendientes o puede avanzar manualmente al proveedor
        const todasEntregadas = paradasData.length === 0 || paradasData.every((p: any) => p.estado === 'entregado');
        return (
          <Button
            mode={todasEntregadas ? 'contained' : 'outlined'}
            onPress={() => handleAvanzarEstadoSimple(viaje.id, 'en_destino', 'fecha_viaje_llegada_destino')}
            style={styles.actionButton}
            disabled={!todasEntregadas}
          >
            {todasEntregadas ? 'Ir al Proveedor' : 'Completa las entregas primero'}
          </Button>
        );
      }
      if (estado === 'en_destino') {
        return (
          <Button mode="contained" icon="inbox-arrow-down" onPress={() => router.push(`/(screens)/cargar-bobinas-viaje?id=${viaje.id}`)} style={styles.actionButton}>
            Cargar Bobinas y Retornar
          </Button>
        );
      }
      if (estado === 'retornando') {
        return (
          <Button mode="contained" onPress={() => handleAvanzarEstadoSimple(viaje.id, 'completado', 'fecha_viaje_llegada_base')} style={styles.actionButton}>
            Llegué a Base (Fin)
          </Button>
        );
      }
    }

    return null;
  };

  const handleAvanzarEstadoSimple = async (id: string, nuevoEstado: string, campoFecha: string) => {
    try {
      const now = new Date().toISOString();
      await powerSync.execute(
        `UPDATE viajes SET estado = ?, ${campoFecha} = ? WHERE id = ?`,
        [nuevoEstado, now, id]
      );
      Toast.show({ type: 'success', text1: 'Estado actualizado', text2: formatearEstadoUi(nuevoEstado) });
    } catch (error) {
      console.error('Error avanzando viaje:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el viaje.' });
    }
  };

  const handleCerrarViaje = async (id: string) => {
    try {
      const now = new Date().toISOString();
      await powerSync.execute(
        `UPDATE viajes SET estado = 'completado', fecha_viaje_llegada_base = ? WHERE id = ?`,
        [now, id]
      );
      Toast.show({ type: 'success', text1: 'Viaje Completado', text2: '¡Todas las entregas finalizadas!' });
    } catch (error) {
      console.error('Error cerrando viaje:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cerrar el viaje.' });
    }
  };

  // Hook de paradas para cada viaje activo (se cargan dentro de ParadasViaje)
  return (
    <KeyboardAvoidingView style={globalStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filtros.map(f => (
            <Chip key={f} selected={filtro === f} onPress={() => setFiltro(f)} style={styles.chip} showSelectedOverlay>
              {f}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>

        {/* VIAJES ACTIVOS */}
        {viajesActivos.length > 0 && (
          <List.Section>
            <Text variant="titleMedium" style={styles.sectionHeader}>Viajes en Curso</Text>
            {viajesActivos.map((viaje: any) => (
              <ViajeActivoItem
                key={viaje.id}
                viaje={viaje}
                theme={theme}
                powerSync={powerSync}
                router={router}
                getViajeTitle={getViajeTitle}
                getViajeIcon={getViajeIcon}
                getViajeColor={getViajeColor}
                formatFecha={formatFecha}
                formatearEstadoUi={formatearEstadoUi}
                renderAccionPrincipal={renderAccionPrincipal}
                viajeId={viajeId}
              />
            ))}
          </List.Section>
        )}

        {/* HISTORIAL DE VIAJES COMPLETADOS */}
        {viajesPasados.length > 0 && (
          <List.Section>
            <Text variant="titleMedium" style={[styles.sectionHeader, { marginTop: 16 }]}>Historial Completado</Text>
            {viajesPasados.map((viaje: any) => (
              <ViajePasadoItem 
                key={viaje.id}
                viaje={viaje}
                theme={theme}
                powerSync={powerSync}
                getViajeTitle={getViajeTitle}
                getViajeIcon={getViajeIcon}
                formatFecha={formatFecha}
                viajeId={viajeId}
              />
            ))}
          </List.Section>
        )}

        {viajesActivos.length === 0 && viajesPasados.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>
            No hay viajes registrados en esta categoría.
          </Text>
        )}
      </ScrollView>

      <IconButton
        icon="truck-plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={[globalStyles.fab, { bottom: Math.max(insets.bottom + 16, 16) }]}
        onPress={() => router.push('/(screens)/registrar-viaje')}
      />
    </KeyboardAvoidingView>
  );
}

// Sub-componente que tiene acceso al useQuery de sus propias paradas
function ViajeActivoItem({
  viaje, theme, powerSync, router, getViajeTitle, getViajeIcon, getViajeColor,
  formatFecha, formatearEstadoUi, renderAccionPrincipal, viajeId
}: any) {
  const { data: paradasData = [] } = useQuery(
    `SELECT * FROM entregas_viaje WHERE id_viaje = ? ORDER BY orden ASC`,
    [viaje.id]
  );
  
  const [expanded, setExpanded] = useState(viajeId === viaje.id);

  return (
    <List.Accordion
      expanded={expanded}
      onPress={() => setExpanded(!expanded)}
      title={getViajeTitle(viaje)}
      description={`${formatFecha(viaje.fecha_viaje_inicio)} \u2022 ${formatearEstadoUi(viaje.estado)}`}
      left={props => <List.Icon {...props} icon={getViajeIcon(viaje.tipo_viaje)} color={getViajeColor(viaje.tipo_viaje)} />}
      style={styles.accordion}
      titleStyle={{ fontWeight: 'bold' }}
    >
      <View style={styles.accordionContent}>
        {viaje.notas ? (
          <Text variant="bodyMedium" style={styles.detailText}>
            Notas: <Text style={{ fontWeight: 'bold' }}>{viaje.notas}</Text>
          </Text>
        ) : null}

        {/* Paradas de entrega */}
        {(viaje.tipo_viaje === 'entrega' || viaje.tipo_viaje === 'mixto') && (
          <ParadasViaje idViaje={viaje.id} theme={theme} powerSync={powerSync} />
        )}

        {/* Historial de movimientos de este viaje */}
        <MovimientosViaje idViaje={viaje.id} theme={theme} />

        {/* Formulario de ingreso/gasto rápido */}
        <View style={styles.formCard}>
          <GastoViajeForm idViaje={viaje.id} theme={theme} />
        </View>

        {/* Botón de acción principal */}
        <View style={styles.actionRow}>
          {renderAccionPrincipal(viaje, paradasData)}
        </View>
      </View>
    </List.Accordion>
  );
}

function ViajePasadoItem({
  viaje, theme, powerSync, getViajeTitle, getViajeIcon, formatFecha, viajeId
}: any) {
  const [expanded, setExpanded] = useState(viajeId === viaje.id);

  return (
    <List.Accordion
      expanded={expanded}
      onPress={() => setExpanded(!expanded)}
      title={getViajeTitle(viaje)}
      description={`${formatFecha(viaje.fecha_viaje_inicio)} • Completado`}
      left={props => <List.Icon {...props} icon={getViajeIcon(viaje.tipo_viaje)} color="#888" />}
      style={styles.accordion}
      titleStyle={{ fontWeight: 'bold', color: '#555' }}
    >
      <View style={styles.accordionContent}>
        {viaje.notas ? (
          <Text variant="bodyMedium" style={styles.detailText}>
            Notas: <Text style={{ fontWeight: 'bold' }}>{viaje.notas}</Text>
          </Text>
        ) : null}
        <Text variant="bodySmall" style={[styles.detailText, { marginBottom: 16 }]}>
          Llegada a base: {formatFecha(viaje.fecha_viaje_llegada_base)}
        </Text>

        {/* Paradas de entrega (si hubo) */}
        {(viaje.tipo_viaje === 'entrega' || viaje.tipo_viaje === 'mixto') && (
          <ParadasViaje idViaje={viaje.id} theme={theme} powerSync={powerSync} />
        )}

        {/* Historial de movimientos (gastos/ingresos) */}
        <MovimientosViaje idViaje={viaje.id} theme={theme} />
      </View>
    </List.Accordion>
  );
}

const styles = StyleSheet.create({
  
  filtersContainer: {
    paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  chip: { marginHorizontal: 4 },
  
  sectionHeader: { fontWeight: 'bold', marginLeft: 8, marginBottom: 8, color: '#333' },
  accordion: { backgroundColor: '#ffffff', marginBottom: 8, borderRadius: 8 },
  accordionContent: {
    padding: 16, backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  detailText: { marginBottom: 4, color: '#444' },
  paradasContainer: { marginTop: 8, marginBottom: 8 },
  paradasHeader: { color: '#9ca3af', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 10 },
  paradaItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  paradaOrden: {
    width: 26, height: 26, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
  actionButton: { borderRadius: 8 },
  
  // Estilos del nuevo GastoViajeForm
  formCard: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formSectionLabel: {
    color: '#9ca3af', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 10,
  },
  tipoRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  tipoBtnText: { fontWeight: 'bold', fontSize: 13, color: '#9ca3af' },
  categoriasScroll: { marginBottom: 12 },
  categoriaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', marginRight: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  categoriaBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  montoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  montoInput: { marginBottom: 0 },
  monedaToggle: {
    width: 52, height: 52, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  monedaText: { fontWeight: 'bold', fontSize: 13 },
  descripcionInput: { marginBottom: 12 },
  guardarBtn: { borderRadius: 10 },
  // Estilos de MovimientosViaje
  movimientosContainer: {
    marginTop: 8, marginBottom: 4,
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 12,
  },
  movResumen: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  movResumenItem: { flex: 1, alignItems: 'flex-start', gap: 2 },
  movRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  movIconBox: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
});

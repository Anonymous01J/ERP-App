import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { List, Text, Button, useTheme, Chip, IconButton, TextInput, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';

// Subcomponente: Formulario de Gasto Rápido dentro del viaje
const GastoViajeForm = ({ theme }: { theme: any }) => {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [esIngreso, setEsIngreso] = useState(false);
  const [moneda, setMoneda] = useState('VES');

  return (
    <CustomCard style={styles.inputCard}>
      <Text variant="titleSmall" style={{ marginBottom: 8, color: '#555', paddingHorizontal: 8 }}>
        Registrar Gasto Rápido
      </Text>
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
          {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}
        </Button>
      </View>
      <Divider style={styles.divider} />
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
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#4ade80' }]} onPress={() => {
            Toast.show({ type: 'info', text1: 'En desarrollo', text2: 'El registro de gastos se conectará pronto.' });
          }}>
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </CustomCard>
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
    `SELECT ev.id, ev.orden, ev.estado, ev.hora_llegada, c.razon_social
     FROM entregas_viaje ev
     JOIN pedidos p ON p.id = ev.id_pedido
     JOIN clientes c ON c.id = p.id_cliente
     WHERE ev.id_viaje = ?
     ORDER BY ev.orden ASC`,
    [idViaje]
  );

  const handleMarcarEntregado = async (idParada: string, razonSocial: string) => {
    try {
      const now = new Date().toISOString();
      await powerSync.execute(
        `UPDATE entregas_viaje SET estado = 'entregado', hora_llegada = ? WHERE id = ?`,
        [now, idParada]
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
              {entregado && parada.hora_llegada && (
                <Text variant="bodySmall" style={{ color: '#9ca3af' }}>
                  Entregado: {new Date(parada.hora_llegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            {!entregado && (
              <Button
                mode="contained-tonal"
                compact
                onPress={() => handleMarcarEntregado(parada.id, parada.razon_social)}
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
  const theme = useTheme();
  const router = useRouter();
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
          <Button mode="contained" icon="inbox-arrow-down" onPress={() => router.push({ pathname: '/(screens)/cargar-bobinas-viaje', params: { id: viaje.id } })} style={styles.actionButton}>
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
          <Button mode="contained" icon="inbox-arrow-down" onPress={() => router.push({ pathname: '/(screens)/cargar-bobinas-viaje', params: { id: viaje.id } })} style={styles.actionButton}>
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>

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
              />
            ))}
          </List.Section>
        )}

        {/* HISTORIAL DE VIAJES COMPLETADOS */}
        {viajesPasados.length > 0 && (
          <List.Section>
            <Text variant="titleMedium" style={[styles.sectionHeader, { marginTop: 16 }]}>Historial Completado</Text>
            {viajesPasados.map((viaje: any) => (
              <List.Accordion
                key={viaje.id}
                title={getViajeTitle(viaje)}
                description={`${formatFecha(viaje.fecha_viaje_inicio)} • Completado`}
                left={props => <List.Icon {...props} icon={getViajeIcon(viaje.tipo_viaje)} color="#888" />}
                style={styles.accordion}
                titleStyle={{ fontWeight: 'bold', color: '#555' }}
              >
                <View style={styles.accordionContent}>
                  {viaje.notas ? (
                    <Text variant="bodyMedium" style={styles.detailText}>Notas: <Text style={{ fontWeight: 'bold' }}>{viaje.notas}</Text></Text>
                  ) : null}
                  <Text variant="bodySmall" style={styles.detailText}>
                    Llegada a base: {formatFecha(viaje.fecha_viaje_llegada_base)}
                  </Text>
                </View>
              </List.Accordion>
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
        style={styles.fab}
        onPress={() => router.push('/(screens)/registrar-viaje')}
      />
    </KeyboardAvoidingView>
  );
}

// Sub-componente que tiene acceso al useQuery de sus propias paradas
function ViajeActivoItem({
  viaje, theme, powerSync, router, getViajeTitle, getViajeIcon, getViajeColor,
  formatFecha, formatearEstadoUi, renderAccionPrincipal,
}: any) {
  const { data: paradasData = [] } = useQuery(
    `SELECT * FROM entregas_viaje WHERE id_viaje = ? ORDER BY orden ASC`,
    [viaje.id]
  );

  return (
    <List.Accordion
      title={getViajeTitle(viaje)}
      description={`${formatFecha(viaje.fecha_viaje_inicio)} • ${formatearEstadoUi(viaje.estado)}`}
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

        {/* Formulario de gastos rápidos */}
        <View style={{ marginTop: 16 }}>
          <GastoViajeForm theme={theme} />
        </View>

        {/* Botón de acción principal */}
        <View style={styles.actionRow}>
          {renderAccionPrincipal(viaje, paradasData)}
        </View>
      </View>
    </List.Accordion>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  filtersContainer: {
    paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  chip: { marginHorizontal: 4 },
  scrollContent: { padding: 8, paddingBottom: 100 },
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
  fab: {
    position: 'absolute', bottom: 16, right: 16,
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  // Estilos del GastoViajeForm
  inputCard: {
    backgroundColor: '#ffffff', padding: 8, borderRadius: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0', elevation: 0, shadowOpacity: 0,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  textInput: { height: 48, fontSize: 14 },
  dateBtn: { borderRadius: 8, borderColor: '#e0e0e0' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4, marginHorizontal: 8 },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Avatar, useTheme, IconButton, Divider, Button, Searchbar, SegmentedButtons, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { generateEstadoCuentaPdf } from '../utils/pdfEstadoCuenta';

export function ClientesDashboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);
  const { refreshing, onRefresh } = usePullToRefresh();

  const { data: clientes = [] } = useQuery(
    `SELECT * FROM clientes WHERE estado = ? ORDER BY razon_social ASC`, 
    [filtroEstado]
  );

  const { data: historialPedidos = [] } = useQuery(
    expandedId ? `SELECT * FROM pedidos WHERE id_cliente = ? ORDER BY fecha_creacion DESC LIMIT 3` : `SELECT * FROM pedidos WHERE 1=0`,
    expandedId ? [expandedId] : []
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleMenu = (id: string) => {
    setMenuVisibleId(menuVisibleId === id ? null : id);
  };

  const handleEdit = (id: string) => {
    setMenuVisibleId(null);
    router.push(`/(screens)/registrar-cliente?id=${id}`);
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    setMenuVisibleId(null);
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await powerSync.execute('UPDATE clientes SET estado = ? WHERE id = ?', [nuevoEstado, id]);
      Toast.show({
        type: 'success',
        text1: `Cliente ${nuevoEstado === 'activo' ? 'Activado' : 'Desactivado'}`,
        text2: 'El estado del cliente ha sido actualizado.'
      });
    } catch (error) {
      console.error('Error actualizando estado del cliente:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el estado del cliente.' });
    }
  };

  const handleGenerarEstadoCuenta = async (clienteId: string) => {
    try {
      // 1. Obtener datos del cliente
      const clienteData = clientes.find(c => c.id === clienteId);
      if (!clienteData) throw new Error('Cliente no encontrado');

      // 2. Obtener historial de pedidos a crédito o deudas
      const pedidosResult = await powerSync.getAll(
        `SELECT * FROM pedidos WHERE id_cliente = ? AND estado != 'cancelado' ORDER BY fecha_creacion ASC`, 
        [clienteId]
      );

      // 3. Obtener todos los abonos realizados por este cliente
      // Buscamos los abonos a través de los pedidos del cliente
      const abonosResult = await powerSync.getAll(
        `SELECT a.* FROM abonos_pagos a
         JOIN pedidos p ON a.id_pedido = p.id
         WHERE p.id_cliente = ? ORDER BY a.fecha_pago ASC`,
        [clienteId]
      );

      // 4. Generar el PDF
      await generateEstadoCuentaPdf(clienteData, pedidosResult, abonosResult);
      
    } catch (error) {
      console.error('Error generando estado de cuenta:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo generar el Estado de Cuenta.' });
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.razon_social?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.telefono?.includes(searchQuery)
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerControls}>
        <Searchbar
          placeholder="Buscar cliente..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          elevation={1}
        />
        <SegmentedButtons
          value={filtroEstado}
          onValueChange={setFiltroEstado}
          buttons={[
            { value: 'activo', label: 'Activos' },
            { value: 'inactivo', label: 'Inactivos' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView 
        contentContainerStyle={globalStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredClientes.map(cliente => {
          const isExpanded = expandedId === cliente.id;
          const isMenuVisible = menuVisibleId === cliente.id;
          const isInactive = cliente.estado === 'inactivo';

          return (
            <CustomCard key={cliente.id} style={[styles.cardWrapper, isInactive && styles.cardInactive]}>
              <TouchableOpacity onPress={() => toggleExpand(cliente.id)} activeOpacity={0.7}>
                <View style={styles.cardContent}>
                  <View style={styles.avatarContainer}>
                    <Avatar.Text 
                      size={48} 
                      label={(cliente.razon_social || 'XX').substring(0, 2).toUpperCase()} 
                      style={isInactive ? { backgroundColor: theme.colors.surfaceDisabled } : undefined}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={[{ fontWeight: 'bold' }, isInactive && { color: theme.colors.outline }]}>
                      {cliente.razon_social}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: isInactive ? theme.colors.outline : '#666' }}>
                      {cliente.telefono || 'Sin teléfono'}
                    </Text>
                    <View style={styles.statusRow}>
                      <Text variant="titleSmall" style={{ color: isInactive ? theme.colors.outline : theme.colors.primary }}>
                        Saldo a Favor: ${cliente.saldo_a_favor_usd?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                  </View>

                  <Menu
                    visible={isMenuVisible}
                    onDismiss={() => setMenuVisibleId(null)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={24}
                        onPress={() => toggleMenu(cliente.id)}
                      />
                    }
                  >
                    <Menu.Item onPress={() => handleEdit(cliente.id)} title="Editar" leadingIcon="pencil" />
                    <Menu.Item 
                      onPress={() => handleToggleEstado(cliente.id, cliente.estado)} 
                      title={isInactive ? "Activar Cliente" : "Desactivar Cliente"} 
                      leadingIcon={isInactive ? "check-circle" : "cancel"} 
                    />
                  </Menu>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.historyContainer}>
                  <Divider style={styles.divider} />
                  
                  <View style={{ marginBottom: 12 }}>
                    <Text variant="labelMedium" style={{ fontWeight: 'bold', color: '#6b7280', marginBottom: 8 }}>ÚLTIMOS PEDIDOS</Text>
                    {historialPedidos.length === 0 ? (
                      <Text variant="bodySmall" style={{ color: '#888', fontStyle: 'italic' }}>
                        No hay pedidos recientes.
                      </Text>
                    ) : (
                      historialPedidos.map((ped, idx) => (
                        <View key={ped.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: idx < historialPedidos.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}>
                          <View>
                            <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>
                              {new Date(ped.fecha_creacion).toLocaleDateString('es-VE')}
                            </Text>
                            <Text variant="bodySmall" style={{ color: ped.estado === 'entregado' ? '#10b981' : '#f59e0b' }}>
                              {ped.estado === 'entregado' ? 'Entregado' : 'Pendiente'}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>
                              ${ped.monto_total?.toFixed(2) || '0.00'}
                            </Text>
                            <Text variant="bodySmall" style={{ color: ped.estado_pago === 'pagado' ? '#10b981' : '#ef4444' }}>
                              {ped.estado_pago === 'pagado' ? 'Pagado' : 'Deuda'}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                  
                  <View style={styles.actionsRow}>
                    <Button 
                      mode="contained-tonal" 
                      compact 
                      onPress={() => router.push('/(tabs)/pedidos?vista=finanzas')} 
                      style={{ flex: 1, marginRight: 8 }} 
                      disabled={isInactive}
                    >
                      Registrar Abono
                    </Button>
                    <Button 
                      mode="outlined" 
                      compact 
                      onPress={() => handleGenerarEstadoCuenta(cliente.id)} 
                      style={{ flex: 1 }}
                    >
                      Estado de Cta
                    </Button>
                  </View>
                </View>
              )}
            </CustomCard>
          );
        })}
        {filteredClientes.length === 0 && (
          <Text style={styles.emptyText}>No se encontraron clientes.</Text>
        )}
      </ScrollView>

      <IconButton
        icon="plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={[globalStyles.fab, { bottom: Math.max(insets.bottom + 16, 16) }]}
        onPress={() => router.push('/(screens)/registrar-cliente')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  
  headerControls: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchbar: {
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  
  cardWrapper: {
    marginBottom: 12,
  },
  cardInactive: {
    opacity: 0.6,
  },
  historyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  }
});

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import {  View, StyleSheet, ScrollView, TouchableOpacity , RefreshControl } from 'react-native';
import { Text, Appbar, useTheme, IconButton, SegmentedButtons, Avatar, List, Button, Divider, Portal, Modal, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { CustomCard } from '@components/ui/CustomCard';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export function GestionarProductosScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Estado para Modal de Ajuste de Stock
  const [modalAjusteVisible, setModalAjusteVisible] = useState(false);
  const [productoAjuste, setProductoAjuste] = useState<any>(null);
  const [ajusteTipo, setAjusteTipo] = useState<'salida' | 'ingreso'>('salida');
  const [ajusteCantidad, setAjusteCantidad] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [savingAjuste, setSavingAjuste] = useState(false);

  // Consultar los productos filtrados por estado
  const { data: productos = [] } = useQuery(
    `SELECT * FROM productos_reventa WHERE estado = ? ORDER BY nombre_producto ASC`,
    [filtroEstado]
  );

  const toggleAccordion = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleEdit = (id: string) => {
    router.push(`/(screens)/registrar-producto?id=${id}`);
  };

  const handleHistorial = (id: string) => {
    router.push(`/(screens)/historial-productos?id_producto=${id}`);
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await powerSync.execute(
        `UPDATE productos_reventa SET estado = ? WHERE id = ?`,
        [nuevoEstado, id]
      );
      Toast.show({
        type: 'success',
        text1: 'Actualizado',
        text2: `El producto ha sido ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}.`,
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar el estado del producto.',
      });
    }
  };

  const handleOpenAjuste = (producto: any) => {
    setProductoAjuste(producto);
    setAjusteTipo('salida');
    setAjusteCantidad('');
    setAjusteMotivo('');
    setModalAjusteVisible(true);
  };

  const handleSaveAjuste = async () => {
    const qty = parseInt(ajusteCantidad);
    if (isNaN(qty) || qty <= 0) {
      Toast.show({ type: 'error', text1: 'Cantidad inválida', text2: 'Ingresa un número mayor a 0.' });
      return;
    }
    if (!ajusteMotivo.trim()) {
      Toast.show({ type: 'error', text1: 'Motivo requerido', text2: 'Por favor, indica el motivo del ajuste.' });
      return;
    }
    if (ajusteTipo === 'salida' && qty > productoAjuste.stock_unidades) {
      Toast.show({ type: 'error', text1: 'Stock insuficiente', text2: 'No puedes retirar más de lo que hay en stock.' });
      return;
    }

    setSavingAjuste(true);
    try {
      const now = new Date().toISOString();
      const nuevoStock = ajusteTipo === 'salida' 
        ? productoAjuste.stock_unidades - qty 
        : productoAjuste.stock_unidades + qty;

      await powerSync.execute(
        `UPDATE productos_reventa SET stock_unidades = ? WHERE id = ?`,
        [nuevoStock, productoAjuste.id]
      );

      await powerSync.execute(
        `INSERT INTO historial_productos (id, id_producto, cantidad, tipo, origen, referencia_id, entidad_relacionada, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), productoAjuste.id, qty, ajusteTipo, 'ajuste_manual', null, ajusteMotivo.trim(), now]
      );

      Toast.show({ type: 'success', text1: 'Ajuste realizado', text2: `Stock actualizado a ${nuevoStock}.` });
      setModalAjusteVisible(false);
    } catch (e) {
      console.error('Error ajustando stock', e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo guardar el ajuste.' });
    } finally {
      setSavingAjuste(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Tipos de Productos" />
      </Appbar.Header>

      <View style={styles.headerControls}>
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

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={globalStyles.scrollContent}>
        {productos.map(producto => {
          const isExpanded = expandedIds.includes(producto.id);
          const isInactive = producto.estado === 'inactivo';

          return (
            <CustomCard key={producto.id} style={[styles.cardWrapper, isInactive && styles.cardInactive]}>
              <List.Accordion
                title={producto.nombre_producto}
                titleStyle={[{ fontWeight: 'bold' }, isInactive && { color: theme.colors.outline }]}
                description={
                  <View>
                    <Text variant="bodyMedium" style={{ color: isInactive ? theme.colors.outline : '#666' }}>
                      En stock: {producto.stock_unidades} unidades
                    </Text>
                    <Text variant="titleSmall" style={{ color: isInactive ? theme.colors.outline : theme.colors.primary, marginTop: 4 }}>
                      Venta Unid: ${Number(producto.precio_venta_usd).toFixed(2)} | Costo Unid: ${Number(producto.precio_compra_usd).toFixed(2)}
                    </Text>
                  </View>
                }
                left={props => (
                  <View style={{ justifyContent: 'center', paddingLeft: 8, paddingRight: 8 }}>
                    <Avatar.Icon 
                      size={48} 
                      icon="shape-outline" 
                      style={isInactive ? { backgroundColor: theme.colors.surfaceDisabled } : { backgroundColor: theme.colors.tertiaryContainer }}
                      color={isInactive ? theme.colors.outline : theme.colors.tertiary}
                    />
                  </View>
                )}
                expanded={isExpanded}
                onPress={() => toggleAccordion(producto.id)}
                style={{ backgroundColor: 'transparent', paddingVertical: 4 }}
              >
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Divider style={{ marginBottom: 12 }} />
                  {producto.descripcion ? (
                    <Text variant="bodySmall" style={{ color: isInactive ? theme.colors.outline : '#666', marginBottom: 16 }}>
                      {producto.descripcion}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <Button 
                      mode="outlined" 
                      icon="pencil" 
                      onPress={() => handleEdit(producto.id)}
                      style={{ flex: 1 }}
                    >
                      Editar
                    </Button>
                    <Button 
                      mode="contained-tonal" 
                      icon={isInactive ? "check-circle" : "cancel"} 
                      textColor={isInactive ? theme.colors.primary : theme.colors.error}
                      buttonColor={isInactive ? theme.colors.primaryContainer : theme.colors.errorContainer}
                      onPress={() => handleToggleEstado(producto.id, producto.estado)}
                      style={{ flex: 1 }}
                    >
                      {isInactive ? "Activar" : "Desactivar"}
                    </Button>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <Button 
                      mode="contained-tonal" 
                      icon="swap-vertical" 
                      onPress={() => handleOpenAjuste(producto)}
                      style={{ flex: 1 }}
                    >
                      Ajuste Stock
                    </Button>
                    <Button 
                      mode="outlined" 
                      icon="history" 
                      onPress={() => handleHistorial(producto.id)}
                      style={{ flex: 1 }}
                    >
                      Historial
                    </Button>
                  </View>
                </View>
              </List.Accordion>
            </CustomCard>
          );
        })}
        {productos.length === 0 && (
          <Text style={styles.emptyText}>No hay productos en este estado.</Text>
        )}
      </ScrollView>

      <IconButton
        icon="plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={[globalStyles.fab, { bottom: Math.max(insets.bottom + 16, 16) }]}
        onPress={() => router.push('/(screens)/registrar-producto')}
      />

      <Portal>
        <Modal visible={modalAjusteVisible} onDismiss={() => setModalAjusteVisible(false)} contentContainerStyle={styles.modalContent}>
          {productoAjuste && (
            <>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: 'bold' }}>
                Ajuste de Stock: {productoAjuste.nombre_producto}
              </Text>
              
              <SegmentedButtons
                value={ajusteTipo}
                onValueChange={(val) => setAjusteTipo(val as 'salida' | 'ingreso')}
                buttons={[
                  { value: 'salida', label: 'Dar de Baja (Salida)' },
                  { value: 'ingreso', label: 'Dar de Alta (Ingreso)' },
                ]}
                style={{ marginBottom: 16 }}
              />

              <TextInput
                mode="outlined"
                label="Cantidad"
                keyboardType="numeric"
                value={ajusteCantidad}
                onChangeText={setAjusteCantidad}
                style={{ marginBottom: 16 }}
              />

              <TextInput
                mode="outlined"
                label="Motivo (Ej: Apertura de bulto, Dañado)"
                value={ajusteMotivo}
                onChangeText={setAjusteMotivo}
                style={{ marginBottom: 24 }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Button onPress={() => setModalAjusteVisible(false)} disabled={savingAjuste}>
                  Cancelar
                </Button>
                <Button mode="contained" onPress={handleSaveAjuste} loading={savingAjuste} disabled={savingAjuste}>
                  Confirmar Ajuste
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  
  headerControls: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
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
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  }
});

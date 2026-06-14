import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Appbar, useTheme, IconButton, SegmentedButtons, Menu, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import { CustomCard } from '@components/ui/CustomCard';
import Toast from 'react-native-toast-message';

export function GestionarPotesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  // Consultar los potes filtrados por estado
  const { data: potes } = powerSync.useQuery(
    `SELECT * FROM inventario_potes WHERE estado = ? ORDER BY capacidad ASC`,
    [filtroEstado]
  );

  const toggleMenu = (id: string) => {
    setMenuVisibleId(menuVisibleId === id ? null : id);
  };

  const handleEdit = (id: string) => {
    setMenuVisibleId(null);
    router.push(`/(screens)/registrar-pote?id=${id}`);
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    setMenuVisibleId(null);
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await powerSync.execute(
        `UPDATE inventario_potes SET estado = ? WHERE id = ?`,
        [nuevoEstado, id]
      );
      Toast.show({
        type: 'success',
        text1: 'Actualizado',
        text2: `El pote ha sido ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}.`,
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar el estado del pote.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Tipos de Potes" />
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {potes.map(pote => {
          const isMenuVisible = menuVisibleId === pote.id;
          const isInactive = pote.estado === 'inactivo';

          return (
            <CustomCard key={pote.id} style={[styles.cardWrapper, isInactive && styles.cardInactive]}>
              <View style={styles.cardContent}>
                <View style={styles.avatarContainer}>
                  <Avatar.Icon 
                    size={48} 
                    icon="bottle-tonic-outline" 
                    style={isInactive ? { backgroundColor: theme.colors.surfaceDisabled } : { backgroundColor: theme.colors.tertiaryContainer }}
                    color={isInactive ? theme.colors.outline : theme.colors.tertiary}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text variant="titleMedium" style={[{ fontWeight: 'bold' }, isInactive && { color: theme.colors.outline }]}>
                    Pote de {pote.capacidad}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: isInactive ? theme.colors.outline : '#666' }}>
                    En stock: {pote.stock_unidades} unidades
                  </Text>
                  <View style={styles.statusRow}>
                    <Text variant="titleSmall" style={{ color: isInactive ? theme.colors.outline : theme.colors.primary }}>
                      Venta: ${Number(pote.precio_venta_usd).toFixed(2)} | Compra: ${Number(pote.precio_compra_usd).toFixed(2)}
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
                      onPress={() => toggleMenu(pote.id)}
                    />
                  }
                >
                  <Menu.Item onPress={() => handleEdit(pote.id)} title="Editar" leadingIcon="pencil" />
                  <Menu.Item 
                    onPress={() => handleToggleEstado(pote.id, pote.estado)} 
                    title={isInactive ? "Activar" : "Desactivar"} 
                    leadingIcon={isInactive ? "check-circle" : "cancel"} 
                    titleStyle={{ color: isInactive ? theme.colors.primary : theme.colors.error }}
                  />
                </Menu>
              </View>
            </CustomCard>
          );
        })}
        {potes.length === 0 && (
          <Text style={styles.emptyText}>No hay potes en este estado.</Text>
        )}
      </ScrollView>

      <IconButton
        icon="plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={styles.fab}
        onPress={() => router.push('/(screens)/registrar-pote')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerControls: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 100,
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
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});

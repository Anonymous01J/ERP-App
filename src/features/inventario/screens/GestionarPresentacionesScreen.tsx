import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Appbar, useTheme, IconButton, Divider, SegmentedButtons, Menu, Avatar, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { CustomCard } from '@components/ui/CustomCard';
import Toast from 'react-native-toast-message';

export function GestionarPresentacionesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  // Consultar las presentaciones filtradas por estado usando el Hook 'useQuery'
  const { data: presentaciones = [], isLoading } = useQuery(
    `SELECT * FROM productos_presentacion WHERE estado = ? ORDER BY nombre ASC`,
    [filtroEstado]
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleMenu = (id: string) => {
    setMenuVisibleId(menuVisibleId === id ? null : id);
  };

  const handleEdit = (id: string) => {
    setMenuVisibleId(null);
    router.push(`/(screens)/registrar-presentacion?id=${id}`);
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    if (!powerSync) return;
    setMenuVisibleId(null);
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await powerSync.execute(
        `UPDATE productos_presentacion SET estado = ? WHERE id = ?`,
        [nuevoEstado, id]
      );
      Toast.show({
        type: 'success',
        text1: 'Actualizado',
        text2: `La presentación ha sido ${nuevoEstado === 'activo' ? 'activada' : 'desactivada'}.`,
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar el estado de la presentación.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Tipos de Rollo (Presentaciones)" />
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
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 50 }} />
        ) : presentaciones.length > 0 ? (
          presentaciones.map(pres => {
            const isExpanded = expandedId === pres.id;
            const isMenuVisible = menuVisibleId === pres.id;
            const isInactive = pres.estado === 'inactivo';

            return (
              <CustomCard key={pres.id} style={[styles.cardWrapper, isInactive && styles.cardInactive]}>
                <TouchableOpacity onPress={() => toggleExpand(pres.id)} activeOpacity={0.7}>
                  <View style={styles.cardContent}>
                    <View style={styles.avatarContainer}>
                      <Avatar.Icon 
                        size={48} 
                        icon="package-variant-closed" 
                        style={isInactive ? { backgroundColor: theme.colors.surfaceDisabled } : { backgroundColor: theme.colors.primaryContainer }}
                        color={isInactive ? theme.colors.outline : theme.colors.primary}
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text variant="titleMedium" style={[{ fontWeight: 'bold' }, isInactive && { color: theme.colors.outline }]}>
                        Rollo {pres.nombre}
                      </Text>
                      <Text variant="bodyMedium" style={{ color: isInactive ? theme.colors.outline : '#666' }}>
                        Nominal: {pres.peso_nominal_g}g | Real: {pres.peso_real_g}g
                      </Text>
                      <View style={styles.statusRow}>
                        <Text variant="titleSmall" style={{ color: isInactive ? theme.colors.outline : theme.colors.primary }}>
                          {pres.rollos_por_paquete} unidades / paquete
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
                          onPress={() => toggleMenu(pres.id)}
                        />
                      }
                    >
                      <Menu.Item onPress={() => handleEdit(pres.id)} title="Editar" leadingIcon="pencil" />
                      <Menu.Item 
                        onPress={() => handleToggleEstado(pres.id, pres.estado)} 
                        title={isInactive ? "Activar" : "Desactivar"} 
                        leadingIcon={isInactive ? "check-circle" : "cancel"} 
                        titleStyle={{ color: isInactive ? theme.colors.primary : theme.colors.error }}
                      />
                    </Menu>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.historyContainer}>
                    <Divider style={styles.divider} />
                    <Text variant="titleSmall" style={styles.historyTitle}>Historial de Producción Reciente</Text>
                    
                    <Text variant="bodySmall" style={{ color: '#888', fontStyle: 'italic', marginBottom: 12 }}>
                      Aquí se mostrarán los últimos registros de producción de este tipo de rollo.
                    </Text>
                  </View>
                )}
              </CustomCard>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No hay presentaciones en este estado.</Text>
        )}
      </ScrollView>

      <IconButton
        icon="plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={styles.fab}
        onPress={() => router.push('/(screens)/registrar-presentacion')}
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
    bottom: 86,
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
  historyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    marginBottom: 12,
  },
  historyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  }
});

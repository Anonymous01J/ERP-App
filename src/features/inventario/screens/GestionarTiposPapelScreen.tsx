import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import {  View, StyleSheet, ScrollView, Alert , RefreshControl } from 'react-native';
import { Appbar, Text, useTheme, FAB, IconButton, Searchbar, SegmentedButtons, Menu, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { CustomCard } from '@ui/CustomCard';
import Toast from 'react-native-toast-message';

export default function GestionarTiposPapelScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  const { data: tiposPapel = [] } = useQuery(
    'SELECT * FROM tipos_papel WHERE estado = ? ORDER BY nombre ASC',
    [filtroEstado]
  );

  const toggleMenu = (id: string) => {
    setMenuVisibleId(menuVisibleId === id ? null : id);
  };

  const handleEdit = (id: string) => {
    setMenuVisibleId(null);
    router.push(`/(screens)/registrar-tipo-papel?id=${id}`);
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    setMenuVisibleId(null);
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await powerSync.execute(
        'UPDATE tipos_papel SET estado = ? WHERE id = ?',
        [nuevoEstado, id]
      );
      Toast.show({
        type: 'success',
        text1: `Tipo de Papel ${nuevoEstado === 'activo' ? 'Activado' : 'Desactivado'}`,
        text2: 'El estado se ha actualizado correctamente.'
      });
    } catch (e) {
      console.error(e);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar el estado del tipo de papel.'
      });
    }
  };

  const filteredTipos = tiposPapel.filter(t => 
    t.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={globalStyles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Tipos de Papel" />
      </Appbar.Header>

      <View style={styles.headerControls}>
        {/* <Searchbar
          placeholder="Buscar tipo de papel..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          elevation={1}
        /> */}
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

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.list}>
        {filteredTipos.map(item => {
          const isMenuVisible = menuVisibleId === item.id;
          const isInactive = item.estado === 'inactivo';

          return (
            <CustomCard key={item.id} style={[styles.cardWrapper, isInactive && styles.cardInactive]}>
              <View style={styles.cardContent}>
                <View style={styles.avatarContainer}>
                  <Avatar.Icon 
                    size={48} 
                    icon="paper-roll" 
                    style={isInactive ? { backgroundColor: theme.colors.surfaceDisabled } : undefined}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text variant="titleMedium" style={[{ fontWeight: 'bold' }, isInactive && { color: theme.colors.outline }]}>
                    Papel {item.nombre}
                  </Text>
                  <Text variant="bodySmall" style={{ color: isInactive ? theme.colors.outline : '#666' }}>
                    {item.estado.toUpperCase()}
                  </Text>
                </View>

                <Menu
                  visible={isMenuVisible}
                  onDismiss={() => setMenuVisibleId(null)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={24}
                      onPress={() => toggleMenu(item.id)}
                    />
                  }
                >
                  <Menu.Item onPress={() => handleEdit(item.id)} title="Editar" leadingIcon="pencil" />
                  <Menu.Item 
                    onPress={() => handleToggleEstado(item.id, item.estado)} 
                    title={isInactive ? "Activar" : "Desactivar"} 
                    leadingIcon={isInactive ? "check-circle" : "cancel"} 
                  />
                </Menu>
              </View>
            </CustomCard>
          );
        })}
        {filteredTipos.length === 0 && (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: '#9ca3af' }}>No hay tipos de papel registrados.</Text>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[globalStyles.fab, { backgroundColor: theme.colors.primaryContainer, bottom: Math.max(insets.bottom + 16, 16) }]}
        color={theme.colors.onPrimaryContainer}
        onPress={() => router.push('/(screens)/registrar-tipo-papel')}
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
  list: { padding: 16, paddingBottom: 100 },
  cardWrapper: {
    marginBottom: 12,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardContent: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  empty: { marginTop: 40, alignItems: 'center' },
});

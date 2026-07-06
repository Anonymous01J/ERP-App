import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Text, Avatar, useTheme, IconButton, Divider, Searchbar, SegmentedButtons, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import { useQuery, usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';

export function ProveedoresDashboardScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  // Consulta PowerSync
  const { data: proveedores = [] } = useQuery(
    `SELECT * FROM proveedores WHERE estado = ? AND nombre_empresa LIKE ? ORDER BY nombre_empresa ASC`,
    [filtroEstado, `%${searchQuery}%`]
  );

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    try {
      const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
      await powerSync.execute('UPDATE proveedores SET estado = ? WHERE id = ?', [nuevoEstado, id]);
      
      Toast.show({
        type: 'success',
        text1: `Proveedor ${nuevoEstado === 'activo' ? 'Activado' : 'Desactivado'}`,
        text2: 'El estado se ha actualizado correctamente.',
      });
      setMenuVisibleId(null);
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar el estado.',
      });
    }
  };

  const renderProveedorCard = (proveedor: any) => {
    const isExpanded = expandedId === proveedor.id;
    const isActivo = proveedor.estado === 'activo';

    return (
      <CustomCard key={proveedor.id} style={styles.card}>
        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : proveedor.id)}
          style={styles.cardHeader}
        >
          <View style={styles.headerContent}>
            <Avatar.Text 
              size={48} 
              label={proveedor.nombre_empresa.substring(0, 2).toUpperCase()} 
              style={[styles.avatar, !isActivo && { backgroundColor: theme.colors.surfaceVariant }]}
              color={isActivo ? '#fff' : theme.colors.onSurfaceVariant}
            />
            <View style={styles.headerText}>
              <Text variant="titleMedium" style={styles.nombre}>{proveedor.nombre_empresa}</Text>
              <Text variant="bodyMedium" style={styles.telefono}>{proveedor.telefono || 'Sin teléfono'}</Text>
            </View>
          </View>
          <IconButton
            icon={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            onPress={() => setExpandedId(isExpanded ? null : proveedor.id)}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={styles.detailLabel}>Dirección:</Text>
              <Text variant="bodyMedium">{proveedor.direccion || 'No especificada'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={styles.detailLabel}>Notas:</Text>
              <Text variant="bodyMedium">{proveedor.notas || 'Ninguna'}</Text>
            </View>
            <View style={styles.actionsRow}>
              <Menu
                visible={menuVisibleId === proveedor.id}
                onDismiss={() => setMenuVisibleId(null)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuVisibleId(proveedor.id)} style={styles.opcionesBtn}>
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Opciones</Text>
                  </TouchableOpacity>
                }
              >
                <Menu.Item 
                  onPress={() => {
                    setMenuVisibleId(null);
                    router.push({ pathname: '/(screens)/registrar-proveedor', params: { id: proveedor.id } });
                  }} 
                  title="Editar Información" 
                  leadingIcon="pencil"
                />
                <Menu.Item 
                  onPress={() => handleToggleEstado(proveedor.id, proveedor.estado)} 
                  title={isActivo ? "Desactivar Proveedor" : "Reactivar Proveedor"}
                  leadingIcon={isActivo ? "archive" : "restore"}
                  titleStyle={{ color: isActivo ? theme.colors.error : theme.colors.primary }}
                />
              </Menu>
            </View>
          </View>
        )}
      </CustomCard>
    );
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Buscar proveedores..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          elevation={0}
        />
        <SegmentedButtons
          value={filtroEstado}
          onValueChange={setFiltroEstado}
          buttons={[
            { value: 'activo', label: 'Activos' },
            { value: 'inactivo', label: 'Inactivos' },
          ]}
          style={styles.segmented}
        />
      </View>

      <ScrollView 
        contentContainerStyle={globalStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {proveedores.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: '#888' }}>
              No se encontraron proveedores {filtroEstado}s.
            </Text>
          </View>
        ) : (
          proveedores.map(renderProveedorCard)
        )}
      </ScrollView>

      <IconButton
        icon="plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={[globalStyles.fab, { bottom: Math.max(insets.bottom + 16, 16) }]}
        onPress={() => router.push('/(screens)/registrar-proveedor')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', zIndex: 10 },
  searchbar: { backgroundColor: '#f0f2f5', borderRadius: 12, marginBottom: 16 },
  segmented: { marginHorizontal: 0 },
  
  card: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { backgroundColor: '#6366f1' },
  headerText: { marginLeft: 16, flex: 1 },
  nombre: { fontWeight: 'bold', color: '#1f2937' },
  telefono: { color: '#6b7280', marginTop: 2 },
  expandedContent: { padding: 16, paddingTop: 0, backgroundColor: '#FAFAFA' },
  divider: { marginVertical: 12 },
  detailRow: { marginBottom: 12 },
  detailLabel: { color: '#6b7280', marginBottom: 2, fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  opcionesBtn: { padding: 8 },
  
  emptyState: { alignItems: 'center', marginTop: 40 }
});

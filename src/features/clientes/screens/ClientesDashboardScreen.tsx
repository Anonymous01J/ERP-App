import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, useTheme, IconButton, Divider, Button, Searchbar, SegmentedButtons, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import { StatusBarBadge, StatusType } from '@components/ui/StatusBarBadge';
import { usePowerSync } from '@powersync/react';

export function ClientesDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  // Fetch clients from PowerSync
  // Assuming table name is 'clientes'
  const { data: clientes } = powerSync.useQuery(
    `SELECT * FROM clientes WHERE estado = ? ORDER BY razon_social ASC`, 
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
    router.push(`/(screens)/registrar-cliente?id=${id}`);
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    setMenuVisibleId(null);
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await powerSync.execute('UPDATE clientes SET estado = ? WHERE id = ?', [nuevoEstado, id]);
    } catch (error) {
      console.error('Error actualizando estado del cliente:', error);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.razon_social?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.telefono?.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredClientes.map(cliente => {
          const isExpanded = expandedId === cliente.id;
          const isMenuVisible = menuVisibleId === cliente.id;
          // Calculate debt based on your logic, for now using saldo_a_favor_usd (if negative it would be debt)
          // Defaulting to 0 for UI purposes if not specified in your actual schema rules
          const deuda = 0; 
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
                  {/* Historial mockeado temporalmente hasta que se implemente la tabla de movimientos/pedidos por cliente */}
                  <Text variant="bodySmall" style={{ color: '#888', fontStyle: 'italic', marginBottom: 12 }}>
                    El historial de transacciones se mostrará aquí.
                  </Text>
                  
                  <View style={styles.actionsRow}>
                    <Button mode="contained-tonal" compact onPress={() => {}} style={{ flex: 1, marginRight: 8 }} disabled={isInactive}>
                      Registrar Abono
                    </Button>
                    <Button mode="outlined" compact onPress={() => {}} style={{ flex: 1 }}>
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
        style={styles.fab}
        onPress={() => router.push('/(screens)/registrar-cliente')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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


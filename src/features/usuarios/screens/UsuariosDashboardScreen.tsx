import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Text, useTheme, Chip, IconButton, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@powersync/react';
import { usePullToRefresh } from '@core/hooks/usePullToRefresh';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { ROLES_CONFIG } from '@core/auth/types';
import type { UserRole } from '@core/auth/types';

const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#7c3aed',
  operador: '#2563eb',
  chofer: '#16a34a',
  vendedor: '#d97706',
};

export function UsuariosDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { refreshing, onRefresh } = usePullToRefresh();

  const { data: usuarios = [] } = useQuery(
    `SELECT id, nombre, rol, activo FROM perfiles ORDER BY activo DESC, nombre ASC`
  );

  const activos = (usuarios as any[]).filter((u: any) => u.activo === 1);
  const inactivos = (usuarios as any[]).filter((u: any) => u.activo !== 1);

  const getRolLabel = (rol: string) =>
    ROLES_CONFIG.find(r => r.key === rol)?.label ?? rol;

  const renderUsuario = (usuario: any) => (
    <Surface key={usuario.id} style={styles.card} elevation={1}>
      <View style={styles.cardContent}>
        <View style={[styles.avatar, { backgroundColor: `${ROLE_COLORS[usuario.rol as UserRole]}22` }]}>
          <MaterialCommunityIcons
            name="account"
            size={28}
            color={ROLE_COLORS[usuario.rol as UserRole] ?? theme.colors.primary}
          />
        </View>
        <View style={styles.info}>
          <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: '#1f2937' }}>
            {usuario.nombre || 'Sin nombre'}
          </Text>
          <Chip
            compact
            style={[styles.rolChip, { backgroundColor: `${ROLE_COLORS[usuario.rol as UserRole]}22` }]}
            textStyle={{ color: ROLE_COLORS[usuario.rol as UserRole] ?? theme.colors.primary, fontWeight: 'bold', fontSize: 11 }}
          >
            {getRolLabel(usuario.rol)}
          </Chip>
        </View>
        <View style={styles.statusDot}>
          <View style={[styles.dot, { backgroundColor: usuario.activo === 1 ? '#16a34a' : '#d1d5db' }]} />
        </View>
        <IconButton
          icon="pencil-outline"
          size={20}
          onPress={() => router.push(`/(screens)/editar-usuario?id=${usuario.id}`)}
        />
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Gestión de Usuarios" />
        <Appbar.Action
          icon="shield-account"
          onPress={() => router.push('/(screens)/matriz-permisos')}
          tooltip="Matriz de Permisos"
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Botón Matriz de Permisos */}
        <Surface style={styles.matrizBtn} elevation={1} onTouchEnd={() => router.push('/(screens)/matriz-permisos')}>
          <MaterialCommunityIcons name="shield-account-outline" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              Matriz de Permisos por Rol
            </Text>
            <Text variant="bodySmall" style={{ color: '#6b7280' }}>
              Configura qué módulos puede ver cada rol
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
        </Surface>

        {/* Usuarios Activos */}
        {activos.length > 0 && (
          <View>
            <Text variant="labelMedium" style={styles.sectionLabel}>
              ACTIVOS ({activos.length})
            </Text>
            {activos.map(renderUsuario)}
          </View>
        )}

        {/* Usuarios Inactivos (pendientes) */}
        {inactivos.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text variant="labelMedium" style={[styles.sectionLabel, { color: '#ef4444' }]}>
              PENDIENTES DE ACTIVACIÓN ({inactivos.length})
            </Text>
            {inactivos.map(renderUsuario)}
          </View>
        )}

        {usuarios.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>
            No hay usuarios registrados aún.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  sectionLabel: {
    color: '#6b7280', fontWeight: 'bold', letterSpacing: 0.5,
    marginBottom: 8, marginTop: 4,
  },
  card: { borderRadius: 14, marginBottom: 4, backgroundColor: '#fff' },
  cardContent: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 4,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: 8, gap: 4 },
  rolChip: { alignSelf: 'flex-start', height: 24 },
  statusDot: { paddingHorizontal: 8, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  matrizBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 14, backgroundColor: '#fff',
    marginBottom: 16,
  },
});

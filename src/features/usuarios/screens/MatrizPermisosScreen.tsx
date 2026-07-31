import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Text, useTheme, Switch, Surface, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { MODULOS_CONFIG, ROLES_CONFIG } from '@core/auth/types';
import type { UserRole, AppModulo } from '@core/auth/types';

const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#7c3aed',
  operador: '#2563eb',
  chofer: '#16a34a',
  vendedor: '#d97706',
};

export function MatrizPermisosScreen() {
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const { data: permisos = [] } = useQuery(
    `SELECT rol, modulo, habilitado FROM rol_permisos ORDER BY rol, modulo`
  );

  // Build a lookup: { 'operador.dashboard': true, ... }
  const lookup = (permisos as any[]).reduce((acc: Record<string, boolean>, p: any) => {
    acc[`${p.rol}.${p.modulo}`] = p.habilitado === 1;
    return acc;
  }, {});

  const handleToggle = async (rol: UserRole, modulo: AppModulo, valorActual: boolean) => {
    // Admin siempre tiene todos los permisos — no se puede editar
    if (rol === 'admin') {
      Toast.show({ type: 'info', text1: 'Rol Admin', text2: 'El rol Admin siempre tiene acceso total.' });
      return;
    }
    try {
      await powerSync.execute(
        `UPDATE rol_permisos SET habilitado = ? WHERE rol = ? AND modulo = ?`,
        [valorActual ? 0 : 1, rol, modulo]
      );
    } catch (e) {
      console.error('Error actualizando permiso:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el permiso.' });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Matriz de Permisos" subtitle="Por Rol de Usuario" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scroll} horizontal={false}>

        {/* Leyenda de roles */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leyendaScroll}>
          {ROLES_CONFIG.map(rol => (
            <View key={rol.key} style={[styles.rolBadge, { backgroundColor: `${ROLE_COLORS[rol.key]}22` }]}>
              <View style={[styles.rolDot, { backgroundColor: ROLE_COLORS[rol.key] }]} />
              <Text variant="labelSmall" style={{ color: ROLE_COLORS[rol.key], fontWeight: 'bold' }}>
                {rol.label}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Una sección por módulo */}
        {MODULOS_CONFIG.map((mod, idx) => (
          <Surface key={mod.key} style={styles.moduloCard} elevation={1}>
            {/* Nombre del módulo */}
            <View style={styles.moduloHeader}>
              <View style={[styles.moduloIconBox, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name={mod.icon as any} size={18} color={theme.colors.primary} />
              </View>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#1f2937', flex: 1 }}>
                {mod.label}
              </Text>
            </View>

            <Divider style={{ marginVertical: 8 }} />

            {/* Switches por rol */}
            <View style={styles.switchesRow}>
              {ROLES_CONFIG.map(rol => {
                const activo = rol.key === 'admin' ? true : (lookup[`${rol.key}.${mod.key}`] ?? false);
                return (
                  <View key={rol.key} style={styles.switchCell}>
                    <Text variant="labelSmall" style={{ color: ROLE_COLORS[rol.key], fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
                      {rol.label}
                    </Text>
                    <Switch
                      value={activo}
                      onValueChange={() => handleToggle(rol.key, mod.key, activo)}
                      color={ROLE_COLORS[rol.key]}
                      disabled={rol.key === 'admin'}
                    />
                  </View>
                );
              })}
            </View>
          </Surface>
        ))}

        <Text variant="bodySmall" style={styles.footer}>
          * Los cambios se sincronizan automáticamente con todos los dispositivos.{'\n'}
          * El rol Admin siempre tiene acceso total y no puede ser modificado.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  leyendaScroll: { marginBottom: 8 },
  rolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginRight: 8,
  },
  rolDot: { width: 8, height: 8, borderRadius: 4 },
  moduloCard: { borderRadius: 14, padding: 14, backgroundColor: '#fff' },
  moduloHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moduloIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  switchesRow: {
    flexDirection: 'row', justifyContent: 'space-around',
  },
  switchCell: { alignItems: 'center', flex: 1 },
  footer: {
    color: '#9ca3af', textAlign: 'center', marginTop: 8, lineHeight: 18,
  },
});

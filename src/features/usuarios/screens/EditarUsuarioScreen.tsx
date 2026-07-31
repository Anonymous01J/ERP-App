import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Text, useTheme, Switch, Button, RadioButton, Surface } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { useAuth } from '@state/AuthProvider';
import Toast from 'react-native-toast-message';
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

export function EditarUsuarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();
  const { perfil: miPerfil } = useAuth();
  const [saving, setSaving] = useState(false);

  const { data: usuarios = [] } = useQuery(
    `SELECT id, nombre, rol, activo FROM perfiles WHERE id = ?`,
    [id]
  );

  const usuario = (usuarios as any[])[0];
  const [rolSeleccionado, setRolSeleccionado] = useState<UserRole>('operador');
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    if (usuario) {
      setRolSeleccionado(usuario.rol as UserRole);
      setActivo(usuario.activo === 1);
    }
  }, [usuario?.id]);

  const handleGuardar = async () => {
    if (!id) return;
    // Evitar que el admin se desactive a sí mismo
    if (id === miPerfil?.id && !activo) {
      Toast.show({ type: 'error', text1: 'Acción no permitida', text2: 'No puedes desactivar tu propia cuenta.' });
      return;
    }
    setSaving(true);
    try {
      await powerSync.execute(
        `UPDATE perfiles SET rol = ?, activo = ? WHERE id = ?`,
        [rolSeleccionado, activo ? 1 : 0, id]
      );
      Toast.show({ type: 'success', text1: 'Usuario actualizado', text2: `${usuario?.nombre}: ${ROLES_CONFIG.find(r => r.key === rolSeleccionado)?.label} · ${activo ? 'Activo' : 'Inactivo'}` });
      router.back();
    } catch (e) {
      console.error('Error editando usuario:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo guardar el cambio.' });
    } finally {
      setSaving(false);
    }
  };

  if (!usuario) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Cargando usuario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={saving} />
        <Appbar.Content title="Editar Usuario" subtitle={usuario.nombre} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Info del usuario */}
        <Surface style={styles.infoCard} elevation={1}>
          <View style={[styles.avatar, { backgroundColor: `${ROLE_COLORS[rolSeleccionado]}22` }]}>
            <MaterialCommunityIcons name="account" size={36} color={ROLE_COLORS[rolSeleccionado]} />
          </View>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', textAlign: 'center', marginTop: 8 }}>
            {usuario.nombre}
          </Text>
        </Surface>

        {/* Estado Activo / Inactivo */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.switchRow}>
            <View>
              <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>Estado de la cuenta</Text>
              <Text variant="bodySmall" style={{ color: '#6b7280', marginTop: 2 }}>
                {activo ? '✅ El usuario puede ingresar a la app' : '🔒 El usuario no puede ingresar'}
              </Text>
            </View>
            <Switch
              value={activo}
              onValueChange={setActivo}
              color={theme.colors.primary}
            />
          </View>
        </Surface>

        {/* Selector de Rol */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="labelMedium" style={styles.sectionTitle}>ROL DEL USUARIO</Text>
          <RadioButton.Group
            onValueChange={(val) => setRolSeleccionado(val as UserRole)}
            value={rolSeleccionado}
          >
            {ROLES_CONFIG.map(rol => (
              <RadioButton.Item
                key={rol.key}
                label={rol.label}
                value={rol.key}
                disabled={rol.key === 'admin' && miPerfil?.id === id}
                labelStyle={{ color: ROLE_COLORS[rol.key], fontWeight: 'bold' }}
              />
            ))}
          </RadioButton.Group>
        </Surface>

        <Button
          mode="contained"
          onPress={handleGuardar}
          loading={saving}
          disabled={saving}
          style={styles.btn}
          contentStyle={{ paddingVertical: 6 }}
          icon="content-save"
        >
          Guardar Cambios
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  infoCard: {
    borderRadius: 16, padding: 24, alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  section: {
    borderRadius: 14, padding: 16, backgroundColor: '#fff',
  },
  sectionTitle: {
    color: '#6b7280', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  btn: { borderRadius: 14, marginTop: 8 },
});

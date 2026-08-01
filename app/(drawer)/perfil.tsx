import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { Text, Avatar, Button, useTheme, Divider, List } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/state/AuthProvider';
import { usePushNotifications } from '../../src/core/hooks/usePushNotifications';
import { supabase } from '../../src/core/supabase/client';
import Toast from 'react-native-toast-message';

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  chofer: 'Chofer',
  vendedor: 'Vendedor',
};

const ROL_ICONS: Record<string, string> = {
  admin: 'shield-crown',
  operador: 'account-hard-hat',
  chofer: 'steering',
  vendedor: 'account-tie',
};

export default function PerfilRoute() {
  const theme = useTheme();
  const { session, perfil, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { expoPushToken } = usePushNotifications(session?.user?.id);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [togglingNotif, setTogglingNotif] = useState(false);

  const rolLabel = ROL_LABELS[perfil?.rol ?? ''] ?? perfil?.rol ?? 'Usuario';
  const rolIcon = ROL_ICONS[perfil?.rol ?? ''] ?? 'account';

  const handleToggleNotifications = async (value: boolean) => {
    if (togglingNotif) return;
    setTogglingNotif(true);
    try {
      if (!value) {
        // Desactivar: eliminar el token de la DB
        if (expoPushToken && session?.user?.id) {
          const { error } = await supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', session.user.id)
            .eq('token', expoPushToken);
          if (error) throw error;
        }
        setNotifEnabled(false);
        Toast.show({ type: 'info', text1: 'Notificaciones desactivadas' });
      } else {
        // Activar: el token se volverá a guardar al próximo inicio de sesión.
        // Por ahora simplemente intentamos re-guardar el token actual si lo tenemos.
        if (expoPushToken && session?.user?.id) {
          const { error } = await supabase.from('push_tokens').upsert(
            { user_id: session.user.id, token: expoPushToken, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,token' }
          );
          if (error) throw error;
        }
        setNotifEnabled(true);
        Toast.show({ type: 'success', text1: 'Notificaciones activadas' });
      }
    } catch (err) {
      console.error('[PerfilRoute] Error toggling notifications:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar las notificaciones.' });
    } finally {
      setTogglingNotif(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header de perfil */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Avatar.Icon size={80} icon={rolIcon} style={styles.avatar} color="#fff" />
          <Text variant="headlineSmall" style={styles.nombre}>{perfil?.nombre ?? 'Usuario'}</Text>
          <View style={styles.rolBadge}>
            <Text variant="labelMedium" style={styles.rolText}>{rolLabel}</Text>
          </View>
          <Text variant="bodySmall" style={styles.email}>{session?.user?.email ?? ''}</Text>
        </View>

        {/* Info adicional */}
        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>Información de la cuenta</Text>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Nombre</Text>
            <Text variant="bodyMedium" style={styles.infoValue}>{perfil?.nombre ?? '—'}</Text>
          </View>
          <Divider />
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Correo</Text>
            <Text variant="bodyMedium" style={styles.infoValue}>{session?.user?.email ?? '—'}</Text>
          </View>
          <Divider />
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Rol</Text>
            <Text variant="bodyMedium" style={[styles.infoValue, { color: theme.colors.primary, fontWeight: 'bold' }]}>
              {rolLabel}
            </Text>
          </View>
        </View>

        {/* Notificaciones */}
        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>Preferencias</Text>
          <List.Item
            title="Notificaciones Push"
            description={notifEnabled ? 'Recibirás alertas en tiempo real' : 'Las alertas están silenciadas'}
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            right={() => (
              <Switch
                value={notifEnabled}
                onValueChange={handleToggleNotifications}
                disabled={togglingNotif || !expoPushToken}
                trackColor={{ false: '#d1d5db', true: theme.colors.primary }}
                thumbColor="#fff"
              />
            )}
          />
          {!expoPushToken && (
            <Text variant="bodySmall" style={styles.tokenWarning}>
              ⚠️ No se detectó un token de notificación en este dispositivo.
            </Text>
          )}
        </View>

        {/* Cerrar sesión */}
        <View style={styles.section}>
          <Button
            mode="contained"
            onPress={signOut}
            style={styles.logoutButton}
            buttonColor={theme.colors.error}
            icon="logout"
          >
            Cerrar Sesión
          </Button>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { paddingBottom: 32 },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatar: { backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  nombre: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  rolBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rolText: { color: '#fff', fontWeight: 'bold' },
  email: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: { color: '#6b7280' },
  infoValue: { color: '#1f2937', textAlign: 'right', flex: 1, marginLeft: 8 },
  tokenWarning: { color: '#d97706', marginTop: 4, marginLeft: 16, marginBottom: 4 },
  logoutButton: { marginTop: 4 },
});

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@state/AuthProvider';

export function CuentaInactivaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { perfil, signOut } = useAuth();

  return (
    <Surface
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* Icono */}
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
          <MaterialCommunityIcons
            name="account-clock"
            size={64}
            color={theme.colors.secondary}
          />
        </View>

        {/* Título */}
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Cuenta Pendiente
        </Text>

        {/* Mensaje */}
        <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
          Hola{perfil?.nombre ? `, ${perfil.nombre}` : ''}. Tu cuenta fue registrada exitosamente, pero aún está pendiente de activación por el administrador del sistema.
        </Text>

        <Surface style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={theme.colors.primary}
            style={{ marginBottom: 8 }}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, textAlign: 'center' }}>
            Contacta al administrador para que active tu acceso. Una vez activado, podrás ingresar a la app.
          </Text>
        </Surface>

        <Button
          mode="outlined"
          onPress={signOut}
          style={styles.signOutBtn}
          icon="logout"
        >
          Cerrar Sesión
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  signOutBtn: {
    marginTop: 24,
    borderRadius: 12,
  },
});

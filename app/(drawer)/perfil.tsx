import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, Button, useTheme } from 'react-native-paper';
import { useAuth } from '../../src/state/AuthProvider';

export default function PerfilRoute() {
  const theme = useTheme();
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={80} icon="account" />
        <Text variant="headlineMedium" style={styles.title}>Administrador</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>{session?.user?.email || 'admin@erp.com'}</Text>
      </View>

      <View style={styles.content}>
        <Button mode="contained" onPress={signOut} style={styles.logoutButton} buttonColor={theme.colors.error}>
          Cerrar Sesión
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { alignItems: 'center', padding: 32, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { marginTop: 16, fontWeight: 'bold' },
  subtitle: { color: '#666', marginTop: 4 },
  content: { padding: 24, flex: 1, justifyContent: 'flex-end' },
  logoutButton: { borderRadius: 8, paddingVertical: 8 },
});

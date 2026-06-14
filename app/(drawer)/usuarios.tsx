import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar, useTheme } from 'react-native-paper';

export default function UsuariosRoute() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text variant="titleLarge">Gestión de Usuarios (Próximamente)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
});

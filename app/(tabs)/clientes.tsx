import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, useTheme, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/CustomCard';
import { StatusBarBadge, StatusType } from '@components/StatusBarBadge';

export default function ClientesScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Mock data
  const clientes = [
    { id: '1', nombre: 'Distribuidora Norte', telefono: '0414-1234567', deuda: 120, estado: 'credito' as StatusType },
    { id: '2', nombre: 'Papelera Central', telefono: '0424-9876543', deuda: 0, estado: 'credito' as StatusType },
    { id: '3', nombre: 'Librería Escolar', telefono: '0412-4567890', deuda: 350, estado: 'atrasado' as StatusType },
    { id: '4', nombre: 'Inversiones Sur', telefono: '0416-2345678', deuda: 80, estado: 'por_vencer' as StatusType },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {clientes.map(cliente => (
          <CustomCard key={cliente.id}>
            <View style={styles.cardContent}>
              <View style={styles.avatarContainer}>
                <Avatar.Text size={48} label={cliente.nombre.substring(0, 2).toUpperCase()} />
              </View>
              <View style={styles.textContainer}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{cliente.nombre}</Text>
                <Text variant="bodyMedium" style={{ color: '#666' }}>{cliente.telefono}</Text>
                <View style={styles.statusRow}>
                  <Text variant="titleSmall" style={{ color: cliente.deuda > 0 ? theme.colors.error : theme.colors.primary }}>
                    Deuda: ${cliente.deuda}
                  </Text>
                  {cliente.deuda > 0 && <StatusBarBadge status={cliente.estado} />}
                </View>
              </View>
            </View>
          </CustomCard>
        ))}
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
});

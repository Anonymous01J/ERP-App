import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, useTheme, IconButton, Divider, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import { StatusBarBadge, StatusType } from '@components/ui/StatusBarBadge';

export function ClientesDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Mock data
  const clientes = [
    { 
      id: '1', nombre: 'Distribuidora Norte', telefono: '0414-1234567', deuda: 120, estado: 'credito' as StatusType,
      historial: [
        { id: 'h1', fecha: '05/06/2026', descripcion: 'Pedido #041', monto: 120, tipo: 'cargo' },
        { id: 'h2', fecha: '01/06/2026', descripcion: 'Abono en Efectivo', monto: 50, tipo: 'abono' },
      ]
    },
    { 
      id: '2', nombre: 'Papelera Central', telefono: '0424-9876543', deuda: 0, estado: 'credito' as StatusType,
      historial: [
        { id: 'h3', fecha: '28/05/2026', descripcion: 'Pedido #039', monto: 200, tipo: 'cargo' },
        { id: 'h4', fecha: '28/05/2026', descripcion: 'Pago Total Zelle', monto: 200, tipo: 'abono' },
      ]
    },
    { 
      id: '3', nombre: 'Librería Escolar', telefono: '0412-4567890', deuda: 350, estado: 'atrasado' as StatusType,
      historial: [
        { id: 'h5', fecha: '10/05/2026', descripcion: 'Pedido #032', monto: 350, tipo: 'cargo' },
      ]
    },
    { 
      id: '4', nombre: 'Inversiones Sur', telefono: '0416-2345678', deuda: 80, estado: 'por_vencer' as StatusType,
      historial: [
        { id: 'h6', fecha: '15/05/2026', descripcion: 'Pedido #035', monto: 80, tipo: 'cargo' },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {clientes.map(cliente => {
          const isExpanded = expandedId === cliente.id;
          return (
            <CustomCard key={cliente.id} style={styles.cardWrapper}>
              <TouchableOpacity onPress={() => toggleExpand(cliente.id)} activeOpacity={0.7}>
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
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.historyContainer}>
                  <Divider style={styles.divider} />
                  <Text variant="titleSmall" style={styles.historyTitle}>Historial Reciente</Text>
                  
                  {cliente.historial.map(hist => (
                    <View key={hist.id} style={styles.historyRow}>
                      <Text variant="bodySmall" style={styles.histFecha}>{hist.fecha}</Text>
                      <Text variant="bodySmall" style={styles.histDesc} numberOfLines={1}>{hist.descripcion}</Text>
                      <Text variant="bodySmall" style={[
                        styles.histMonto, 
                        { color: hist.tipo === 'abono' ? '#16a34a' : theme.colors.error }
                      ]}>
                        {hist.tipo === 'abono' ? '+' : '-'}${hist.monto}
                      </Text>
                    </View>
                  ))}
                  
                  <View style={styles.actionsRow}>
                    <Button mode="contained-tonal" compact onPress={() => {}} style={{ flex: 1, marginRight: 8 }}>
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
  cardWrapper: {
    marginBottom: 12,
  },
  historyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    marginBottom: 12,
  },
  historyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  histFecha: {
    width: 80,
    color: '#888',
  },
  histDesc: {
    flex: 1,
    paddingHorizontal: 8,
  },
  histMonto: {
    fontWeight: 'bold',
    width: 60,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, Text, ProgressBar, Button, useTheme } from 'react-native-paper';
import { CustomCard } from '@components/CustomCard';
import { StatusBarBadge, StatusType } from '@components/StatusBarBadge';

export default function PedidosScreen() {
  const theme = useTheme();
  const [filtro, setFiltro] = useState('Todos');

  const filtros = ['Todos', 'Pendientes', 'Por Vencer', 'Atrasados'];

  // Mock data - All orders are on credit (1 installment, 30 days)
  const pedidos = [
    { id: '1', cliente: 'Distribuidora Norte', status: 'en_produccion' as StatusType, fechaVencimiento: '2026-07-06', deuda: 200, abonado: 0 },
    { id: '2', cliente: 'Papelera Central', status: 'credito' as StatusType, fechaVencimiento: '2026-06-20', deuda: 100, abonado: 40 },
    { id: '3', cliente: 'Librería Escolar', status: 'por_vencer' as StatusType, fechaVencimiento: '2026-06-10', deuda: 50, abonado: 0 },
    { id: '4', cliente: 'Inversiones Sur', status: 'atrasado' as StatusType, fechaVencimiento: '2026-05-15', deuda: 80, abonado: 20 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filtros.map(f => (
            <Chip
              key={f}
              selected={filtro === f}
              onPress={() => setFiltro(f)}
              style={styles.chip}
              showSelectedOverlay
            >
              {f}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {pedidos.map(pedido => {
          const total = pedido.deuda + pedido.abonado;
          const progress = pedido.abonado / total;

          return (
            <CustomCard key={pedido.id}>
              <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{pedido.cliente}</Text>
                  <StatusBarBadge status={pedido.status} />
                </View>
                
                <Text variant="bodyMedium" style={styles.dueDate}>
                  Vence: {pedido.fechaVencimiento}
                </Text>

                <View style={styles.creditoSection}>
                  <View style={styles.progressLabelRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.error }}>Restan: ${pedido.deuda}</Text>
                    <Text variant="bodySmall" style={{ color: '#2E7D32' }}>Abonado: ${pedido.abonado}</Text>
                  </View>
                  <ProgressBar progress={progress} color="#4CAF50" style={styles.progressBar} />
                  
                  <View style={styles.actionRow}>
                    <Button mode="contained-tonal" style={styles.actionButton} onPress={() => console.log('Registrar Abono')}>
                      Abonar
                    </Button>
                    <Button mode="outlined" style={styles.actionButton} onPress={() => console.log('Ver Detalles')}>
                      Detalles
                    </Button>
                  </View>
                </View>
              </View>
            </CustomCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chip: {
    marginHorizontal: 4,
  },
  scrollContent: {
    padding: 8,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  dueDate: {
    color: '#666',
    marginBottom: 12,
  },
  creditoSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
  },
});
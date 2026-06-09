import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, Text, ProgressBar, Button, useTheme, SegmentedButtons, Divider } from 'react-native-paper';
import { CustomCard } from '@components/ui/CustomCard';
import { StatusBarBadge, StatusType } from '@components/ui/StatusBarBadge';
import { Pedido } from '@features/pedidos/types/pedidos.types';

export function PedidosDashboardScreen() {
  const theme = useTheme();
  const [vista, setVista] = useState('logistica');
  const [filtroLogistica, setFiltroLogistica] = useState('Todos');
  const [filtroFinanzas, setFiltroFinanzas] = useState('Todos');

  const filtrosLog = ['Todos', 'Pendiente', 'En Producción', 'Listo'];
  const filtrosFin = ['Todos', 'Crédito', 'Por Vencer', 'Atrasado'];

  // Mock data separating physical flow from financial flow
  const pedidos: Pedido[] = [
    { id: '1', cliente: 'Distribuidora Norte', estadoFisico: 'pendiente', estadoFinanciero: null, fechaVencimiento: '2026-07-06', deuda: 200, abonado: 0, items: [{ cantidad: 300, presentacion: '2.5kg', papel: 'Papel A' }] },
    { id: '5', cliente: 'Almacén Don Pepe', estadoFisico: 'en_produccion', estadoFinanciero: null, fechaVencimiento: '2026-07-10', deuda: 300, abonado: 0, items: [{ cantidad: 500, presentacion: '600g', papel: 'Kraft' }] },
    { id: '6', cliente: 'Supermercado Sol', estadoFisico: 'listo', estadoFinanciero: null, fechaVencimiento: '2026-07-08', deuda: 150, abonado: 0, items: [{ cantidad: 100, presentacion: '5kg', papel: 'Papel B' }] },
    { id: '2', cliente: 'Papelera Central', estadoFisico: 'entregado', estadoFinanciero: 'credito', fechaVencimiento: '2026-06-20', deuda: 100, abonado: 40, items: [{ cantidad: 100, presentacion: '1kg', papel: 'Papel B' }, { cantidad: 50, presentacion: '600g', papel: 'Papel A' }] },
    { id: '3', cliente: 'Librería Escolar', estadoFisico: 'entregado', estadoFinanciero: 'por_vencer', fechaVencimiento: '2026-06-10', deuda: 50, abonado: 0, items: [{ cantidad: 50, presentacion: '5kg', papel: 'Kraft' }] },
    { id: '4', cliente: 'Inversiones Sur', estadoFisico: 'entregado', estadoFinanciero: 'atrasado', fechaVencimiento: '2026-05-15', deuda: 80, abonado: 20, items: [{ cantidad: 200, presentacion: '600g', papel: 'Papel A' }] },
  ];

  // Filtering Logic
  const renderLogistica = () => {
    const logisticaPedidos = pedidos.filter(p => p.estadoFisico !== 'entregado');
    const filtered = filtroLogistica === 'Todos' ? logisticaPedidos : logisticaPedidos.filter(p => {
      if (filtroLogistica === 'Pendiente') return p.estadoFisico === 'pendiente';
      if (filtroLogistica === 'En Producción') return p.estadoFisico === 'en_produccion';
      if (filtroLogistica === 'Listo') return p.estadoFisico === 'listo';
      return true;
    });

    return filtered.map(pedido => (
      <CustomCard key={pedido.id}>
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{pedido.cliente}</Text>
            {/* Fallback to simple styled text if status not strictly in StatusType */}
            <View style={[styles.badge, { backgroundColor: pedido.estadoFisico === 'listo' ? '#4ade80' : '#fcd34d' }]}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: pedido.estadoFisico === 'listo' ? '#fff' : '#854d0e' }}>
                {pedido.estadoFisico.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>
          
          <View style={{ marginBottom: 16 }}>
            {pedido.items.map((item, index) => (
              <Text key={index} variant="bodyMedium" style={{ color: '#444' }}>
                • {item.cantidad} x {item.presentacion} ({item.papel})
              </Text>
            ))}
          </View>

          <Divider style={{ marginBottom: 12 }} />

          <View style={styles.actionRow}>
            {pedido.estadoFisico === 'pendiente' && (
              <Button mode="contained-tonal" icon="package-variant-closed" style={styles.actionButton} onPress={() => console.log('Asignar Stock')}>
                Asignar Stock
              </Button>
            )}
            {pedido.estadoFisico === 'en_produccion' && (
              <Button mode="outlined" style={styles.actionButton} onPress={() => console.log('Ver Detalles Producción')}>
                Ver Asignación
              </Button>
            )}
          </View>
        </View>
      </CustomCard>
    ));
  };

  const renderFinanzas = () => {
    const finanzasPedidos = pedidos.filter(p => p.estadoFisico === 'entregado' && p.estadoFinanciero);
    const filtered = filtroFinanzas === 'Todos' ? finanzasPedidos : finanzasPedidos.filter(p => {
      if (filtroFinanzas === 'Crédito') return p.estadoFinanciero === 'credito';
      if (filtroFinanzas === 'Por Vencer') return p.estadoFinanciero === 'por_vencer';
      if (filtroFinanzas === 'Atrasado') return p.estadoFinanciero === 'atrasado';
      return true;
    });

    return filtered.map(pedido => {
      const total = pedido.deuda + pedido.abonado;
      const progress = pedido.abonado / total;

      return (
        <CustomCard key={pedido.id}>
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{pedido.cliente}</Text>
              <StatusBarBadge status={pedido.estadoFinanciero as StatusType} />
            </View>
            
            <View style={{ marginBottom: 8 }}>
              <Text variant="bodySmall" style={{ color: '#888' }}>Pedido Entregado - Deuda a 30 días</Text>
            </View>

            <Text variant="bodySmall" style={styles.dueDate}>
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
                  Ver Pedido
                </Button>
                {pedido.estadoFinanciero === 'por_vencer' && (
                  <Button mode="outlined" style={styles.actionButton} onPress={() => console.log('Notificar')}>
                    Recordatorio
                  </Button>
                )}
                {pedido.estadoFinanciero === 'atrasado' && (
                  <Button mode="outlined" style={styles.actionButton} onPress={() => console.log('Notificar')}>
                    Notificar
                  </Button>
                )}
              </View>
            </View>
          </View>
        </CustomCard>
      );
    });
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={vista}
          onValueChange={setVista}
          buttons={[
            { value: 'logistica', label: 'Logística Física', icon: 'package-variant' },
            { value: 'finanzas', label: 'Cuentas x Cobrar', icon: 'cash-multiple' },
          ]}
        />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(vista === 'logistica' ? filtrosLog : filtrosFin).map(f => (
            <Chip
              key={f}
              selected={(vista === 'logistica' ? filtroLogistica : filtroFinanzas) === f}
              onPress={() => vista === 'logistica' ? setFiltroLogistica(f) : setFiltroFinanzas(f)}
              style={styles.chip}
              showSelectedOverlay
            >
              {f}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {vista === 'logistica' && (
          <Button 
            mode="contained" 
            icon="auto-fix" 
            style={{ marginBottom: 8, marginHorizontal: 8 }}
            onPress={() => console.log('Asignación Masiva: Recorriendo pedidos en orden FIFO y asignando stock libre disponible según la presentación y tipo de papel...')}
          >
            Asignar Stock Masivo (FIFO)
          </Button>
        )}
        {vista === 'logistica' ? renderLogistica() : renderFinanzas()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  segmentContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  filtersContainer: {
    paddingBottom: 12,
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
    paddingBottom: 24,
    gap: 8,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, FAB, useTheme, Avatar, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import { LineChart } from 'react-native-gifted-charts';

export function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [fabOpen, setFabOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('Semana');

  // Mock data
  const metrics = {
    pedidosPorProducir: 15,
    produccionHoy: 450,
    pedidosListos: 5,
    pagosPorVencer: 2,
    pagosVencidos: 1,
  };

  // Chart data mock
  const lineData = [
    { value: 100, label: 'Lun' },
    { value: 200, label: 'Mar' },
    { value: 150, label: 'Mie' },
    { value: 300, label: 'Jue' },
    { value: 250, label: 'Vie' },
    { value: 400, label: 'Sab' },
  ];

  const lineData2 = [
    { value: 50, label: 'Lun' },
    { value: 150, label: 'Mar' },
    { value: 100, label: 'Mie' },
    { value: 200, label: 'Jue' },
    { value: 180, label: 'Vie' },
    { value: 250, label: 'Sab' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Alertas Financieras */}
        {(metrics.pagosPorVencer > 0 || metrics.pagosVencidos > 0) && (
          <CustomCard style={{ backgroundColor: '#FFF3E0' }}>
            <View style={styles.alertContent}>
              <Avatar.Icon size={40} icon="alert" style={{ backgroundColor: '#FFB74D' }} color="#fff" />
              <View style={styles.textContainer}>
                <Text variant="titleMedium" style={{ color: '#E65100', fontWeight: 'bold' }}>Alertas de Cobranza</Text>
                <Text variant="bodyMedium" style={{ color: '#E65100' }}>
                  {metrics.pagosPorVencer} pagos por vencer esta semana.
                  {metrics.pagosVencidos > 0 && `\n${metrics.pagosVencidos} pagos VENCIDOS.`}
                </Text>
              </View>
            </View>
          </CustomCard>
        )}

        {/* Gráfico Financiero */}
        <CustomCard>
          <View style={styles.chartHeader}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>
              Evolución de Liquidez ($)
            </Text>
            <SegmentedButtons
              value={chartPeriod}
              onValueChange={setChartPeriod}
              buttons={[
                { value: 'Día', label: 'Día' },
                { value: 'Semana', label: 'Semana' },
                { value: 'Mes', label: 'Mes' },
              ]}
              density="small"
            />
          </View>
          
          <View style={styles.chartContainer}>
            <LineChart
              areaChart
              curved
              data={lineData}
              data2={lineData2}
              height={220}
              width={Dimensions.get('window').width - 60}
              spacing={50}
              initialSpacing={20}
              endSpacing={20}
              
              // Estilo Entradas
              color1={theme.colors.primary}
              startFillColor1={theme.colors.primary}
              endFillColor1={theme.colors.primary}
              startOpacity1={0.3}
              endOpacity1={0.05}
              
              // Estilo Salidas
              color2={theme.colors.error}
              startFillColor2={theme.colors.error}
              endFillColor2={theme.colors.error}
              startOpacity2={0.3}
              endOpacity2={0.05}
              
              thickness={3}
              hideDataPoints
              showVerticalLines={false}
              hideRules
              
              xAxisColor="transparent"
              yAxisColor="transparent"
              yAxisTextStyle={{ color: '#666', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#666', fontSize: 10, textAlign: 'center' }}
              
              disableScroll={false}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'rgba(0,0,0,0.1)',
                pointerStripWidth: 2,
                pointerColor: theme.colors.primary,
                radius: 6,
                pointerLabelWidth: 120,
                pointerLabelHeight: 90,
                activatePointersOnLongPress: false,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: items => {
                  if (!items || items.length === 0) return null;
                  const item = items[0];
                  // Asegurar que exista el segundo punto antes de renderizar
                  const item2 = items.length > 1 ? items[1] : null;
                  return (
                    <View
                      style={{
                        backgroundColor: theme.colors.surface,
                        padding: 10,
                        borderRadius: 8,
                        justifyContent: 'center',
                        width: 120,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
                        elevation: 3,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                      }}
                    >
                      <Text style={{fontWeight: 'bold', textAlign: 'center', color: theme.colors.onSurface, marginBottom: 4}}>{item.label || ''}</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                          <View style={{height: 8, width: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginRight: 8}}/>
                          <Text style={{color: theme.colors.onSurface, fontSize: 12}}>
                              Entradas: ${item.value}
                          </Text>
                      </View>
                      {item2 && (
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                            <View style={{height: 8, width: 8, borderRadius: 4, backgroundColor: theme.colors.error, marginRight: 8}}/>
                            <Text style={{color: theme.colors.onSurface, fontSize: 12}}>
                                Salidas: ${item2.value}
                            </Text>
                        </View>
                      )}
                    </View>
                  );
                },
              }}
            />
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text variant="bodySmall">Entradas</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
                <Text variant="bodySmall">Salidas</Text>
              </View>
            </View>
          </View>
        </CustomCard>

        <CustomCard>
          <View style={styles.cardContent}>
            <Avatar.Icon size={48} icon="clipboard-list-outline" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
            <View style={styles.textContainer}>
              <Text variant="titleMedium">Pedidos por Producir</Text>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{metrics.pedidosPorProducir}</Text>
            </View>
          </View>
        </CustomCard>

        <CustomCard>
          <View style={styles.cardContent}>
            <Avatar.Icon size={48} icon="factory" style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />
            <View style={styles.textContainer}>
              <Text variant="titleMedium">Producción Hoy (Rollos)</Text>
              <Text variant="headlineMedium" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>{metrics.produccionHoy}</Text>
            </View>
          </View>
        </CustomCard>

        <CustomCard>
          <View style={styles.cardContent}>
            <Avatar.Icon size={48} icon="package-check" style={{ backgroundColor: theme.colors.tertiaryContainer }} color={theme.colors.onTertiaryContainer} />
            <View style={styles.textContainer}>
              <Text variant="titleMedium">Pedidos Listos (Para Despacho)</Text>
              <Text variant="headlineMedium" style={{ color: theme.colors.tertiary, fontWeight: 'bold' }}>{metrics.pedidosListos}</Text>
            </View>
          </View>
        </CustomCard>
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'plus',
            label: 'Nuevo Pedido',
            onPress: () => router.push('/(screens)/nuevo-pedido'),
          },
          {
            icon: 'account-plus',
            label: 'Registrar Cliente',
            onPress: () => router.push('/(screens)/registrar-cliente'),
          },
          {
            icon: 'truck-plus',
            label: 'Registrar Viaje',
            onPress: () => router.push('/(screens)/registrar-viaje'),
          },
          {
            icon: 'cash-plus',
            label: 'Añadir Gasto',
            onPress: () => router.push('/(screens)/registrar-gasto'),
          },
          {
            icon: 'cog-refresh-outline',
            label: 'Registrar Producción',
            onPress: () => router.push('/(screens)/registrar-produccion'),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        onPress={() => {
          if (fabOpen) {
            // open actions
          }
        }}
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
    paddingBottom: 100, // Make room for FAB
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  textContainer: {
    marginLeft: 16,
    flex: 1,
  },
  chartHeader: {
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  segmented: {
    flex: 0.5,
  },
  chartContainer: {
    paddingBottom: 16,
    paddingRight: 16,
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
});

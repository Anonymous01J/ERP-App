import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  SegmentedButtons, List, Text, Button, Divider,
  useTheme, Dialog, Portal, TextInput, ProgressBar,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@ui/CustomCard';
import { usePowerSync, useQuery } from '@powersync/react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

export function InventarioDashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const [tab, setTab] = useState('bobinas');

  // --- Dialog de merma ---
  const [dialogVisible, setDialogVisible] = useState(false);
  const [bobinaSeleccionada, setBobinaSeleccionada] = useState<any>(null);
  const [mermaKg, setMermaKg] = useState('');
  const [pesoMuertoKg, setPesoMuertoKg] = useState('');
  const [savingMerma, setSavingMerma] = useState(false);

  // --- Queries ---
  const { data: bobinasActivas = [] } = useQuery(`
    SELECT bg.id, bg.tipo_papel, bg.peso_inicial_kg, bg.peso_actual_kg,
           bg.merma_core_kg, bg.peso_muerto_kg, bg.costo_bobina,
           bg.fecha_llegada, bg.estado, bg.id_viaje_compra
    FROM bobinas_grandes bg
    WHERE bg.estado IN ('disponible', 'en_uso')
    ORDER BY bg.fecha_llegada ASC
  `);

  const { data: presentaciones = [] } = useQuery(`
    SELECT id, nombre, stock_unidades_sueltas, rollos_por_paquete, precio_USD
    FROM productos_presentacion
    WHERE estado = 'activo'
    ORDER BY peso_nominal_g ASC
  `);

  const { data: potesActivos = [] } = useQuery(`
    SELECT id, capacidad, stock_unidades, precio_venta_usd
    FROM inventario_potes
    WHERE estado = 'activo'
    ORDER BY capacidad ASC
  `);

  // Total kg disponibles en inventario
  const totalKgInventario = (bobinasActivas as any[]).reduce(
    (acc, b) => acc + (b.peso_actual_kg ?? b.peso_inicial_kg ?? 0), 0
  );

  const handleAbrirMerma = (bobina: any) => {
    setBobinaSeleccionada(bobina);
    setMermaKg('');
    setPesoMuertoKg('');
    setDialogVisible(true);
  };

  const handleGuardarMerma = async () => {
    const merma = parseFloat(mermaKg) || 0;
    const muerto = parseFloat(pesoMuertoKg) || 0;
    if (merma <= 0 && muerto <= 0) {
      Toast.show({ type: 'error', text1: 'Ingresa al menos un valor de merma o peso muerto.' });
      return;
    }
    setSavingMerma(true);
    try {
      const pesoActual = bobinaSeleccionada.peso_actual_kg ?? bobinaSeleccionada.peso_inicial_kg;
      const nuevoPeso = Math.max(0, pesoActual - merma - muerto);
      const nuevoEstado = nuevoPeso <= 0 ? 'agotada' : 'en_uso';

      await powerSync.execute(
        `UPDATE bobinas_grandes SET
           peso_actual_kg = ?,
           merma_core_kg = COALESCE(merma_core_kg, 0) + ?,
           peso_muerto_kg = COALESCE(peso_muerto_kg, 0) + ?,
           estado = ?
         WHERE id = ?`,
        [nuevoPeso, merma, muerto, nuevoEstado, bobinaSeleccionada.id]
      );

      Toast.show({
        type: 'success',
        text1: nuevoEstado === 'agotada' ? 'Bobina Agotada' : 'Merma Registrada',
        text2: `Peso actual: ${nuevoPeso.toFixed(1)} kg`,
      });
      setDialogVisible(false);
    } catch (error) {
      console.error('Error registrando merma:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar la bobina.' });
    } finally {
      setSavingMerma(false);
    }
  };

  const renderBobinas = () => (
    <View>
      {/* Resumen de inventario */}
      <CustomCard style={styles.resumenCard}>
        <View style={styles.resumenContent}>
          <View style={styles.resumenItem}>
            <MaterialCommunityIcons name="archive-outline" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {(bobinasActivas as any[]).length}
            </Text>
            <Text variant="bodySmall" style={styles.resumenLabel}>Bobinas activas</Text>
          </View>
          <View style={styles.resumenDivider} />
          <View style={styles.resumenItem}>
            <MaterialCommunityIcons name="weight-kilogram" size={28} color={theme.colors.secondary} />
            <Text variant="headlineMedium" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>
              {totalKgInventario.toFixed(0)}
            </Text>
            <Text variant="bodySmall" style={styles.resumenLabel}>kg disponibles</Text>
          </View>
          <View style={styles.resumenDivider} />
          <View style={styles.resumenItem}>
            <MaterialCommunityIcons name="alpha-a-circle" size={28} color="#6366f1" />
            <Text variant="headlineMedium" style={{ color: '#6366f1', fontWeight: 'bold' }}>
              {(bobinasActivas as any[]).filter((b: any) => b.tipo_papel === 'A').length}
            </Text>
            <Text variant="bodySmall" style={styles.resumenLabel}>Tipo A</Text>
          </View>
          <View style={styles.resumenDivider} />
          <View style={styles.resumenItem}>
            <MaterialCommunityIcons name="alpha-b-circle" size={28} color="#f59e0b" />
            <Text variant="headlineMedium" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
              {(bobinasActivas as any[]).filter((b: any) => b.tipo_papel === 'B').length}
            </Text>
            <Text variant="bodySmall" style={styles.resumenLabel}>Tipo B</Text>
          </View>
        </View>
      </CustomCard>

      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Bobinas en Inventario</Text>
        <Button mode="text" compact onPress={() => router.push('/(screens)/historial-bobinas')}>
          Ver Historial
        </Button>
      </View>

      {(bobinasActivas as any[]).length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="archive-off-outline" size={48} color="#d1d5db" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No hay bobinas en inventario.
          </Text>
          <Text variant="bodySmall" style={{ color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
            Las bobinas se agregan al registrar un viaje de compra y completarlo.
          </Text>
        </View>
      ) : (
        (bobinasActivas as any[]).map((bobina: any) => {
          const pesoActual = bobina.peso_actual_kg ?? bobina.peso_inicial_kg ?? 0;
          const pesoInicial = bobina.peso_inicial_kg ?? 1;
          const progreso = Math.max(0, Math.min(1, pesoActual / pesoInicial));
          const mermaTotal = (bobina.merma_core_kg ?? 0) + (bobina.peso_muerto_kg ?? 0);
          const esEnUso = bobina.estado === 'en_uso';

          return (
            <List.Accordion
              key={bobina.id}
              title={`Tipo ${bobina.tipo_papel} — ${pesoActual.toFixed(1)} kg restantes`}
              description={`Inicial: ${pesoInicial} kg · ${new Date(bobina.fecha_llegada).toLocaleDateString('es-VE')}`}
              left={props => (
                <List.Icon
                  {...props}
                  icon={esEnUso ? 'archive-arrow-up' : 'archive-outline'}
                  color={bobina.tipo_papel === 'A' ? '#6366f1' : '#f59e0b'}
                />
              )}
              style={styles.accordion}
              titleStyle={{ fontWeight: 'bold' }}
            >
              <View style={styles.accordionContent}>
                {/* Barra de progreso de kilos */}
                <View style={styles.progressRow}>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>Consumo</Text>
                  <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                    {(pesoInicial - pesoActual).toFixed(1)} / {pesoInicial} kg
                  </Text>
                </View>
                <ProgressBar
                  progress={1 - progreso}
                  color={progreso < 0.25 ? theme.colors.error : progreso < 0.5 ? '#f59e0b' : theme.colors.primary}
                  style={styles.progressBar}
                />

                <Divider style={{ marginVertical: 12 }} />

                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={styles.detailLabel}>Kg Disponibles</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{pesoActual.toFixed(1)} kg</Text>
                </View>
                {mermaTotal > 0 && (
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.detailLabel}>Total merma + core</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.error }}>{mermaTotal.toFixed(1)} kg</Text>
                  </View>
                )}
                {bobina.costo_bobina > 0 && (
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.detailLabel}>Costo Bobina</Text>
                    <Text variant="bodyMedium">${bobina.costo_bobina?.toFixed(2)} USD</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                  <Button
                    mode="outlined"
                    icon="alert-circle-outline"
                    compact
                    onPress={() => handleAbrirMerma(bobina)}
                    style={{ borderRadius: 8 }}
                  >
                    Registrar Merma / Core
                  </Button>
                </View>
              </View>
            </List.Accordion>
          );
        })
      )}
    </View>
  );

  const renderRollos = () => (
    <View>
      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Rollos Empaquetados</Text>
        <View>
          <Button mode="text" compact onPress={() => router.push('/(screens)/historial-produccion')}>Historial</Button>
          <Button mode="text" compact onPress={() => router.push('/(screens)/gestionar-presentaciones')}>Gestionar</Button>
        </View>
      </View>
      {(presentaciones as any[]).length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge" style={styles.emptyText}>No hay presentaciones activas.</Text>
        </View>
      ) : (
        (presentaciones as any[]).map(prod => {
          const sueltos = prod.stock_unidades_sueltas ?? 0;
          const paquetes = prod.rollos_por_paquete > 0 ? Math.floor(sueltos / prod.rollos_por_paquete) : 0;
          return (
            <CustomCard key={prod.id}>
              <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{prod.nombre}</Text>
                    <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                      {sueltos} rollos sueltos · {paquetes} paquetes ({prod.rollos_por_paquete}×)
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    ${prod.precio_USD?.toFixed(2)}
                  </Text>
                </View>
              </View>
            </CustomCard>
          );
        })
      )}
    </View>
  );

  const renderPotes = () => (
    <View>
      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Inventario de Potes</Text>
        <Button mode="text" icon="cog" compact onPress={() => router.push('/(screens)/gestionar-potes')}>
          Gestionar
        </Button>
      </View>
      {(potesActivos as any[]).length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge" style={styles.emptyText}>No hay potes activos.</Text>
        </View>
      ) : (
        (potesActivos as any[]).map(pote => (
          <CustomCard key={pote.id}>
            <View style={styles.cardContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Pote {pote.capacidad}</Text>
                  <Text variant="bodyMedium" style={{ color: pote.stock_unidades < 20 ? theme.colors.error : '#6b7280' }}>
                    {pote.stock_unidades} unidades en stock
                    {pote.stock_unidades < 20 ? ' ⚠️ Stock bajo' : ''}
                  </Text>
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  ${pote.precio_venta_usd?.toFixed(2)}
                </Text>
              </View>
            </View>
          </CustomCard>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'bobinas', label: 'Bobinas', icon: 'archive-outline' },
            { value: 'terminado', label: 'Rollos', icon: 'package-variant' },
            { value: 'potes', label: 'Potes', icon: 'cup' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === 'bobinas' && renderBobinas()}
        {tab === 'terminado' && renderRollos()}
        {tab === 'potes' && renderPotes()}
      </ScrollView>

      {/* Dialog Merma */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Registrar Merma / Core</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 4, color: '#6b7280' }}>
              Bobina Tipo {bobinaSeleccionada?.tipo_papel} —{' '}
              <Text style={{ fontWeight: 'bold', color: '#111' }}>
                {(bobinaSeleccionada?.peso_actual_kg ?? bobinaSeleccionada?.peso_inicial_kg ?? 0).toFixed(1)} kg actuales
              </Text>
            </Text>
            <Text variant="bodySmall" style={{ color: '#9ca3af', marginBottom: 16 }}>
              Ingresa los kilos que se perdieron por merma (papel roto/sobrante) y/o por el core (tubo vacío).
            </Text>
            <TextInput
              mode="outlined"
              label="Merma (kg)"
              value={mermaKg}
              onChangeText={setMermaKg}
              keyboardType="decimal-pad"
              left={<TextInput.Icon icon="alert-circle-outline" />}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              mode="outlined"
              label="Peso Muerto / Core (kg)"
              value={pesoMuertoKg}
              onChangeText={setPesoMuertoKg}
              keyboardType="decimal-pad"
              left={<TextInput.Icon icon="recycle" />}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={savingMerma}>Cancelar</Button>
            <Button mode="contained" onPress={handleGuardarMerma} loading={savingMerma} disabled={savingMerma}>
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  segmentContainer: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  scrollContent: { padding: 8, paddingBottom: 32 },
  resumenCard: { marginBottom: 12 },
  resumenContent: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 16 },
  resumenItem: { alignItems: 'center', flex: 1, gap: 4 },
  resumenLabel: { color: '#6b7280', textAlign: 'center' },
  resumenDivider: { width: 1, height: 50, backgroundColor: '#e5e7eb' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 4, marginVertical: 8 },
  sectionTitle: { fontWeight: 'bold', color: '#1f2937' },
  accordion: { backgroundColor: '#ffffff', marginBottom: 6, borderRadius: 10 },
  accordionContent: { padding: 16, backgroundColor: '#FAFAFA', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressBar: { height: 8, borderRadius: 4, marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { color: '#6b7280' },
  cardContent: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 48, padding: 24 },
  emptyText: { color: '#9ca3af', marginTop: 12, textAlign: 'center' },
});

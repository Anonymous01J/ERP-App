import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { List, Text, Button, useTheme, Chip, IconButton, TextInput, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CustomCard } from '@components/ui/CustomCard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';

// Subcomponente para el formulario de gastos dentro de un viaje activo
const GastoViajeForm = ({ theme }: { theme: any }) => {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [esIngreso, setEsIngreso] = useState(false);
  const [moneda, setMoneda] = useState('VES');

  return (
    <CustomCard style={styles.inputCard}>
      <Text variant="titleSmall" style={{ marginBottom: 8, color: '#555', paddingHorizontal: 8 }}>
        Registrar Gasto Rápido
      </Text>
      
      <View style={styles.inputRow}>
        <TextInput
          mode="flat"
          placeholder="Descripción..."
          value={descripcion}
          onChangeText={setDescripcion}
          style={[styles.textInput, { flex: 1, backgroundColor: 'transparent' }]}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        <Button mode="outlined" icon="calendar" compact style={styles.dateBtn} labelStyle={{ marginHorizontal: 8 }}>
          09/06
        </Button>
      </View>
      
      <Divider style={styles.divider} />

      <View style={styles.inputRow}>
        <TextInput
          mode="flat"
          placeholder={`Monto en ${moneda}`}
          value={monto}
          onChangeText={setMonto}
          keyboardType="numeric"
          style={[styles.textInput, { flex: 1, backgroundColor: 'transparent' }]}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
        />
        
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, { backgroundColor: esIngreso ? '#4ade80' : '#f87171' }]}
            onPress={() => setEsIngreso(!esIngreso)}
          >
            <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 12 }}>
              {esIngreso ? '+ Ingreso' : '- Egreso'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.toggleBtn, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => setMoneda(moneda === 'VES' ? 'USD' : 'VES')}
          >
            <Text style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              {moneda}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#4ade80' }]} onPress={() => {
            Toast.show({
              type: 'info',
              text1: 'En desarrollo',
              text2: 'El registro de gastos se conectará pronto.',
            });
          }}>
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </CustomCard>
  );
};

export function ViajesDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();
  const [filtro, setFiltro] = useState('Todos');

  const filtros = ['Todos', 'Compras (Bobinas)', 'Entregas (Pedidos)'];

  const filterToQuery = {
    'Todos': '',
    'Compras (Bobinas)': "AND tipo_viaje = 'compra'",
    'Entregas (Pedidos)': "AND tipo_viaje = 'entrega'"
  };

  const { data: viajesActivos = [] } = useQuery(
    `SELECT * FROM viajes WHERE estado != 'completado' ${filterToQuery[filtro as keyof typeof filterToQuery]} ORDER BY fecha_viaje_inicio DESC`
  );

  const { data: viajesPasados = [] } = useQuery(
    `SELECT * FROM viajes WHERE estado = 'completado' ${filterToQuery[filtro as keyof typeof filterToQuery]} ORDER BY fecha_viaje_inicio DESC`
  );

  const formatFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Fecha desconocida';
    const date = new Date(fechaStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatearEstadoUi = (estado: string) => {
    switch(estado) {
      case 'en_progreso': return 'En Tránsito (Ida)';
      case 'en_destino': return 'En Destino';
      case 'retornando': return 'Retornando a Base';
      case 'completado': return 'Completado';
      default: return estado;
    }
  };

  const getNextStateInfo = (estadoActual: string) => {
    switch(estadoActual) {
      case 'en_progreso': return { next: 'en_destino', label: 'Llegué a Destino', field: 'fecha_viaje_llegada_destino' };
      case 'en_destino': return { next: 'retornando', label: 'Iniciar Retorno', field: 'fecha_viaje_retorno' };
      case 'retornando': return { next: 'completado', label: 'Llegué a Base (Fin)', field: 'fecha_viaje_llegada_base' };
      default: return null;
    }
  };

  const handleAvanzarEstado = async (id: string, estadoActual: string) => {
    const info = getNextStateInfo(estadoActual);
    if (!info) return;

    try {
      const now = new Date().toISOString();
      await powerSync.execute(
        `UPDATE viajes SET estado = ?, ${info.field} = ? WHERE id = ?`,
        [info.next, now, id]
      );
      Toast.show({
        type: 'success',
        text1: 'Estado actualizado',
        text2: `Viaje marcado como: ${formatearEstadoUi(info.next)}.`,
      });
    } catch (error) {
      console.error('Error avanzando viaje:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo actualizar el viaje.',
      });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        
        {/* VIAJES ACTIVOS */}
        {viajesActivos.length > 0 && (
          <List.Section>
            <Text variant="titleMedium" style={styles.sectionHeader}>Viajes en Curso</Text>
            {viajesActivos.map((viaje) => {
              const nextStateInfo = getNextStateInfo(viaje.estado);
              return (
                <List.Accordion
                  key={viaje.id}
                  title={viaje.tipo_viaje === 'compra' ? `Compra: ${viaje.destino_origen || 'No definido'}` : `Entrega: Pedidos (Múltiples)`}
                  description={`${formatFecha(viaje.fecha_viaje_inicio)} • ${formatearEstadoUi(viaje.estado)}`}
                  left={props => <List.Icon {...props} icon={viaje.tipo_viaje === 'compra' ? 'inbox-arrow-down' : 'truck-delivery'} color={viaje.tipo_viaje === 'compra' ? theme.colors.primary : theme.colors.tertiary} />}
                  style={styles.accordion}
                  titleStyle={{ fontWeight: 'bold' }}
                >
                  <View style={styles.accordionContent}>
                    {viaje.notas ? (
                      <Text variant="bodyMedium" style={styles.detailText}>Notas: <Text style={{fontWeight:'bold'}}>{viaje.notas}</Text></Text>
                    ) : null}
                    
                    {/* Formulario de Gastos */}
                    <View style={{ marginTop: 16 }}>
                      <GastoViajeForm theme={theme} />
                    </View>
                    
                    <View style={styles.actionRow}>
                      {nextStateInfo && (
                        <Button mode="contained" onPress={() => handleAvanzarEstado(viaje.id, viaje.estado)} style={styles.actionButton}>
                          {nextStateInfo.label}
                        </Button>
                      )}
                    </View>
                  </View>
                </List.Accordion>
              );
            })}
          </List.Section>
        )}

        {/* HISTORIAL DE VIAJES */}
        {viajesPasados.length > 0 && (
          <List.Section>
            <Text variant="titleMedium" style={[styles.sectionHeader, { marginTop: 16 }]}>Historial Completado</Text>
            {viajesPasados.map((viaje) => (
              <List.Accordion
                key={viaje.id}
                title={viaje.tipo_viaje === 'compra' ? `Compra: ${viaje.destino_origen || 'No definido'}` : `Entrega: Pedidos`}
                description={`${formatFecha(viaje.fecha_viaje_inicio)} • Completado`}
                left={props => <List.Icon {...props} icon={viaje.tipo_viaje === 'compra' ? 'inbox-arrow-down' : 'truck-delivery'} color="#888" />}
                style={styles.accordion}
                titleStyle={{ fontWeight: 'bold', color: '#555' }}
              >
                <View style={styles.accordionContent}>
                  {viaje.notas ? (
                    <Text variant="bodyMedium" style={styles.detailText}>Notas: <Text style={{fontWeight:'bold'}}>{viaje.notas}</Text></Text>
                  ) : null}
                  <Text variant="bodySmall" style={styles.detailText}>Llegada a base: {formatFecha(viaje.fecha_viaje_llegada_base)}</Text>
                </View>
              </List.Accordion>
            ))}
          </List.Section>
        )}

        {viajesActivos.length === 0 && viajesPasados.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>No hay viajes registrados en esta categoría.</Text>
        )}
      </ScrollView>

      <IconButton
        icon="truck-plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        style={styles.fab}
        onPress={() => router.push('/(screens)/registrar-viaje')}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chip: {
    marginHorizontal: 4,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginLeft: 8,
    marginBottom: 8,
    color: '#333',
  },
  accordion: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    borderRadius: 8,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailText: {
    marginBottom: 4,
    color: '#444',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
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
  // Estilos copiados para el formulario de gasto rápido
  inputCard: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 0,
    shadowOpacity: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  textInput: {
    height: 48,
    fontSize: 14,
  },
  dateBtn: {
    borderRadius: 8,
    borderColor: '#e0e0e0',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

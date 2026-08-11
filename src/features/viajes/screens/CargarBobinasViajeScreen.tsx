import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { globalStyles } from '@core/theme/globalStyles';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Appbar, useTheme, Divider, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import Toast from 'react-native-toast-message';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Menu } from 'react-native-paper';
import { CurrencyInput } from '@components/ui/CurrencyInput';
import { parseCurrency } from '@core/utils/currency';
import { getTasaDolarBCV } from '@core/api/dolar';

interface FilaBobina {
  key: string;
  idTipoPapel: string | null;
  pesoKg: string;
  costo: string;
  moneda: 'USD' | 'VES';
}

interface FilaProducto {
  key: string;
  idProducto: string | null;
  cantidadRecibida: string;
  costo: string;
  moneda: 'USD' | 'VES';
}

export function CargarBobinasViajeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();
  const params = useLocalSearchParams();
  const idViaje = params.id as string;
  const proveedorId = params.proveedorId as string;
  const paradaCompraId = params.paradaCompraId as string;

  const [seccionActiva, setSeccionActiva] = useState('bobinas');

  // --- Bobinas ---
  const { data: tiposPapel = [] } = useQuery('SELECT id, nombre FROM tipos_papel WHERE estado = ? ORDER BY nombre ASC', ['activo']);
  const [filas, setFilas] = useState<FilaBobina[]>([
    { key: uuidv4(), idTipoPapel: null, pesoKg: '', costo: '', moneda: 'USD' },
  ]);
  const [menusVisibles, setMenusVisibles] = useState<Record<string, boolean>>({});
  const [tasaActual, setTasaActual] = useState(1);

  React.useEffect(() => {
    getTasaDolarBCV().then(tasa => setTasaActual(tasa)).catch(console.error);
  }, []);

  // --- Productos ---
  const { data: productosReventa = [] } = useQuery("SELECT id, nombre_producto, descripcion FROM productos_reventa WHERE estado = 'activo' ORDER BY nombre_producto ASC");
  const [filasPotes, setFilasPotes] = useState<FilaProducto[]>([
    { key: uuidv4(), idProducto: null, cantidadRecibida: '', costo: '', moneda: 'USD' },
  ]);
  const [menusProductos, setMenusProductos] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  // --- Handlers Bobinas ---
  const handleAgregarFila = () => setFilas(prev => [...prev, { key: uuidv4(), idTipoPapel: null, pesoKg: '', costo: '', moneda: 'USD' }]);
  const handleEliminarFila = (key: string) => {
    if (filas.length === 1) return;
    setFilas(prev => prev.filter(f => f.key !== key));
  };
  const handleCambiarTipo = (key: string, idTipoPapel: string) => {
    setFilas(prev => prev.map(f => f.key === key ? { ...f, idTipoPapel } : f));
  };
  const handleCambiarPeso = (key: string, valor: string) => {
    setFilas(prev => prev.map(f => f.key === key ? { ...f, pesoKg: valor } : f));
  };
  const handleCambiarCosto = (key: string, valor: string) => {
    setFilas(prev => prev.map(f => f.key === key ? { ...f, costo: valor } : f));
  };
  const handleCambiarMoneda = (key: string, valor: 'USD'|'VES') => {
    setFilas(prev => prev.map(f => f.key === key ? { ...f, moneda: valor } : f));
  };

  // --- Handlers Potes ---
  const handleAgregarFilaPote = () => setFilasPotes(prev => [...prev, { key: uuidv4(), idProducto: null, cantidadRecibida: '', costo: '', moneda: 'USD' }]);
  const handleEliminarFilaPote = (key: string) => {
    if (filasPotes.length === 1) return;
    setFilasPotes(prev => prev.filter(p => p.key !== key));
  };
  const handleCambiarProducto = (key: string, idProducto: string) => {
    setFilasPotes(prev => prev.map(p => p.key === key ? { ...p, idProducto } : p));
  };
  const handleCambiarCantidadPote = (key: string, valor: string) => {
    setFilasPotes(prev => prev.map(p => p.key === key ? { ...p, cantidadRecibida: valor } : p));
  };
  const handleCambiarCostoPote = (key: string, valor: string) => {
    setFilasPotes(prev => prev.map(p => p.key === key ? { ...p, costo: valor } : p));
  };
  const handleCambiarMonedaPote = (key: string, valor: 'USD'|'VES') => {
    setFilasPotes(prev => prev.map(p => p.key === key ? { ...p, moneda: valor } : p));
  };

  const handleConfirmarCarga = async () => {
    // Filtrar filas que el usuario intentó llenar (tienen algún dato)
    const filasIntentadas = filas.filter(f => f.idTipoPapel || f.pesoKg.trim() !== '' || f.costo.trim() !== '');
    const potesIntentados = filasPotes.filter(p => p.idProducto || p.cantidadRecibida.trim() !== '' || p.costo.trim() !== '');

    const filasValidas = filasIntentadas.filter(f => f.idTipoPapel && f.pesoKg.trim() !== '' && parseFloat(f.pesoKg) > 0);
    const potesConCantidad = potesIntentados.filter(p => p.idProducto && p.cantidadRecibida.trim() !== '' && parseInt(p.cantidadRecibida) > 0);

    if (filasValidas.length === 0 && potesConCantidad.length === 0) {
      Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Ingresa al menos una bobina o producto válido.' });
      return;
    }

    if (filasIntentadas.length !== filasValidas.length) {
      Toast.show({ type: 'error', text1: 'Bobinas Incompletas', text2: 'Selecciona el tipo de papel y un peso mayor a 0 para cada bobina.' });
      return;
    }
    if (potesIntentados.length !== potesConCantidad.length) {
      Toast.show({ type: 'error', text1: 'Productos Incompletos', text2: 'Selecciona el producto y una cantidad mayor a 0 para cada fila.' });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      // Guardar bobinas y generar movimientos
      for (const fila of filasValidas) {
        const pesoKg = parseFloat(fila.pesoKg);
        const costoMonto = fila.costo ? parseCurrency(fila.costo) : 0;
        
        let costoUSD = 0;
        if (costoMonto > 0) {
           costoUSD = fila.moneda === 'USD' ? costoMonto : costoMonto / tasaActual;
        }

        const idBobina = uuidv4();
        await powerSync.execute(
          `INSERT INTO bobinas_grandes (id, id_viaje_compra, id_proveedor, peso_inicial_kg, id_tipo_papel, peso_actual_kg, fecha_llegada, estado, peso_muerto_kg, merma_core_kg, costo_bobina)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'disponible', 0, 0, ?)`,
          [idBobina, idViaje, proveedorId, pesoKg, fila.idTipoPapel, pesoKg, now, costoUSD]
        );

        if (costoMonto > 0) {
           const tipoPapel = (tiposPapel as any[]).find(t => t.id === fila.idTipoPapel)?.nombre || 'Papel';
           await powerSync.execute(
             `INSERT INTO movimientos (id, descripcion, monto, moneda, tasa_cambio, categoria, fecha, id_viaje, tipo)
              VALUES (?, ?, ?, ?, ?, 'suministros', ?, ?, 'egreso')`,
             [uuidv4(), `Compra de Bobina (${pesoKg}kg) - ${tipoPapel}`, costoMonto, fila.moneda, tasaActual, now, idViaje]
           );
        }
      }

      // Obtener nombre del proveedor para el historial
      let nombreProveedor = 'Proveedor';
      if (proveedorId) {
        const provResult = await powerSync.getAll('SELECT nombre_empresa FROM proveedores WHERE id = ?', [proveedorId]);
        if (provResult.length > 0) nombreProveedor = provResult[0].nombre_empresa;
      }

      for (const pote of potesConCantidad) {
        const cantidad = parseInt(pote.cantidadRecibida);
        const costoMonto = pote.costo ? parseCurrency(pote.costo) : 0;
        
        let unitPriceUsd = 0;
        if (costoMonto > 0 && cantidad > 0) {
          const costoTotalUsd = pote.moneda === 'USD' ? costoMonto : (costoMonto / tasaActual);
          unitPriceUsd = costoTotalUsd / cantidad;
        }

        if (unitPriceUsd > 0) {
          await powerSync.execute(
            `UPDATE productos_reventa SET stock_unidades = stock_unidades + ?, precio_compra_usd = ? WHERE id = ?`,
            [cantidad, unitPriceUsd, pote.idProducto]
          );
        } else {
          await powerSync.execute(
            `UPDATE productos_reventa SET stock_unidades = stock_unidades + ? WHERE id = ?`,
            [cantidad, pote.idProducto]
          );
        }

        await powerSync.execute(
          `INSERT INTO historial_productos (id, id_producto, cantidad, tipo, origen, referencia_id, entidad_relacionada, fecha)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            pote.idProducto,
            cantidad,
            'entrada',
            'viaje_compra',
            idViaje,
            nombreProveedor,
            now
          ]
        );

        if (costoMonto > 0) {
          const nom = (productosReventa as any[]).find(pr => pr.id === pote.idProducto)?.nombre_producto || 'Producto';
          await powerSync.execute(
            `INSERT INTO movimientos (id, descripcion, monto, moneda, tasa_cambio, categoria, fecha, id_viaje, tipo)
             VALUES (?, ?, ?, ?, ?, 'suministros', ?, ?, 'egreso')`,
            [uuidv4(), `Compra: ${pote.cantidadRecibida}x ${nom}`, costoMonto, pote.moneda, tasaActual, now, idViaje]
          );
        }
      }

      if (paradaCompraId) {
        // Viaje con múltiples paradas (estado de parada)
        await powerSync.execute(
          `UPDATE compras_viaje SET estado = 'completado', hora_llegada = ? WHERE id = ?`,
          [now, paradaCompraId]
        );
      } else {
        // Viaje legacy (estado global)
        await powerSync.execute(
          `UPDATE viajes SET estado = 'retornando', fecha_viaje_retorno = ? WHERE id = ?`,
          [now, idViaje]
        );
      }

      const resumenBobinas = filasValidas.length > 0 ? `${filasValidas.length} bobina(s)` : '';
      const resumenPotes = potesConCantidad.length > 0 ? `${potesConCantidad.length} producto(s)` : '';
      const resumen = [resumenBobinas, resumenPotes].filter(Boolean).join(' y ');

      Toast.show({
        type: 'success',
        text1: 'Carga Registrada',
        text2: `${resumen} añadidos al inventario.`,
      });
      setTimeout(() => router.back(), 500);
    } catch (error) {
      console.error('Error registrando mercancía:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema al guardar la mercancía.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetornarSinCarga = () => {
    Alert.alert(
      'Parada sin Carga',
      '¿Confirmas que no hubo mercancía disponible? La parada se marcará como completada sin registrar nada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const now = new Date().toISOString();
              if (paradaCompraId) {
                await powerSync.execute(
                  `UPDATE compras_viaje SET estado = 'completado', hora_llegada = ? WHERE id = ?`,
                  [now, paradaCompraId]
                );
              } else {
                await powerSync.execute(
                  `UPDATE viajes SET estado = 'retornando', fecha_viaje_retorno = ? WHERE id = ?`,
                  [now, idViaje]
                );
              }
              Toast.show({ type: 'info', text1: 'Parada Completada', text2: 'Se registró la parada sin carga.' });
              setTimeout(() => router.back(), 500);
            } catch {
              Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el viaje.' });
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const totalKg = filas.reduce((acc, f) => acc + (parseFloat(f.pesoKg) || 0), 0);
  const costoTotalBobinasUSD = filas.reduce((acc, f) => {
    const val = f.costo ? parseCurrency(f.costo) : 0;
    return acc + (f.moneda === 'USD' ? val : val / tasaActual);
  }, 0);

  const totalPotes = filasPotes.reduce((acc, p) => acc + (parseInt(p.cantidadRecibida) || 0), 0);
  const costoTotalPotesUSD = filasPotes.reduce((acc, p) => {
    const val = p.costo ? parseCurrency(p.costo) : 0;
    return acc + (p.moneda === 'USD' ? val : val / tasaActual);
  }, 0);

  const totalCostoUSD = costoTotalBobinasUSD + costoTotalPotesUSD;
  const totalCostoVES = totalCostoUSD * tasaActual;
  const totalCostoSuma = totalCostoUSD;

  return (
    <View style={globalStyles.containerWhite}>
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} disabled={isSaving} />
        <Appbar.Content title="Cargar Mercancía" subtitle="Registra el material adquirido" />
      </Appbar.Header>

      {/* Selector de sección */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={seccionActiva}
          onValueChange={setSeccionActiva}
          buttons={[
            { value: 'bobinas', label: 'Bobinas', icon: 'paper-roll' },
            { value: 'potes', label: 'Productos', icon: 'package-variant-closed' },
          ]}
        />
      </View>

      <KeyboardAvoidingView style={globalStyles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">

          {/* ===== SECCIÓN BOBINAS ===== */}
          {seccionActiva === 'bobinas' && (
            <>
              <Text variant="bodyMedium" style={styles.instruccion}>
                Agrega una fila por cada bobina grande que estás cargando al camión.
              </Text>

              <View style={styles.headerRow}>
                <Text variant="labelSmall" style={[styles.colHeader, { flex: 1.2 }]}>TIPO PAPEL</Text>
                <Text variant="labelSmall" style={[styles.colHeader, { flex: 0.8 }]}>PESO (kg)</Text>
                <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'center' }}>
                  <Text variant="labelSmall" style={styles.colHeader}>COSTO</Text>
                </View>
                <View style={{ width: 36 }} />
              </View>

              {filas.map((fila, index) => (
                <View key={fila.key}>
                  <View style={styles.filaContainer}>
                    <View style={[styles.numBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                      <Text style={[styles.numText, { color: theme.colors.onPrimaryContainer }]}>
                        #{index + 1}
                      </Text>
                    </View>

                    <View style={styles.filaInputs}>
                      <View style={styles.tipoRow}>
                        <Menu
                          visible={menusVisibles[fila.key] || false}
                          onDismiss={() => setMenusVisibles(prev => ({ ...prev, [fila.key]: false }))}
                          anchor={
                            <Button
                              mode="outlined"
                              onPress={() => setMenusVisibles(prev => ({ ...prev, [fila.key]: true }))}
                              icon="format-list-bulleted-type"
                              style={{ flex: 1, justifyContent: 'flex-start' }}
                              textColor={fila.idTipoPapel ? theme.colors.primary : '#555'}
                            >
                              {fila.idTipoPapel
                                ? (tiposPapel as any[]).find(t => t.id === fila.idTipoPapel)?.nombre || 'Seleccionado'
                                : 'Elegir Tipo'}
                            </Button>
                          }
                        >
                          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                            {(tiposPapel as any[]).map(tp => (
                              <Menu.Item
                                key={tp.id}
                                onPress={() => {
                                  handleCambiarTipo(fila.key, tp.id);
                                  setMenusVisibles(prev => ({ ...prev, [fila.key]: false }));
                                }}
                                title={tp.nombre}
                              />
                            ))}
                          </ScrollView>
                        </Menu>
                      </View>

                      <TextInput
                        mode="outlined"
                        label="Kg"
                        value={fila.pesoKg}
                        onChangeText={(val) => handleCambiarPeso(fila.key, val)}
                        style={[styles.pesoInput, { flex: 0.8 }]}
                        keyboardType="decimal-pad"
                      />

                      <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CurrencyInput
                          mode="outlined"
                          label="Costo"
                          value={fila.costo}
                          onChangeText={(val) => handleCambiarCosto(fila.key, val)}
                          style={{ flex: 1, height: 46 }}
                          left={fila.moneda === 'USD' ? <TextInput.Icon icon="currency-usd" /> : <TextInput.Icon icon={() => <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#555' }}>Bs.</Text>} />}
                        />
                        <TouchableOpacity
                          style={[styles.monedaToggle, { backgroundColor: fila.moneda === 'USD' ? '#1d4ed8' : theme.colors.primaryContainer }]}
                          onPress={() => handleCambiarMoneda(fila.key, fila.moneda === 'USD' ? 'VES' : 'USD')}
                        >
                          <Text style={[styles.monedaText, { color: fila.moneda === 'USD' ? '#fff' : theme.colors.primary }]}>
                            {fila.moneda}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleEliminarFila(fila.key)}
                      style={styles.deleteBtn}
                      disabled={filas.length === 1}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={22}
                        color={filas.length === 1 ? '#ccc' : theme.colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                  {index < filas.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}

              <Button mode="outlined" icon="plus" onPress={handleAgregarFila} style={styles.addBtn}>
                Añadir Bobina
              </Button>
            </>
          )}

          {/* ===== SECCIÓN POTES ===== */}
          {seccionActiva === 'potes' && (
            <>
              <Text variant="bodyMedium" style={styles.instruccion}>
                Agrega una fila por cada producto de reventa que estás cargando al camión.
              </Text>

              <View style={styles.headerRow}>
                <Text variant="labelSmall" style={[styles.colHeader, { flex: 1.2 }]}>PRODUCTO</Text>
                <Text variant="labelSmall" style={[styles.colHeader, { flex: 0.8 }]}>CANT.</Text>
                <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'center' }}>
                  <Text variant="labelSmall" style={styles.colHeader}>COSTO</Text>
                </View>
                <View style={{ width: 36 }} />
              </View>

              {filasPotes.map((fila, index) => (
                <View key={fila.key}>
                  <View style={styles.filaContainer}>
                    <View style={[styles.numBadge, { backgroundColor: '#e0f2fe' }]}>
                      <Text style={[styles.numText, { color: '#0284c7' }]}>
                        #{index + 1}
                      </Text>
                    </View>

                    <View style={styles.filaInputs}>
                      <View style={styles.tipoRow}>
                        <Menu
                          visible={menusProductos[fila.key] || false}
                          onDismiss={() => setMenusProductos(prev => ({ ...prev, [fila.key]: false }))}
                          anchor={
                            <Button
                              mode="outlined"
                              onPress={() => setMenusProductos(prev => ({ ...prev, [fila.key]: true }))}
                              icon="package-variant"
                              style={{ flex: 1, justifyContent: 'flex-start' }}
                              textColor={fila.idProducto ? theme.colors.primary : '#555'}
                            >
                              {fila.idProducto
                                ? (productosReventa as any[]).find(p => p.id === fila.idProducto)?.nombre_producto || 'Seleccionado'
                                : 'Elegir Producto'}
                            </Button>
                          }
                        >
                          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                            {(productosReventa as any[]).map(pr => (
                              <Menu.Item
                                key={pr.id}
                                onPress={() => {
                                  handleCambiarProducto(fila.key, pr.id);
                                  setMenusProductos(prev => ({ ...prev, [fila.key]: false }));
                                }}
                                title={pr.nombre_producto}
                              />
                            ))}
                          </ScrollView>
                        </Menu>
                      </View>

                      <TextInput
                        mode="outlined"
                        label="Cant."
                        value={fila.cantidadRecibida}
                        onChangeText={(val) => handleCambiarCantidadPote(fila.key, val)}
                        style={[styles.pesoInput, { flex: 0.8 }]}
                        keyboardType="number-pad"
                      />

                      <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CurrencyInput
                          mode="outlined"
                          label="Costo"
                          value={fila.costo}
                          onChangeText={(val) => handleCambiarCostoPote(fila.key, val)}
                          style={{ flex: 1, height: 46 }}
                          left={fila.moneda === 'USD' ? <TextInput.Icon icon="currency-usd" /> : <TextInput.Icon icon={() => <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#555' }}>Bs.</Text>} />}
                        />
                        <TouchableOpacity
                          style={[styles.monedaToggle, { backgroundColor: fila.moneda === 'USD' ? '#1d4ed8' : theme.colors.primaryContainer }]}
                          onPress={() => handleCambiarMonedaPote(fila.key, fila.moneda === 'USD' ? 'VES' : 'USD')}
                        >
                          <Text style={[styles.monedaText, { color: fila.moneda === 'USD' ? '#fff' : theme.colors.primary }]}>
                            {fila.moneda}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleEliminarFilaPote(fila.key)}
                      style={styles.deleteBtn}
                      disabled={filasPotes.length === 1}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={22}
                        color={filasPotes.length === 1 ? '#ccc' : theme.colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                  {index < filasPotes.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}

              <Button mode="outlined" icon="plus" onPress={handleAgregarFilaPote} style={[styles.addBtn, { borderColor: '#0284c7' }]} textColor="#0284c7">
                Añadir Producto
              </Button>
            </>
          )}

          {/* TOTAL GLOBAL DE LA CARGA */}
          {(totalKg > 0 || totalPotes > 0) && (
            <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 12, color: '#374151', fontWeight: 'bold' }}>Resumen Global de Carga</Text>
              
              {totalKg > 0 && (
                <View style={{ marginBottom: totalPotes > 0 || totalCostoSuma > 0 ? 12 : 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#4b5563' }}>Bobinas:</Text>
                    <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{totalKg.toLocaleString('es-VE')} kg <Text style={{fontWeight:'normal', fontSize:12, color:'#9ca3af'}}>({filas.filter(f => parseFloat(f.pesoKg) > 0).length})</Text></Text>
                  </View>
                  <View style={{ marginTop: 2 }}>
                    {filas
                      .filter(f => parseFloat(f.pesoKg) > 0)
                      .map((f, idx) => {
                        const nom = (tiposPapel as any[]).find(t => t.id === f.idTipoPapel)?.nombre || 'Sin asignar';
                        return (
                          <Text key={f.key || idx} style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic', marginBottom: 2 }}>
                            • {f.pesoKg} kg - {nom}
                          </Text>
                        );
                      })}
                  </View>
                </View>
              )}
              
              {totalPotes > 0 && (
                <View style={{ marginBottom: totalCostoSuma > 0 ? 12 : 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#4b5563' }}>Productos de Reventa:</Text>
                    <Text style={{ fontWeight: 'bold', color: '#0284c7' }}>{totalPotes.toLocaleString('es-VE')} unds <Text style={{fontWeight:'normal', fontSize:12, color:'#9ca3af'}}>({filasPotes.filter(f => parseInt(f.cantidadRecibida) > 0).length})</Text></Text>
                  </View>
                  <View style={{ marginTop: 2 }}>
                    {filasPotes
                      .filter(f => parseInt(f.cantidadRecibida) > 0)
                      .map((p, idx) => {
                        const nom = (productosReventa as any[]).find(pr => pr.id === p.idProducto)?.nombre_producto || 'Sin asignar';
                        return (
                          <Text key={p.key || idx} style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic', marginBottom: 2 }}>
                            • {p.cantidadRecibida}x {nom}
                          </Text>
                        );
                      })}
                  </View>
                </View>
              )}

              {totalCostoSuma > 0 && (
                <>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#6b7280' }}>Costo Total USD:</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>${totalCostoUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#6b7280' }}>Costo Total VES:</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Bs. {totalCostoVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[globalStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          mode="contained"
          onPress={handleConfirmarCarga}
          loading={isSaving}
          disabled={isSaving}
          style={globalStyles.saveButton}
          contentStyle={globalStyles.saveButtonContent}
          icon="check-circle"
        >
          Confirmar Carga y Retornar
        </Button>
        <Button
          mode="text"
          onPress={handleRetornarSinCarga}
          disabled={isSaving}
          textColor={theme.colors.error}
          style={{ marginTop: 8 }}
        >
          Retornar Sin Carga
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  formContainer: { padding: 24, paddingBottom: 40 },
  instruccion: { color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  colHeader: { color: '#9ca3af', fontWeight: 'bold', letterSpacing: 0.5 },
  filaContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  numBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  numText: { fontWeight: 'bold', fontSize: 12 },
  filaInputs: { flex: 1, gap: 8 },
  tipoRow: { flexDirection: 'row', gap: 8 },
  pesoInput: { marginBottom: 0 },
  deleteBtn: { padding: 8, marginLeft: 8 },
  divider: { marginVertical: 4, backgroundColor: '#f3f4f6' },
  addBtn: { marginTop: 16, borderStyle: 'dashed', borderRadius: 10 },
  totalCard: { marginTop: 24, padding: 20, borderRadius: 16, alignItems: 'center', gap: 4 },
  poteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  cantidadInput: { width: 90 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  monedaToggle: {
    width: 44, height: 44, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
  },
  monedaText: { fontWeight: 'bold', fontSize: 12 },
});

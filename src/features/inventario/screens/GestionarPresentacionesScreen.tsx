import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Button, Appbar, useTheme, TextInput, IconButton, List, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react';

// Generador de UUID v4 para la base de datos offline
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function GestionarPresentacionesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const powerSync = usePowerSync();

  // Consultar las presentaciones activas
  const { data: presentaciones } = powerSync.useQuery(
    `SELECT * FROM productos_presentacion WHERE estado = 'activo' ORDER BY nombre ASC`
  );

  const [nombre, setNombre] = useState('');
  const [pesoNominal, setPesoNominal] = useState('');
  const [pesoReal, setPesoReal] = useState('');
  const [unidades, setUnidades] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  const toggleMenu = (id: string) => {
    setMenuVisibleId(menuVisibleId === id ? null : id);
  };

  const resetForm = () => {
    setNombre('');
    setPesoNominal('');
    setPesoReal('');
    setUnidades('');
    setEditingId(null);
  };

  const handleEdit = (pres: any) => {
    setMenuVisibleId(null);
    setNombre(pres.nombre || '');
    setPesoNominal(pres.peso_nominal_g ? pres.peso_nominal_g.toString() : '');
    setPesoReal(pres.peso_real_g ? pres.peso_real_g.toString() : '');
    setUnidades(pres.rollos_por_paquete ? pres.rollos_por_paquete.toString() : '');
    setEditingId(pres.id);
  };

  const handleDeactivate = async (id: string) => {
    setMenuVisibleId(null);
    try {
      await powerSync.execute(
        `UPDATE productos_presentacion SET estado = 'inactivo' WHERE id = ?`,
        [id]
      );
    } catch (error) {
      console.error('Error desactivando presentación:', error);
      Alert.alert('Error', 'No se pudo eliminar la presentación.');
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim() || !pesoNominal || !pesoReal || !unidades) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    try {
      if (editingId) {
        await powerSync.execute(
          `UPDATE productos_presentacion 
           SET nombre = ?, peso_nominal_g = ?, peso_real_g = ?, rollos_por_paquete = ? 
           WHERE id = ?`,
          [nombre.trim(), parseInt(pesoNominal), parseInt(pesoReal), parseInt(unidades), editingId]
        );
      } else {
        const newId = uuidv4();
        await powerSync.execute(
          `INSERT INTO productos_presentacion (id, nombre, peso_nominal_g, peso_real_g, rollos_por_paquete, estado) 
           VALUES (?, ?, ?, ?, ?, 'activo')`,
          [newId, nombre.trim(), parseInt(pesoNominal), parseInt(pesoReal), parseInt(unidades)]
        );
      }
      resetForm();
    } catch (error) {
      console.error('Error guardando presentación:', error);
      Alert.alert('Error', 'Hubo un problema al guardar la presentación.');
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Tipos de Rollo (Presentaciones)" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text variant="titleMedium" style={styles.title}>
            {editingId ? 'Editar Presentación' : 'Nueva Presentación'}
          </Text>
          <View style={styles.formContainer}>
            <TextInput
              mode="outlined"
              label="Nombre (Ej. 600g)"
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Peso Nominal (g)"
                value={pesoNominal}
                onChangeText={setPesoNominal}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
              <TextInput
                mode="outlined"
                label="Peso Real (g)"
                value={pesoReal}
                onChangeText={setPesoReal}
                keyboardType="numeric"
                style={[styles.input, styles.half]}
              />
            </View>
            <TextInput
              mode="outlined"
              label="Unidades por Paquete"
              value={unidades}
              onChangeText={setUnidades}
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.actionButtons}>
              {editingId && (
                <Button mode="outlined" onPress={resetForm} style={[styles.button, { marginRight: 8 }]} textColor={theme.colors.error}>
                  Cancelar
                </Button>
              )}
              <Button mode="contained" onPress={handleGuardar} style={styles.button}>
                {editingId ? 'Guardar Cambios' : 'Agregar Presentación'}
              </Button>
            </View>
          </View>

          <Text variant="titleMedium" style={styles.title}>Presentaciones Activas</Text>
          {presentaciones.map(pres => (
            <List.Item
              key={pres.id}
              title={`Rollo ${pres.nombre}`}
              description={`Nominal: ${pres.peso_nominal_g}g | Real: ${pres.peso_real_g}g | ${pres.rollos_por_paquete} unds/paq`}
              left={props => <List.Icon {...props} icon="package-variant-closed" />}
              right={props => (
                <Menu
                  visible={menuVisibleId === pres.id}
                  onDismiss={() => setMenuVisibleId(null)}
                  anchor={
                    <IconButton
                      {...props}
                      icon="dots-vertical"
                      onPress={() => toggleMenu(pres.id)}
                    />
                  }
                >
                  <Menu.Item onPress={() => handleEdit(pres)} title="Editar" leadingIcon="pencil" />
                  <Menu.Item onPress={() => handleDeactivate(pres.id)} title="Eliminar" leadingIcon="delete" titleStyle={{ color: theme.colors.error }} />
                </Menu>
              )}
              style={styles.listItem}
            />
          ))}
          {presentaciones.length === 0 && (
            <Text style={styles.emptyText}>No hay presentaciones activas registradas.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  half: {
    width: '48%',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  listItem: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  }
});

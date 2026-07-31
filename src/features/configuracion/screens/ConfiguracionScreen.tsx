import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, useTheme, Text, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react';
import { globalStyles } from '@core/theme/globalStyles';
import { CustomCard } from '@components/ui/CustomCard';
import Toast from 'react-native-toast-message';
import { TextInput } from 'react-native-paper';

export function ConfiguracionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const powerSync = usePowerSync();

  const [secuencia, setSecuencia] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch current sequence from SQLite
  const { data: configData } = useQuery(
    `SELECT valor FROM configuracion WHERE clave = 'secuencia_nota_entrega'`
  );

  useEffect(() => {
    if (configData && configData.length > 0) {
      setSecuencia(configData[0].valor);
    }
  }, [configData]);

  const handleSave = async () => {
    if (!secuencia || isNaN(Number(secuencia))) {
      Toast.show({ type: 'error', text1: 'Número inválido', text2: 'Debe ingresar un número válido.' });
      return;
    }

    setSaving(true);
    try {
      // Upsert the sequence
      await powerSync.execute(
        `INSERT INTO configuracion (id, clave, valor) VALUES (gen_random_uuid(), 'secuencia_nota_entrega', ?) 
         ON CONFLICT (clave) DO UPDATE SET valor = ?`,
        [secuencia, secuencia]
      );
      Toast.show({ type: 'success', text1: 'Guardado', text2: 'El número de secuencia ha sido actualizado.' });
    } catch (error) {
      console.error('Error guardando configuración:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={globalStyles.containerWhite}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={globalStyles.scrollContent}>
          
          <CustomCard>
            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                  Facturación / Entregas
                </Text>
              </View>
              
              <Text variant="bodyMedium" style={styles.description}>
                Este número se utilizará de forma automática al generar la próxima Nota de Entrega en PDF. 
                Debe coincidir con el número del talonario físico actual.
              </Text>

              <TextInput
                mode="outlined"
                label="Próximo Nro. de Nota de Entrega"
                value={secuencia}
                onChangeText={setSecuencia}
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="numeric" />}
              />
              <HelperText type="info" visible={true}>
                Ejemplo: Si el talonario físico está en la nota 165, el próximo debe ser 166.
              </HelperText>

              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving || !secuencia}
                style={styles.saveBtn}
              >
                Guardar Configuración
              </Button>
            </View>
          </CustomCard>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  saveBtn: {
    marginTop: 16,
    borderRadius: 8,
  },
});

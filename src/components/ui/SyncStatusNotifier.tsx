import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Portal, Modal, Button, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { usePowerSync, useStatus } from '@powersync/react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

export const SyncStatusNotifier = () => {
  const powerSync = usePowerSync();
  const status = useStatus();
  const theme = useTheme();
  
  const lastError = useRef<Error | null>(null);
  const lastSyncCompleted = useRef<Date | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const syncStatus = powerSync.syncStatus;
    if (!syncStatus) return;

    if (syncStatus.lastSyncCompletedAt && syncStatus.lastSyncCompletedAt !== lastSyncCompleted.current) {
        if (!syncStatus.error) {
            Toast.show({
                type: 'success',
                text1: 'Sincronización Exitosa',
                text2: 'Tus datos están actualizados con la nube.',
                visibilityTime: 2000
            });
        }
        lastSyncCompleted.current = syncStatus.lastSyncCompletedAt;
    }

    const error = syncStatus.error;
    if (error && error.message !== lastError.current?.message) {
      console.error('PowerSync synchronization error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error de Sincronización',
        text2: error.message || 'No se pudieron subir los cambios. Reintentando...',
        visibilityTime: 5000
      });
      lastError.current = error;
    }

    if (!error && lastError.current) {
        lastError.current = null;
    }
  }, [powerSync.syncStatus]);

  if (!status) return null;

  const isConnected = status.connected;
  const hasError = !!status.syncError;
  const isUploading = status.dataFlowStatus.uploading;
  const isDownloading = status.dataFlowStatus.downloading;

  let iconName = 'cloud-check';
  let iconColor = '#10b981'; // green

  if (hasError) {
    iconName = 'cloud-alert';
    iconColor = '#ef4444'; // red
  } else if (!isConnected) {
    iconName = 'cloud-off-outline';
    iconColor = '#6b7280'; // gray
  } else if (isUploading || isDownloading) {
    iconName = 'cloud-sync';
    iconColor = '#3b82f6'; // blue
  }

  return (
    <>
      <View pointerEvents="box-none">
        <TouchableOpacity 
          style={[styles.floatingBadge, { borderColor: iconColor }]} 
          onPress={() => setModalVisible(true)}
        >
          <MaterialCommunityIcons name={iconName as any} size={18} color={iconColor} />
          {hasError && <View style={styles.errorDot} />}
        </TouchableOpacity>
      </View>

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <MaterialCommunityIcons name={iconName as any} size={32} color={iconColor} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: 'bold' }}>Estado de Red</Text>
          </View>
          
          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.statusRow}>
              <Text variant="bodyMedium" style={styles.statusLabel}>Conexión con Supabase:</Text>
              <Text variant="bodyMedium" style={{ color: isConnected ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text variant="bodyMedium" style={styles.statusLabel}>Subiendo datos:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ marginRight: 8 }}>{isUploading ? 'Sí' : 'No'}</Text>
                {isUploading && <ActivityIndicator size={14} color={theme.colors.primary} />}
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text variant="bodyMedium" style={styles.statusLabel}>Descargando datos:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ marginRight: 8 }}>{isDownloading ? 'Sí' : 'No'}</Text>
                {isDownloading && <ActivityIndicator size={14} color={theme.colors.primary} />}
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.statusRow}>
              <Text variant="bodyMedium" style={styles.statusLabel}>Última Sincronización:</Text>
              <Text variant="bodyMedium">
                {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleTimeString('es-VE') : 'Nunca'}
              </Text>
            </View>

            {hasError && (
              <View style={styles.errorBox}>
                <Text variant="bodyMedium" style={{ color: '#ef4444', fontWeight: 'bold' }}>Error Activo:</Text>
                <Text variant="bodySmall" style={{ color: '#ef4444', marginTop: 4 }}>
                  {status.syncError?.message || 'Error desconocido'}
                </Text>
              </View>
            )}
          </ScrollView>

          <Button mode="contained" onPress={() => setModalVisible(false)} style={{ marginTop: 16 }}>
            Cerrar
          </Button>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    marginRight: 12,
  },
  errorDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    color: '#4b5563',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  }
});

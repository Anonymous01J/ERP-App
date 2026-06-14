import { useEffect, useRef } from 'react';
import { usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';

/**
 * This is a global component that listens to PowerSync's sync status 
 * and provides visual feedback to the user via toasts.
 */
export const SyncStatusNotifier = () => {
  const powerSync = usePowerSync();
  const lastError = useRef<Error | null>(null);
  const lastSyncCompleted = useRef<Date | null>(null);

  // Listener for successful data uploads and sync completions
  useEffect(() => {
    // ========= FIX: Add guard clause to prevent crash =========
    // The syncStatus object may not be available immediately on app start.
    const syncStatus = powerSync.syncStatus;
    if (!syncStatus) {
      return; // Exit if syncStatus is not yet initialized
    }
    // =========================================================

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

    // Listener for synchronization errors
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

  return null; // This component doesn't render anything visual itself
};

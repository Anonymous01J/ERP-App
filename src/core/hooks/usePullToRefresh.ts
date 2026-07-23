import { useState, useCallback } from 'react';
import { usePowerSync } from '@powersync/react';
import Toast from 'react-native-toast-message';

export function usePullToRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const powerSync = usePowerSync();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      Toast.show({ type: 'info', text1: 'Sincronizando...', text2: 'Comprobando cambios locales y remotos...' });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const status = powerSync.currentStatus;

      if (!status) {
        Toast.show({
          type: 'info',
          text1: 'Estado no Disponible',
          text2: 'La información de sincronización aún no está lista.'
        });
        setRefreshing(false);
        return;
      }

      if (status.dataFlow?.uploadError || status.dataFlow?.downloadError) {
        Toast.show({ type: 'error', text1: 'Error de Sincronización', text2: 'No se pudo sincronizar.' });
      } else if (status.connected) {
        Toast.show({ type: 'success', text1: 'Sincronización Exitosa', text2: 'Los cambios han sido subidos y bajados correctamente.' });
      } else {
        Toast.show({ type: 'info', text1: 'Modo Offline', text2: 'Los cambios están guardados localmente.' });
      }
    } catch (e) {
      console.error('Error al forzar la sincronización:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Ocurrió un problema inesperado.' });
    } finally {
      setRefreshing(false);
    }
  }, [powerSync]);

  return { refreshing, onRefresh };
}

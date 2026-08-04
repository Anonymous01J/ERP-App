import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './AppSchema';
import * as Sentry from '@sentry/react-native';
import { SupabaseConnector } from './Connector';

// Instanciar la base de datos local SQLite con el esquema
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'erp_app.sqlite'
  }
});

export const setupPowerSync = async () => {
  // Configurar e inicializar
  await db.init();
  try {
    await db.execute(`UPDATE movimientos SET categoria = 'otros' WHERE categoria IS NULL OR categoria = ''`);
  } catch (e) {
    // Ignorar si la tabla aún no existe o no tiene registros
  }

  // Registrar listener para capturar errores de sincronización silenciosos
  db.registerListener({
    statusChanged: (status) => {
      if (status.downloadError) {
        const errorMessage = status.downloadError instanceof Error ? status.downloadError.message : String(status.downloadError);
        
        // Ignorar errores de red esperados
        if (
          !errorMessage.toLowerCase().includes('network request failed') &&
          !errorMessage.toLowerCase().includes('timeout')
        ) {
          Sentry.captureException(status.downloadError, {
            tags: { section: 'powersync-download' }
          });
          console.error('[PowerSync] Download Error captured:', status.downloadError);
        }
      }
      
      if (status.syncError) {
        const errorMessage = status.syncError instanceof Error ? status.syncError.message : String(status.syncError);
        
        // Ignorar errores de red esperados
        if (
          !errorMessage.toLowerCase().includes('network request failed') &&
          !errorMessage.toLowerCase().includes('timeout')
        ) {
          Sentry.captureException(status.syncError, {
            tags: { section: 'powersync-sync' }
          });
          console.error('[PowerSync] Sync Error captured:', status.syncError);
        }
      }
    }
  });
};

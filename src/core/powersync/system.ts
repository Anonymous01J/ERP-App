import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './AppSchema';
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

  // Conectar con Supabase a través del Connector
  const connector = new SupabaseConnector();
  await db.connect(connector);
};

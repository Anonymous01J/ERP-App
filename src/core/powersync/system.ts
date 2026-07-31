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
  try {
    await db.execute(`UPDATE movimientos SET categoria = 'otros' WHERE categoria IS NULL OR categoria = ''`);
  } catch (e) {
    // Ignorar si la tabla aún no existe o no tiene registros
  }
};

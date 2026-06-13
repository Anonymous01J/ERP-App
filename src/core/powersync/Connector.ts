import { PowerSyncBackendConnector, AbstractPowerSyncDatabase, UpdateType } from '@powersync/react-native';
import { supabase } from '../supabase/client';

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      throw new Error('No user session found. Make sure user is logged in.');
    }

    // Configura la URL desde las variables de entorno (.env)
    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL || '',
      token: session.access_token,
      // Opcionalmente puedes definir un tiempo de expiración
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return; // No hay cambios pendientes
    }

    try {
      for (let op of transaction.crud) {
        const table = op.table;
        // El id que usaremos en Supabase
        const id = op.id;

        switch (op.op) {
          case UpdateType.PUT:
            // PUT es para INSERTS y UPDATES
            // Usamos upsert de supabase para simplificar
            await supabase
              .from(table)
              .upsert({ ...op.opData, id });
            break;
          case UpdateType.PATCH:
            // PATCH es solo actualización parcial
            await supabase
              .from(table)
              .update(op.opData)
              .eq('id', id);
            break;
          case UpdateType.DELETE:
            // Borrado
            await supabase
              .from(table)
              .delete()
              .eq('id', id);
            break;
        }
      }

      // Confirmar a PowerSync que todo subió correctamente
      await transaction.complete();
    } catch (error) {
      console.error('Error subiendo datos a Supabase', error);
      throw error; // Esto reintentará más tarde
    }
  }
}

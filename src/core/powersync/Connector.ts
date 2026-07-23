import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/react-native';
import { supabase } from '../supabase/client';

/**
 * Custom Supabase Connector for PowerSync.
 * Handles authentication and data upload.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  /**
   * Fetches the authentication credentials for PowerSync.
   * This is called automatically when required.
   */
  async fetchCredentials() {
    console.log('[Connector] fetchCredentials called...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[Connector] Session status:', session ? 'ACTIVE (User logged in)' : 'NULL (No user logged in)', sessionError || '');

    if (!session) {
      console.log('[Connector] No active Supabase session. PowerSync will remain DISCONNECTED.');
      return null; // Returning null puts PowerSync in disconnected state
    }

    const powersyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL;
    if (!powersyncUrl) {
      console.error('[Connector] EXPO_PUBLIC_POWERSYNC_URL is missing in environment variables!');
      throw new Error('EXPO_PUBLIC_POWERSYNC_URL environment variable is not set.');
    }

    console.log('[Connector] Connecting to PowerSync URL:', powersyncUrl);
    return {
      endpoint: powersyncUrl,
      token: session.access_token
    };
  }

  /**
   * Uploads local changes to Supabase via an Edge Function.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    // --- START OF FINAL FIX ---
    // First, check if the user is actually logged in.
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // This is the key: If there's no session, we don't even try to upload.
      // This happens on app start before the user has logged in.
      // We log it and exit gracefully. PowerSync will try again later.
      console.log('[Connector] Upload requested, but no active session. Aborting until login.');
      return; 
    }
    // --- END OF FINAL FIX ---

    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      return; // Nothing to upload
    }

    console.log(`[Connector] Attempting to upload ${transaction.crud.length} changes:`, JSON.stringify(transaction.crud, null, 2));

    try {
      const { access_token } = session;

      const { data, error } = await supabase.functions.invoke('powersync', {
        body: { operations: transaction.crud },
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      if (error) {
        console.error('[Connector] Edge Function invocation error details:', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
          context: (error as any).context,
          data
        });
        throw error; // Let PowerSync handle the retry
      }

      // If the upload was successful, mark the transaction as complete
      await transaction.complete();
      console.log('[Connector] Upload successful.');
    } catch (error) {
      console.error('[Connector] Error during data upload:', error);
      // Re-throw the error so PowerSync knows to retry the transaction later
      throw error;
    }
  }
}

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../core/supabase/client';

import { db } from '../core/powersync/system';
import { SupabaseConnector } from '../core/powersync/Connector';

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

// Flag a nivel de módulo para evitar múltiples conexiones simultáneas
// (resiste re-montajes del componente en React Strict Mode)
let isPowerSyncConnecting = false;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Definir función para conectar a PowerSync
    const connectPowerSync = async () => {
      if (isPowerSyncConnecting) {
        console.log('[AuthProvider] Already connecting (module-level guard), skipping...');
        return;
      }
      if (db.currentStatus?.connected) {
        console.log('[AuthProvider] Already connected, skipping...');
        return;
      }
      isPowerSyncConnecting = true;
      try {
        // Garantizar que la DB esté inicializada antes de conectar
        console.log('[AuthProvider] Initializing PowerSync DB...');
        await db.init();
        console.log('[AuthProvider] DB initialized. Connecting to PowerSync...');
        const connector = new SupabaseConnector();
        await db.connect(connector);
        const status = db.currentStatus;
        console.log('[AuthProvider] db.connect() resolved. Status:', JSON.stringify(status));
        if (status?.dataFlow?.uploadError) {
          console.error('[AuthProvider] Upload error detail:', JSON.stringify(status.dataFlow.uploadError));
        }
      } catch (err) {
        console.error('[AuthProvider] PowerSync connection error:', JSON.stringify(err));
      } finally {
        isPowerSyncConnecting = false;
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthProvider] getSession error:', error);
        }
        
        if (initialSession) {
          console.log('[AuthProvider] Initial session found, setting session');
          setSession(initialSession);
          connectPowerSync().catch(console.error);
        }
      } catch (err) {
        console.error('[AuthProvider] Error fetching initial session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios en la sesión (onAuthStateChange maneja la sesión inicial automáticamente)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthProvider] Auth state event:', event);
        setSession(currentSession);
        setIsLoading(false);
        
        if (currentSession) {
          connectPowerSync().catch(console.error);
        } else {
          isPowerSyncConnecting = false;
          await db.disconnect().catch(console.error);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

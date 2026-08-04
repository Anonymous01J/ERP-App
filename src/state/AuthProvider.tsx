import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../core/supabase/client';
import { db } from '../core/powersync/system';
import { SupabaseConnector } from '../core/powersync/Connector';
import type { Perfil, UserRole, AppModulo } from '../core/auth/types';
import * as Sentry from '@sentry/react-native';

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  perfil: Perfil | null;
  isLoadingPerfil: boolean;
  canAccess: (modulo: AppModulo) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  perfil: null,
  isLoadingPerfil: true,
  canAccess: () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Flag a nivel de módulo para evitar múltiples conexiones simultáneas
// (resiste re-montajes del componente en React Strict Mode)
let isPowerSyncConnecting = false;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(true);
  // Cache of role permissions loaded from PowerSync
  const [permisosCache, setPermisosCache] = useState<Record<string, boolean>>({});

  // Load the profile from PowerSync local DB
  const loadPerfil = async (userId: string, silent = false) => {
    if (!silent) setIsLoadingPerfil(true);
    try {
      // Poll PowerSync until the profile is synced (max 5 seconds)
      let intentos = 0;
      let perfilData = null;
      while (intentos < 10) {
        const result = await db.execute(
          `SELECT id, nombre, rol, activo FROM perfiles WHERE id = ?`,
          [userId]
        );
        if (result.rows && result.rows.length > 0) {
          const row = result.rows.item(0);
          perfilData = {
            id: row.id,
            nombre: row.nombre,
            rol: row.rol as UserRole,
            activo: row.activo === 1,
          };
          break;
        }
        await new Promise(res => setTimeout(res, 500));
        intentos++;
      }
      setPerfil(perfilData);

      // Load permissions for this role
      if (perfilData) {
        const permResult = await db.execute(
          `SELECT modulo, habilitado FROM rol_permisos WHERE rol = ?`,
          [perfilData.rol]
        );
        const cache: Record<string, boolean> = {};
        if (permResult.rows) {
          for (let i = 0; i < permResult.rows.length; i++) {
            const p = permResult.rows.item(i);
            cache[p.modulo] = p.habilitado === 1;
          }
        }
        setPermisosCache(cache);
      }
    } catch (err) {
      console.error('[AuthProvider] Error loading perfil:', err);
      Sentry.captureException(err, { tags: { section: 'auth-load-perfil' } });
    } finally {
      setIsLoadingPerfil(false);
    }
  };

  const canAccess = (modulo: AppModulo): boolean => {
    if (!perfil) return false;
    if (perfil.rol === 'admin') return true;
    return permisosCache[modulo] === true;
  };

  useEffect(() => {
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
        console.log('[AuthProvider] Initializing PowerSync DB...');
        await db.init();
        console.log('[AuthProvider] DB initialized. Connecting to PowerSync...');
        const connector = new SupabaseConnector();
        // Fire and forget: no bloquear el inicio de la app esperando conexión de red (Offline First)
        db.connect(connector).catch(err => {
          console.error('[AuthProvider] Background PowerSync connect error:', err);
        });
        const status = db.currentStatus;
        console.log('[AuthProvider] db.connect() initiated. Status:', JSON.stringify(status));
      } catch (err) {
        console.error('[AuthProvider] PowerSync connection error:', JSON.stringify(err));
        Sentry.captureException(err, { tags: { section: 'auth-powersync-connect' } });
      } finally {
        isPowerSyncConnecting = false;
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthProvider] getSession error:', error);
          if (!error.message?.toLowerCase().includes('network request failed')) {
            Sentry.captureException(error, { tags: { section: 'auth-get-session' } });
          }
        }

        if (initialSession) {
          console.log('[AuthProvider] Initial session found, setting session');
          setSession(initialSession);
          await connectPowerSync();
          await loadPerfil(initialSession.user.id, false);
        } else {
          setIsLoadingPerfil(false);
        }
      } catch (err) {
        console.error('[AuthProvider] Error fetching initial session:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (!errorMessage.toLowerCase().includes('network request failed')) {
          Sentry.captureException(err, { tags: { section: 'auth-init' } });
        }
        setIsLoadingPerfil(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthProvider] Auth state event:', event);
        setSession(currentSession);
        setIsLoading(false);

        if (currentSession) {
          connectPowerSync();
          // No bloquear la UI si es un simple refresco de token en background
          const isSilent = event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION';
          await loadPerfil(currentSession.user.id, isSilent);
        } else {
          isPowerSyncConnecting = false;
          setPerfil(null);
          setPermisosCache({});
          setIsLoadingPerfil(false);
          await db.disconnect().catch(console.error);
        }
      }
    );

    return () => { subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, perfil, isLoadingPerfil, canAccess, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../core/supabase/client';
import { db } from '../core/powersync/system';
import { SupabaseConnector } from '../core/powersync/Connector';
import type { Perfil, UserRole, AppModulo } from '../core/auth/types';

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
  const loadPerfil = async (userId: string) => {
    setIsLoadingPerfil(true);
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
        await db.connect(connector);
        const status = db.currentStatus;
        console.log('[AuthProvider] db.connect() resolved. Status:', JSON.stringify(status));
      } catch (err) {
        console.error('[AuthProvider] PowerSync connection error:', JSON.stringify(err));
      } finally {
        isPowerSyncConnecting = false;
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) console.error('[AuthProvider] getSession error:', error);

        if (initialSession) {
          console.log('[AuthProvider] Initial session found, setting session');
          setSession(initialSession);
          await connectPowerSync();
          await loadPerfil(initialSession.user.id);
        } else {
          setIsLoadingPerfil(false);
        }
      } catch (err) {
        console.error('[AuthProvider] Error fetching initial session:', err);
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
          await connectPowerSync();
          await loadPerfil(currentSession.user.id);
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

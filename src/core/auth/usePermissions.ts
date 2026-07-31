import { useQuery } from '@powersync/react';
import type { AppModulo, UserRole } from './types';

/**
 * Hook reactivo que consulta los permisos del rol actual desde PowerSync local.
 * Funciona offline (datos cacheados localmente).
 */
export function usePermissions(rol: UserRole | null | undefined) {
  const { data: permisos = [] } = useQuery(
    `SELECT modulo, habilitado FROM rol_permisos WHERE rol = ?`,
    [rol ?? '']
  );

  const canAccess = (modulo: AppModulo): boolean => {
    // Admin siempre tiene acceso total, independientemente de la BD
    if (rol === 'admin') return true;
    if (!rol) return false;

    const permiso = (permisos as any[]).find((p: any) => p.modulo === modulo);
    return permiso?.habilitado === 1;
  };

  return { canAccess, permisos };
}

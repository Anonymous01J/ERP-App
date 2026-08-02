import { useQuery } from '@powersync/react';

export function useNotificacionesNoLeidas(): number {
  const { data = [] } = useQuery(
    'SELECT COUNT(*) as count FROM notificaciones_historial WHERE leido = 0'
  );
  return Number((data as any[])[0]?.count ?? 0);
}

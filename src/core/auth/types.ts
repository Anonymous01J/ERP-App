export type UserRole = 'admin' | 'operador' | 'chofer' | 'vendedor';

export type AppModulo =
  | 'dashboard'
  | 'inventario'
  | 'produccion'
  | 'viajes'
  | 'pedidos'
  | 'finanzas'
  | 'reportes'
  | 'clientes'
  | 'proveedores'
  | 'usuarios';

export interface Perfil {
  id: string;
  nombre: string;
  rol: UserRole;
  activo: boolean;
}

export interface RolPermiso {
  id: string;
  rol: UserRole;
  modulo: AppModulo;
  habilitado: boolean;
}

export const MODULOS_CONFIG: { key: AppModulo; label: string; icon: string }[] = [
  { key: 'dashboard',   label: 'Panel de Control', icon: 'view-dashboard' },
  { key: 'inventario',  label: 'Inventario',        icon: 'package-variant' },
  { key: 'produccion',  label: 'Producción',        icon: 'factory' },
  { key: 'viajes',      label: 'Viajes',            icon: 'truck' },
  { key: 'pedidos',     label: 'Pedidos',           icon: 'clipboard-list' },
  { key: 'finanzas',    label: 'Finanzas',          icon: 'cash-multiple' },
  { key: 'reportes',    label: 'Reportes',          icon: 'chart-bar' },
  { key: 'clientes',    label: 'Clientes',          icon: 'account-group' },
  { key: 'proveedores', label: 'Proveedores',       icon: 'briefcase-account' },
  { key: 'usuarios',    label: 'Usuarios',          icon: 'account-multiple' },
];

export const ROLES_CONFIG: { key: UserRole; label: string; color: string }[] = [
  { key: 'admin',    label: 'Admin',    color: '#7c3aed' },
  { key: 'operador', label: 'Operador', color: '#2563eb' },
  { key: 'chofer',   label: 'Chofer',   color: '#16a34a' },
  { key: 'vendedor', label: 'Vendedor', color: '#d97706' },
];

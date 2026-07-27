# Implementación de Gestión de Roles y Permisos (RBAC)

El objetivo es establecer un sistema robusto de control de acceso basado en roles (Role-Based Access Control) que determine qué usuarios pueden ver, crear o editar información dentro de la aplicación. 

Esto **debe ejecutarse primero** antes que las Notificaciones Push, ya que nos permitirá enviar notificaciones específicas a roles específicos (ej: notificar solo al rol "almacen" cuando falta inventario).

## User Review Required

> [!IMPORTANT]
> **Definición de Roles Iniciales:**
> Propongo los siguientes roles base para el ERP:
> - **admin**: Acceso total a finanzas, configuración, todos los reportes, inventario y usuarios.
> - **ventas**: Puede crear pedidos, ver clientes y ver precios. No puede ver balances financieros profundos ni editar inventario crudo.
> - **produccion**: Puede ver los pedidos pendientes de fabricación y reportar mermas/rebobinado. No ve precios ni deudas.
> - **logistica**: Puede gestionar viajes, viáticos y gastos.
> 
> ¿Estás de acuerdo con estos roles, o necesitas añadir/modificar alguno?

## Open Questions

- ¿Cómo deseas que se asignen los roles por primera vez? ¿Deseas que el primer usuario registrado sea automáticamente `admin` y luego este asigne roles manualmente desde un panel, o lo configurarás manualmente directo en Supabase por ahora?

## Proposed Changes

---

### 1. Base de Datos (Supabase)

#### [NEW] assets/sql/roles_permisos.sql
- Crear un `ENUM` de roles: `app_role` ('admin', 'ventas', 'produccion', 'logistica').
- Crear tabla `perfiles` o `user_roles`:
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key a `auth.users`)
  - `role` (app_role)
  - `nombre_completo` (String)
- Crear un *Database Trigger* que inserte un registro automático en la tabla `perfiles` cada vez que se cree un nuevo usuario en `auth.users`.

---

### 2. Estado Global y Navegación (Cliente)

#### [NEW] src/core/state/RoleContext.tsx
- Crear un contexto de React que lea el rol del usuario autenticado actual desde PowerSync/Supabase y lo exponga a toda la aplicación.

#### [NEW] src/components/ui/RoleGuard.tsx
- Crear un componente de envoltura para proteger rutas o botones.
  - Ejemplo: `<RoleGuard allowedRoles={['admin', 'ventas']}> <BotonCrearPedido /> </RoleGuard>`

#### [MODIFY] app/(tabs)/_layout.tsx
- Modificar el layout principal para ocultar pestañas enteras dependiendo del rol (ej: Ocultar pestaña "Finanzas" si no eres admin).

## Verification Plan

### Manual Verification
1. Crearemos dos usuarios de prueba en Supabase (ej: admin@test.com y ventas@test.com).
2. Asignaremos roles distintos en la base de datos.
3. Iniciaremos sesión en la app con cada uno y verificaremos que la interfaz gráfica cambie, mostrando u ocultando botones y pestañas del menú según corresponda.

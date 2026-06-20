# Estado Actual del Proyecto (Contexto de Implementación)

Este documento resume todo lo que ya está implementado en el sistema ERP-App (Sistema de Gestión Administrativa para rebobinado de papel y venta de potes) hasta la fecha.

## 1. Arquitectura y Configuración
- **Stack:** React Native (Expo SDK 54), Expo Router v3, React Native Paper, TypeScript estricto.
- **Estructura Base:** Feature-Based Architecture (`app/` para ruteo estricto, `src/features/` para lógica de negocio, `src/components/ui/` para componentes UI genéricos).
- **Entorno:** Configurado con `.idx/dev.nix` para un entorno aislado y reproducible (NixPackages en Firebase Studio).
- **Tipado y Alias:** Archivo `tsconfig.json` con alias de rutas (`@components`, `@ui`, `@features`, `@state`, `@core`) para importaciones limpias.
- **Cliente de Desarrollo:** Se ha creado un **cliente de desarrollo personalizado** para Android usando EAS Build. Este cliente incluye las dependencias nativas necesarias (`expo-dev-client`, `@react-native-google-signin/google-signin`) para poder probar el flujo de autenticación completo en un dispositivo real.

## Progreso Actual (Features Implementadas)

### 1. Arquitectura y Navegación Base
- **Infraestructura:** Expo Router configurado con soporte para Drawer Navigation (Menú Lateral) y Bottom Tabs.
- **Enrutamiento Principal:**
  - `app/(drawer)`: Drawer principal que contiene Catálogos y Configuración.
  - `app/(drawer)/(tabs)`: Bottom Tabs para operativa diaria y rápida.
- **PowerSync + Supabase:** Sincronización offline-first activa y schemas definidos.
- **UI Kit:** React Native Paper integrado con un tema de colores personalizado (Azul/Celeste).
- **Componentes Core:** `CustomCard`, `SyncStatusNotifier`.
  - **Edge Function Segura:** Se refactorizó la Edge Function `powersync` (`supabase/functions/powersync/index.ts`) para que actúe en nombre del usuario autenticado. En lugar de usar la `service_role_key` (que omite RLS), ahora utiliza el token del usuario para crear un cliente que **respeta las políticas de Row Level Security (RLS)**. Esto garantiza que un usuario solo pueda escribir datos que tiene permiso para modificar.
  - **Manejo de Sesión:** Se mejoró el conector para evitar intentos de subida de datos si no hay una sesión de usuario activa, previniendo errores al iniciar la aplicación.
- **Autenticación:**
  - **Flujo de Autenticación con Google:** Implementado utilizando el paquete `@react-native-google-signin/google-signin` en el cliente y la autenticación de Supabase en el backend.
  - **Gestión de Sesión:** El estado de la sesión se gestiona globalmente a través de `AuthProvider.tsx`, que expone el estado de carga y la sesión del usuario a toda la aplicación.

## 3. Autenticación y Acceso
- **Flujo de Inicio de Sesión:** La aplicación redirige automáticamente al usuario a la pantalla de inicio de sesión (`/login`) si no hay una sesión activa.
- **Pantalla de Login:** `src/features/auth/screens/LoginScreen.tsx` contiene la UI y la lógica para iniciar sesión con Google.
- **Protección de Rutas:** El layout principal (`app/(tabs)/_layout.tsx`) y otras rutas protegidas verifican el estado de autenticación y redirigen al login si es necesario.

## 4. UI y Componentes Reutilizables
- **Componentes Genéricos (`src/components/ui/`):**
  - `CustomCard`: Componente de tarjeta base con estilos personalizables.
  - `NumericInput`: Campo de texto optimizado para entrada numérica (incluyendo soporte decimal).
  - `DatePickerInput`: Selector de fecha reutilizable.
  - `StatusBarBadge`: Indicador de estado para mostrar en las tarjetas (ej. "Activo"/"Inactivo").
- **Componentes Específicos:** Otros componentes de UI más específicos (ej. `SyncStatusNotifier`) están ubicados dentro de sus respectivos `features`.

## 5. Módulos y Features Funcionales

### Clientes (`src/features/clientes`)
- **CRUD Funcional Offline-First:** Conectado exitosamente con PowerSync a través del hook `usePowerSync()`.
- **Listado y Filtros:** Búsqueda en tiempo real implementada junto a segmentación por estado (`activo`/`inactivo`).
- **Eliminación Lógica:** Soporte de desactivación/activación de clientes desde la tarjeta UI.
- **Creación/Edición:** Formulario dinámico y adaptativo sin dependencias de mockups locales.
- **Ruta en Drawer:** Disponible desde el menú lateral (`app/(drawer)/clientes.tsx`).
- **Ruta Modal:** `app/(screens)/registrar-cliente.tsx` como `fullScreenModal`.

### Proveedores (`src/features/proveedores`)
- **CRUD Completo Offline-First:** Dashboard con listado activos/inactivos, búsqueda en tiempo real y filtro segmentado.
- **Creación/Edición:** `RegistrarProveedorScreen` con formulario de nombre_empresa, teléfono, dirección y notas.
- **Eliminación Lógica:** Desactivación/reactivación desde el menú de opciones de cada tarjeta.
- **Ruta en Drawer:** Disponible desde el menú lateral (`app/(drawer)/proveedores.tsx`).
- **Ruta Modal:** `app/(screens)/registrar-proveedor.tsx` como `fullScreenModal`.

### Inventario - Presentaciones (`src/features/inventario`)
- **Dashboard y CRUD:** `GestionarPresentacionesScreen` con filtrado (Activos/Inactivos) y botón flotante (FAB).
- **Pantalla de Registro:** Creación y edición en `RegistrarPresentacionScreen.tsx`.

### Inventario - Potes (`src/features/inventario`)
- **Dashboard y CRUD Independiente:** `GestionarPotesScreen` con filtrado (Activos/Inactivos) y botón flotante (FAB).
- **Pantalla de Registro:** Creación y edición en `RegistrarPoteScreen.tsx`.
- **Eliminación Lógica:** Soporte de desactivación a través de las tarjetas (campo `estado` en base de datos).

### Logística - Viajes (`src/features/viajes`)
- **Reestructuración de Esquema:** La tabla `viajes` soporta fechas nullable y campo `notas`. La tabla `entregas_viaje` fue extendida con campos `hora_llegada`, `estado` (`pendiente`/`entregado`) y `orden`.
- **Dashboard en Tiempo Real:** `ViajesDashboardScreen` implementa:
  - Lista de viajes activos con **paradas individuales interactivas** (visible dentro de cada acordeón de viaje de entrega/mixto).
  - Cada parada muestra el nombre del cliente, su número de orden, y un botón "Entregado" que registra la `hora_llegada`.
  - **Botones de acción contextuales** según tipo de viaje y estado actual (ver tabla abajo).
- **Sistema de Estados:**

  | Tipo | Estado | Acción |
  |---|---|---|
  | `compra` | `en_progreso` | → Llegué al Proveedor |
  | `compra` | `en_destino` | → **Cargar Bobinas y Retornar** (abre modal) |
  | `compra` | `retornando` | → Llegué a Base (Fin) |
  | `entrega` | `en_progreso` | Marcar paradas individualmente |
  | `entrega` | (todas entregadas) | → Cerrar Viaje |
  | `mixto` | `en_progreso` | Marcar paradas → Ir al Proveedor |
  | `mixto` | `en_destino` | → **Cargar Bobinas y Retornar** |
  | `mixto` | `retornando` | → Llegué a Base (Fin) |

- **Registro de Viaje (`RegistrarViajeScreen`):** Formulario completamente conectado a PowerSync:
  - Selección de tipo (Entregas / Compras / Mixto).
  - Pedidos reales de la BD (estado `listo` primero, luego `en_produccion`), con selección de orden de paradas.
  - Selector de proveedor para viajes de compra/mixto.
  - Al guardar, inserta el viaje y todas las `entregas_viaje` con su orden.
- **Carga de Bobinas (`CargarBobinasViajeScreen`):** Nueva pantalla modal:
  - Filas dinámicas de bobinas (añadir/eliminar).
  - Cada fila: Tipo A/B + Peso en Kg.
  - Muestra el total en Kg en tiempo real.
  - Al confirmar: inserta bobinas en `bobinas_grandes` y avanza viaje a `retornando`.
  - Opción **"Retornar Sin Carga"** con confirmación (por si el proveedor no tenía stock).
- **Formulario de Gasto Rápido:** Sub-componente embebido en cada viaje activo (pendiente de conexión real a `movimientos`).

## 6. Schema de Base de Datos (`src/SCHEMA_SUPABASE.sql` + `AppSchema.ts`)
- Todas las tablas definidas con UUID, RLS habilitado y políticas `FOR ALL TO authenticated`.
- **Pendiente de migración manual en Supabase** (ejecutar en SQL Editor):
  ```sql
  ALTER TABLE public.entregas_viaje ADD COLUMN IF NOT EXISTS hora_llegada timestamp with time zone;
  ALTER TABLE public.entregas_viaje ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente';
  ALTER TABLE public.entregas_viaje ADD COLUMN IF NOT EXISTS orden int NOT NULL DEFAULT 1;
  ```

---

**Nota de uso continuo:**
Este documento sirve como ancla contextual para futuros prompts. Si se crean nuevas pantallas, componentes o utilidades estructurales, **deben adherirse a esta misma arquitectura basada en Features y documentarse idealmente en un lugar similar**. No mezclar rutas en `app/` con la lógica principal.

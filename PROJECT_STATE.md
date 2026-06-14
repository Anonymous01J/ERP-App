# Estado Actual del Proyecto (Contexto de Implementación)

Este documento resume todo lo que ya está implementado en el sistema ERP-App (Sistema de Gestión Administrativa para rebobinado de papel y venta de potes) hasta la fecha.

## 1. Arquitectura y Configuración
- **Stack:** React Native (Expo SDK 54), Expo Router v3, React Native Paper, TypeScript estricto.
- **Estructura Base:** Feature-Based Architecture (`app/` para ruteo estricto, `src/features/` para lógica de negocio, `src/components/ui/` para componentes UI genéricos).
- **Entorno:** Configurado con `.idx/dev.nix` para un entorno aislado y reproducible (NixPackages en Firebase Studio).
- **Tipado y Alias:** Archivo `tsconfig.json` con alias de rutas (`@components`, `@ui`, `@features`, `@state`, `@core`) para importaciones limpias.
- **Cliente de Desarrollo:** Se ha creado un **cliente de desarrollo personalizado** para Android usando EAS Build. Este cliente incluye las dependencias nativas necesarias (`expo-dev-client`, `@react-native-google-signin/google-signin`) para poder probar el flujo de autenticación completo en un dispositivo real.

## 2. Backend & Data Layer
- **Backend como Servicio (BaaS):** **Supabase** ha sido implementado como el backend principal.
  - La base de datos PostgreSQL en Supabase ha sido configurada utilizando el esquema de `src/SCHEMA_SUPABASE.sql` (adaptado de `src/SCHEMA.sql`).
- **Sincronización Offline-First con PowerSync:**
  - **Conector Personalizado:** `src/core/powersync/Connector.ts` implementa la lógica para subir cambios locales a Supabase.
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
  - `NumericInput`: Campo de texto optimizado para entrada numérica.
  - `DatePickerInput`: Selector de fecha reutilizable.
  - `StatusBarBadge`: Indicador de estado para mostrar en las tarjetas (ej. "Activo"/"Inactivo").
- **Componentes Específicos:** Otros componentes de UI más específicos (ej. `SyncStatusNotifier`) están ubicados dentro de sus respectivos `features`.

## 5. Módulos y Features Funcionales
- **Clientes (`src/features/clientes`):**
  - **CRUD Funcional Offline-First:** Conectado exitosamente con PowerSync a través del hook `usePowerSync()`.
  - **Listado y Filtros:** Búsqueda en tiempo real implementada junto a segmentación por estado (`activo`/`inactivo`).
  - **Eliminación Lógica:** Soporte de desactivación/activación de clientes desde la tarjeta UI.
  - **Creación/Edición:** Formulario dinámico y adaptativo sin dependencias de mockups locales.
- **Inventario - Presentaciones (`src/features/inventario`):**
  - **Dashboard y CRUD:** Se refactorizó la interfaz imitando el módulo de clientes. `GestionarPresentacionesScreen` sirve como Dashboard interactivo con filtrado (Activos/Inactivos) y botón flotante (FAB).
  - **Pantalla de Registro:** La creación y edición se realiza ahora de manera independiente en `RegistrarPresentacionScreen.tsx`.
- **Inventario - Potes (`src/features/inventario`):**
  - **Dashboard y CRUD Independiente:** Se replicó la arquitectura de presentaciones para la gestión de potes. `GestionarPotesScreen` sirve como Dashboard interactivo con filtrado (Activos/Inactivos) y botón flotante (FAB).
  - **Pantalla de Registro:** La creación y edición de potes se realiza de manera independiente en `RegistrarPoteScreen.tsx`.
  - **Eliminación Lógica:** Soporte de desactivación a través de las tarjetas (campo `estado` en base de datos).
- **Logística - Viajes (`src/features/viajes`):**
  - **Reestructuración de Esquema:** Se modificó la tabla `viajes` para permitir fechas de llegada relativas (nullable) y campos `destino_origen` y `notas`.
  - **Dashboard en Tiempo Real:** `ViajesDashboardScreen` implementa una lista unificada de viajes alimentada por PowerSync.
  - **Sistema de Estados de Avance Automático:** Los viajes avanzan su ciclo de vida (`en_progreso` -> `en_destino` -> `retornando` -> `completado`) mediante botones de acción que estampan de forma invisible la fecha correspondiente.
  - **Registro Dinámico:** `RegistrarViajeScreen` permite ingresar viajes de compra, entrega o mixtos (ida y vuelta) a través de un formulario segmentado. Los viajes mixtos agrupan ambos propósitos logísticos.

**Nota de uso continuo:** 
Este documento sirve como ancla contextual para futuros prompts. Si se crean nuevas pantallas, componentes o utilidades estructurales, **deben adherirse a esta misma arquitectura basada en Features y documentarse idealmente en un lugar similar**. No mezclar rutas en `app/` con la lógica principal.

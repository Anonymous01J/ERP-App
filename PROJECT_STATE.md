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
  - Se ha creado un cliente de Supabase en `src/core/supabase/client.ts` para interactuar con la API.
- **Sincronización Offline-First:** **PowerSync** está integrado para la sincronización de datos bidireccional mediante SQLite.
  - **Upload de Datos:** El conector (`src/core/powersync/connector.ts`) gestiona la conexión enviando las mutaciones a Supabase mediante una **Edge Function** llamada `powersync`.
  - **Ciclo de Conexión:** PowerSync depende estrictamente del JWT (access_token) de Supabase Auth para autenticar la sincronización.

## 3. Autenticación
- **Flujo de Autenticación Completo:** Se ha implementado un sistema de autenticación robusto gestionado por **Supabase Auth**.
- **Proveedores de Autenticación:**
  - **Email y Contraseña:** Formulario de login estándar.
  - **Google Sign-In (OAuth):** Integrado con el paquete `@react-native-google-signin/google-signin`. La configuración en la Consola de Google Cloud (huella SHA-1) ha sido completada para permitir la autenticación desde la app construida con EAS.
- **Gestión de Sesión:**
  - Un `AuthProvider` (`src/core/auth/AuthProvider.tsx`) envuelve la aplicación.
  - Gestiona el estado de la sesión del usuario (logueado o no).
  - Redirige automáticamente a los usuarios entre la pantalla de `login` y el `dashboard` principal (`(tabs)`) según su estado de autenticación.

## 4. Estructura de Rutas (app/)
- **`(tabs)`:** Contiene las pantallas principales de la aplicación para usuarios autenticados.
- **`login.tsx`:** Pantalla de inicio de sesión.
- **`_layout.tsx`:** Layout raíz que implementa el `AuthProvider` para proteger las rutas.
- **`(screens)`:** Directorio para pantallas que se presentan como modales o fuera del navegador de pestañas principal.

## 5. Módulos y Features Funcionales
- **Clientes (`src/features/clientes`):**
  - **CRUD Funcional Offline-First:** Conectado exitosamente con PowerSync a través del hook `usePowerSync()`.
  - **Listado y Filtros:** Búsqueda en tiempo real implementada junto a segmentación por estado (`activo`/`inactivo`).
  - **Eliminación Lógica:** Soporte de desactivación/activación de clientes desde la tarjeta UI.
  - **Creación/Edición:** Formulario dinámico y adaptativo sin dependencias de mockups locales.
- **Inventario - Presentaciones (`src/features/inventario`):**
  - **CRUD Funcional Offline-First:** Conectado con PowerSync mediante `usePowerSync()`.
  - **Single Screen CRUD:** Unificación del listado y el formulario de creación/edición en una sola pantalla (`GestionarPresentacionesScreen`).
  - **Eliminación Lógica:** Se alteró el esquema de base de datos para soportar la eliminación lógica (campo `estado`) de las presentaciones de rollos, usando un menú de 3 puntos.

---

**Nota de uso continuo:** 
Este documento sirve como ancla contextual para futuros prompts. Si se crean nuevas pantallas, componentes o utilidades estructurales, **deben adherirse a esta misma arquitectura basada en Features y documentarse idealmente en un lugar similar**. No mezclar rutas en `app/` con la lógica principal.

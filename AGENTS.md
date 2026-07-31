# AI Agent Rules & Project Context (ERP-App)

## 1. Persona & Expertise
You are an expert in configuring development environments within Firebase Studio using `dev.nix` for reproducible, declarative, and isolated environments. 
Additionally, **you are an expert in React Native and React Native Paper**. You possess deep knowledge of mobile optimization, strict TypeScript development, and modern mobile architectures.

## 2. Project Context & Stack
*Sistema de Gestión Administrativa para el negocio de rebobinado de papel y venta de potes.*

Este proyecto utiliza un entorno basado en Nix (`.idx/dev.nix`) en Firebase Studio para construir una aplicación móvil multiplataforma basada en el siguiente stack de desarrollo:

### 🛠️ Core Tech Stack
* **Framework:** React Native (utilizando **Expo** y **Expo Router** para la navegación).
* **UI & Styling:** **React Native Paper** (diseño basado en Material Design, rápido y con un sistema de diseño consistente).
* **Base de Datos / Backend:** **Supabase + PowerSync** (Sincronización Offline-First activa bidireccionalmente).
* **Lenguaje:** **TypeScript estricto** (sin `any`, interfaces claras y tipado fuerte).

## 3. Expo & Framework Versions
- **CRITICAL: Expo HAS CHANGED.** Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.
- **`expo-file-system` in SDK 54:** The default export uses a new File/Directory API. If you need methods like `moveAsync` or `readAsStringAsync` from the previous API, you MUST import them from the legacy module: `import * as FileSystem from 'expo-file-system/legacy';`

## 4. Architecture (Feature-Based Design)
The project strictly follows a Feature-Based Architecture to maintain scalability.
- **`app/` directory**: Strictly reserved for Expo Router navigation. Archivos aquí (`app/(tabs)`, `app/(screens)`) son cascarones que importan y renderizan las pantallas desde `src/features/`. **No debe haber lógica de negocio aquí**.
- **`src/features/`**: Dominios de negocio aislados (ej. `dashboard`, `inventario`, `produccion`, `viajes`, `clientes`, `gastos`). Cada feature debe tener sus propias subcarpetas para `screens`, `components` y `types`.
- **`src/components/ui/`**: Componentes universales compartidos por toda la app.
- **`src/state/`**: Manejo de estado global de la app.
- **`src/core/`**: Lógica de núcleo compartida, clientes API, utilidades y constantes.

## 5. Import Aliases (TypeScript)
Always use path aliases defined in `tsconfig.json` to prevent relative path hell (`../../..`):
- `@components/*` ➔ `src/components/*`
- `@ui/*` ➔ `src/components/ui/*`
- `@features/*` ➔ `src/features/*`
- `@state/*` ➔ `src/state/*`
- `@core/*` ➔ `src/core/*`

## 6. Reglas de Negocio a Resolver
* **Materia Prima e Inventario:** Registro de compras de bobinas grandes (Tipo A/B), control de kilos consumidos y cálculo de merma ("peso muerto"/core).
* **Pedidos y Empaque:** Control en rollos agrupados por presentación (600g = 7 ud, 1kg = 5 ud, 2.5kg = 2 ud, 5kg = 1 ud).
* **Producción Diaria:** Registro de rebobinado por día, asignación a stock/pedidos y cálculo automático de pagos por destajo. Estimación de tiempo de producción basado en `tiempo_x_paquete_min`.
* **Logística de Viajes:** Registro flexible de gastos (gasolina, peajes, viáticos) durante o después del viaje.
* **Venta de Potes:** Control de stock y salidas independiente de los rollos de papel.
* **Finanzas:** Ventas a crédito a 30 días (una sola cuota), soporte para abonos, adelantos y notas de entrega.
* **Identidades (Cédula/RIF):** Soporte global para todos los tipos fiscales y personales de Venezuela (V, E, J, G, P, C).

## 7. Currency & Input Rules
- **Monetary Inputs:** ALWAYS use `<CurrencyInput>` from `@components/ui/CurrencyInput` for price, amount, or exchange rate inputs to ensure ATM-style formatting (`1.234,56`).
- **Database Conversions:** ALWAYS parse formatted currency strings using `parseCurrency` from `@core/utils/currency` before saving/calculating values or inserting into Supabase/PowerSync (`parseCurrency(val)`).
- **Float Formatting:** When passing a raw float (e.g. from an API or calculation) into `formatCurrencyATM`, ALWAYS use `.toFixed(2)` first (e.g., `formatCurrencyATM(val.toFixed(2))`) to prevent dropping trailing zeros which breaks the ATM parser.

## 8. Development Environment (Project IDX & Nix)
- System dependencies, CLIs, Node versions, and VS Code extensions must be configured in `dev.nix` (Nix packages).

## 9. PowerSync & Hooks (CRITICAL)
- **`useQuery` Hook:** When querying reactive data, **ALWAYS** import `useQuery` directly from `@powersync/react`. 
  - ❌ **INCORRECT:** `const { data } = powerSync.useQuery('SELECT * FROM table')` (This will throw a TypeError because `useQuery` is not a method on the `powerSync` object).
  - ✅ **CORRECT:** `import { useQuery } from '@powersync/react';` and then `const { data = [] } = useQuery('SELECT * FROM table')`.
- **Database Permissions & Replication (Supabase):**
  - Execute `GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;` and `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;` so PowerSync can replicate data.
  - Set `ALTER TABLE <tabla> REPLICA IDENTITY FULL;` for all public tables.
  - **Publication:** The `powersync` publication in this project is configured as `FOR ALL TABLES`. Therefore, you do **NOT** need to execute `ALTER PUBLICATION powersync ADD TABLE...` when creating new tables; they are included automatically.
- **Client Auth Configuration (PowerSync Dashboard):**
  - Supabase signs JWTs with `ES256` algorithm and `aud: "authenticated"`.
  - In PowerSync Dashboard -> Client Auth:
    - Set JWKS URI to `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`.
    - Add `authenticated` to **JWT Audience**.
    - Remove conflicting manual HS256 secrets.
- **Connection Management:** Always await `db.init()` before `db.connect()` and use module-level guards to prevent concurrent double-connections during React re-mounts.
- **Upload Queue Blockages:** If a pending local change lacks required columns (e.g., added after the change was made) or violates constraints, the PowerSync Edge Function will return a 500 error. This stalls the local upload queue and blocks further syncs. To resolve in development, instruct the user to clear app data (wipe SQLite cache) or delete the offending record locally.

## 10. API Integrations & Push Notifications
- **Third-Party APIs (e.g., Cedula/Seniat):** Always prefix environment variables with `EXPO_PUBLIC_` in `.env` to ensure they are bundled correctly in the Expo client. Handle API timeouts and empty responses gracefully (e.g., returning `null` or showing clear `Toast` messages).
- **Push Notifications (Native):** Implemented using Expo Push Notifications and Supabase Edge Functions (`notify` and `check_cobranzas`). Push tokens are collected via the `usePushNotifications` hook on login and stored in the `push_tokens` table. Automated alerts (e.g. stock drops, order creation) are triggered directly from Postgres via `pg_net` calling the edge function. No third-party services like OneSignal are used.
  - **CRITICAL - Android Standalone Builds:** *Only if the app uses push notifications (`expo-notifications`)*, to prevent native crashes when requesting tokens on Android (`eas build -p android`), Firebase Cloud Messaging (FCM V1) **must** be configured. The `google-services.json` must be present in the root and referenced in `app.json` (`android.googleServicesFile`). Additionally, the FCM V1 Service Account JSON key must be uploaded via `eas credentials -> Google Service Account`.

## 11. Clean Code & Component Architecture Guidelines
To maintain a clean, maintainable, and scalable codebase, strictly adhere to the following coding standards:

### 🎨 UI & Status Bar (Contraste)
- **Global/Drawer Layouts:** Usar `<StatusBar style="light" backgroundColor={theme.colors.primary} />` si la cabecera es oscura/azul, para que los íconos del sistema se fundan con la cabecera en Android.
- **Pantallas Modales (Fondos Blancos):** Siempre incluir `<StatusBar style="dark" />` dentro del `<View>` principal para asegurar que los íconos de batería y señal sean visibles (negros) sobre el fondo blanco.

### 📦 Import Grouping & Ordering
Imports must be grouped in a clean, consistent order separated by empty lines:
1. **External Core:** React, React Native, Expo libraries (`react`, `react-native`, `expo-router`, `expo-*`).
2. **Third-Party Packages:** UI, Database & State (`react-native-paper`, `@powersync/react`, `@supabase/supabase-js`, `react-native-toast-message`).
3. **Internal Path Aliases:** Imports using aliases (`@core/*`, `@state/*`, `@ui/*`, `@components/*`, `@features/*`).
4. **Local / Feature Imports:** Relative imports for local types, components, or sub-hooks.

```typescript
// 1. External Core
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react.native';
import { useRouter } from 'expo-router';

// 2. Third-Party
import { Text, Button, Surface } from 'react-native-paper';
import { useQuery } from '@powersync/react';

// 3. Path Aliases
import { parseCurrency, formatCurrencyATM } from '@core/utils/currency';
import { CurrencyInput } from '@ui/CurrencyInput';
import { useAuth } from '@state/AuthProvider';

// 4. Local / Feature Imports
import { FeatureItem } from '../components/FeatureItem';
import type { FeatureType } from '../types';
```

### 🧠 Separation of Concerns & Custom Hooks
- **Screen Responsibilities:** Screens inside `src/features/<domain>/screens/` should focus on rendering layout, managing local UI state (modals, active inputs), and handling user interactions.
- **Extract Business & Query Logic into Custom Hooks:** Complex SQL queries (`useQuery`), PowerSync mutations, calculations, and data transformations should be extracted into custom hooks inside `src/features/<domain>/hooks/` (e.g., `useInventario.ts`, `useReportesData.ts`).
- **Reactive Query Fallbacks:** When calling `useQuery` from `@powersync/react`, always assign fallback defaults to prevent `undefined` crashes during initial data sync:
  ```typescript
  const { data: bobinas = [], isLoading } = useQuery('SELECT * FROM bobinas ORDER BY fecha_llegada DESC');
  ```

### 🏷️ Strict Type Safety & Clean Contracts
- **No `any`:** Interfaces and types must be explicitly declared in `src/features/<domain>/types/index.ts` or `@core/types/`.
- **Component Props:** Always type props using interfaces/types (`type ComponentProps = { ... }`).


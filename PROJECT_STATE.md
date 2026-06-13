# Estado Actual del Proyecto (Contexto de Implementación)

Este documento resume todo lo que ya está implementado en el sistema ERP-App (Sistema de Gestión Administrativa para rebobinado de papel y venta de potes) hasta la fecha.

## 1. Arquitectura y Configuración
- **Stack:** React Native (Expo Router v54.0.0), React Native Paper, TypeScript estricto.
- **Estructura Base:** Feature-Based Architecture (`app/` para ruteo estricto, `src/features/` para lógica de negocio, `src/components/ui/` para componentes UI genéricos).
- **Entorno:** Configurado con `.idx/dev.nix` para un entorno aislado y reproducible (NixPackages en Firebase Studio).
- **Tipado y Alias:** Archivo `tsconfig.json` con alias de rutas (`@components`, `@ui`, `@features`, `@state`, `@core`) para importaciones limpias.

## 2. Base de Datos / Backend
- **Archivos Base:** Existen archivos de definiciones SQL (`src/SCHEMA.sql` y `src/STORED_PROCEDURES.sql`) que perfilan la base de datos que respaldará los módulos de este proyecto (posible integración con Supabase).

## 3. Componentes Compartidos (`src/components/ui/`)
Componentes UI universales y adaptables que ya han sido desarrollados:
- `CalendarCustom.tsx`: Integración de calendario personalizado para selección de fechas (usando `react-native-calendars`).
- `CustomCard.tsx`: Tarjeta con el diseño estándar de la aplicación.
- `DatePickerInput.tsx`: Componente de selector rápido de fecha.
- `NumericInput.tsx`: Campo de entrada exclusivo de valores numéricos estricto.
- `StatusBarBadge.tsx`: Indicador visual de estado (badges de status).

## 4. Dominios de Negocio (`src/features/`)
La lógica se ha dividido estrictamente por dominios. Cada uno incluye sus propios archivos de tipado (`.types.ts`) y sus pantallas base (`screens/`):

### 👥 Clientes
- **Tipos:** `clientes.types.ts`
- **Pantallas:** 
  - `ClientesDashboardScreen`: Vista general de clientes.
  - `RegistrarClienteScreen`: Formulario de creación de nuevos clientes.

### 📊 Dashboard
- **Pantallas:** 
  - `DashboardScreen`: Pantalla de inicio con métricas y resumen operativo general.

### 💸 Gastos
- **Tipos:** `gastos.types.ts`
- **Pantallas:** 
  - `RegistrarGastoScreen`: Formulario para asentar viáticos, peajes, gasolina y cualquier otro gasto operativo.

### 📦 Inventario
- **Tipos:** `inventario.types.ts`
- **Pantallas:** 
  - `InventarioDashboardScreen`: Visión general del inventario en todas sus áreas.
  - `HistorialBobinasScreen`: Control y listado de bobinas maestras ingresadas (Tipo A y Tipo B), así como su consumo.
  - `GestionarPotesScreen`: Stock y salidas independientes de potes.
  - `GestionarPresentacionesScreen`: Control de la producción terminada y empaquetada (agrupación en 600g, 1kg, 2.5kg y 5kg).

### 🛒 Pedidos
- **Tipos:** `pedidos.types.ts`
- **Pantallas:** 
  - `PedidosDashboardScreen`: Visión global de los pedidos (y ventas).
  - `NuevoPedidoScreen`: Creación de un pedido/venta, contemplando lógicas de crédito, abonos y notas de entrega.

### 🏭 Producción
- **Tipos:** `produccion.types.ts`
- **Pantallas:** 
  - `HistorialProduccionScreen`: Registro continuo de lo producido en el área de rebobinado.
  - `RegistrarProduccionScreen`: Ingreso de nuevo rebobinado, donde se calcula el peso muerto (core) de las bobinas usadas y se calcula el destajo por kilos producidos.

### 🚚 Viajes
- **Tipos:** `viajes.types.ts`
- **Pantallas:** 
  - `ViajesDashboardScreen`: Visión global sobre la logística de despachos y repartos.
  - `RegistrarViajeScreen`: Asignación y registro para la salida de un viaje de reparto.

## 5. Navegación (Expo Router - `app/`)
El sistema de ruteo está completamente configurado y mapeado; la carpeta `app/` no contiene lógica de negocio, únicamente delega la renderización a los dominios de `src/features/`.

- **Root Layout:** `app/_layout.tsx`
- **Tabs (`app/(tabs)`):** Rutas base para la barra de navegación inferior.
  - `index.tsx` (Renderiza Dashboard)
  - `clientes.tsx`
  - `inventario.tsx`
  - `pedidos.tsx`
  - `viajes.tsx`
- **Screens (`app/(screens)`):** Rutas de pantallas anidadas y modales fuera de los tabs.
  - `gestionar-potes.tsx`
  - `gestionar-presentaciones.tsx`
  - `historial-bobinas.tsx`
  - `historial-produccion.tsx`
  - `nuevo-pedido.tsx`
  - `registrar-cliente.tsx`
  - `registrar-gasto.tsx`
  - `registrar-produccion.tsx`
  - `registrar-viaje.tsx`

---

**Nota de uso continuo:** 
Este documento sirve como ancla contextual para futuros prompts. Si se crean nuevas pantallas, componentes o utilidades estructurales, **deben adherirse a esta misma arquitectura basada en Features y documentarse idealmente en un lugar similar**. No mezclar rutas en `app/` con la lógica principal.

# Estado Actual del Proyecto (Contexto de Implementación)

Este documento resume todo lo que ya está implementado en el sistema ERP-App (Sistema de Gestión Administrativa para rebobinado de papel y venta de potes) hasta la fecha.

---

## 1. Arquitectura y Configuración

- **Stack:** React Native (Expo SDK 54), Expo Router v3, React Native Paper, TypeScript estricto.
- **Estructura Base:** Feature-Based Architecture (`app/` para ruteo estricto, `src/features/` para lógica de negocio, `src/components/ui/` para componentes UI genéricos).
- **Entorno:** Configurado con `.idx/dev.nix` para un entorno aislado y reproducible (NixPackages en Firebase Studio).
- **Tipado y Alias:** `tsconfig.json` con alias (`@components`, `@ui`, `@features`, `@state`, `@core`).
- **Cliente de Desarrollo:** Cliente personalizado Android generado via EAS Build con dependencias nativas incluidas.

---

## 2. Infraestructura de Backend

- **PowerSync + Supabase:** Sincronización offline-first activa. El conector (`Connector.ts`) actúa en nombre del usuario autenticado y respeta RLS.
- **Edge Function `powersync`:** Refactorizada para usar el token del usuario (no `service_role_key`), garantizando que RLS se respete correctamente.
- **Manejo de Sesión:** `AuthProvider.tsx` gestiona globalmente el estado de autenticación; el conector previene subidas si no hay sesión activa.

---

## 3. Autenticación

- **Flujo Google Sign-In:** Implementado con `@react-native-google-signin/google-signin`.
- **Pantalla de Login:** `src/features/auth/screens/LoginScreen.tsx`.
- **Protección de rutas:** Redirige automáticamente a `/login` si no hay sesión.

---

## 4. Componentes UI Reutilizables (`src/components/ui/`)

| Componente | Descripción |
|---|---|
| `CustomCard` | Tarjeta base estilizada |
| `NumericInput` | Input numérico con botones +/− |
| `DatePickerInput` | Selector de fecha reutilizable |
| `StatusBarBadge` | Indicador de estado (badge) |
| `SyncStatusNotifier` | Indicador de estado de sincronización |

---

## 5. Módulos Feature Implementados

### 🧑‍💼 Clientes (`src/features/clientes`)
- CRUD completo offline-first (PowerSync).
- Listado con búsqueda en tiempo real y filtro activo/inactivo.
- Eliminación lógica (desactivar/reactivar).
- Ruta en Drawer: `app/(drawer)/clientes.tsx`.
- Modal de creación/edición: `app/(screens)/registrar-cliente.tsx`.

---

### 🏭 Proveedores (`src/features/proveedores`)
- CRUD completo offline-first (PowerSync).
- Dashboard con búsqueda, filtro activo/inactivo y eliminación lógica.
- Campos: `nombre_empresa`, `teléfono`, `dirección`, `notas`.
- Ruta en Drawer: `app/(drawer)/proveedores.tsx`.
- Modal: `app/(screens)/registrar-proveedor.tsx`.

---

### 📦 Pedidos (`src/features/pedidos`)
- **Dashboard (`PedidosDashboardScreen`)** con dos vistas conectadas a PowerSync:
  - **Logística:** Pedidos en estado `pendiente`, `en_produccion`, `listo` con filtros por chip.
    - Muestra detalles de productos (JOIN con `detalles_pedido`, `productos_presentacion`, `inventario_potes`).
    - Botones de avance de estado: `pendiente → en_produccion → listo`.
  - **Cuentas x Cobrar:** Pedidos `entregado` con `estado_pago = 'pendiente'`.
    - Calcula automáticamente si el crédito está Al Día / Por Vencer (<5 días) / Atrasado.
    - Barra de progreso de deuda (abonado vs total).
    - **Diálogo de Abono:** acepta USD o Bolívares con tasa de cambio; marca el pedido como `pagado` automáticamente al saldarse.
- **Formulario (`NuevoPedidoScreen`)** conectado a PowerSync:
  - Selector de cliente (desde `clientes` activos en BD).
  - Selector de presentación/pote (desde `productos_presentacion` e `inventario_potes` activos).
  - **Tasa de cambio automática** consultada desde `ve.dolarapi.com/v1/dolares` al abrir el formulario (con botón de refresco manual).
  - Muestra el equivalente en Bolívares en tiempo real.
  - Al guardar: inserta en `pedidos` + cada ítem en `detalles_pedido`.
  - Fecha de vencimiento de crédito calculada automáticamente: fecha entrega + 30 días.
- Ruta Modal: `app/(screens)/nuevo-pedido.tsx`.

---

### 📦 Inventario (`src/features/inventario`)

#### Tab: Bobinas Grandes
- **Dashboard (`InventarioDashboardScreen`)** conectado a datos reales de `bobinas_grandes`:
  - **Panel de resumen:** total de bobinas activas, kg totales, conteo Tipo A y Tipo B.
  - **Lista de bobinas** con barra de progreso de consumo por bobina (cambia de verde → amarillo → rojo según los kg restantes).
  - **Diálogo de Merma/Core:** descuenta `merma_core_kg` y `peso_muerto_kg` del `peso_actual_kg`. Marca la bobina como `agotada` automáticamente cuando llega a 0.
- **Historial (`HistorialBobinasScreen`)** conectado a `bobinas_grandes` con `estado = 'agotada'`:
  - Balance completo: peso inicial → merma → core → rendimiento útil.
  - Calcula y muestra **% de eficiencia** con indicador de color (verde/amarillo/rojo).

#### Tab: Rollos (Presentaciones)
- Datos reales de `productos_presentacion` (nombre, stock suelto, paquetes calculados, precio USD).

#### Tab: Potes
- Datos reales de `inventario_potes` (capacidad, stock actual, precio).
- Alerta visual "⚠️ Stock bajo" si hay menos de 20 unidades.

#### CRUD de Presentaciones y Potes
- `GestionarPresentacionesScreen` y `RegistrarPresentacionScreen`.
- `GestionarPotesScreen` y `RegistrarPoteScreen`.
- Rutas: `app/(screens)/gestionar-presentaciones.tsx`, `app/(screens)/gestionar-potes.tsx`, etc.

---

### 🏭 Producción Diaria (`src/features/produccion`)
- **Formulario (`RegistrarProduccionScreen`)** conectado a PowerSync:
  - Selecciona la bobina de origen a descontar (de las disponibles o en uso).
  - Ingreso de la cantidad de rollos producidos por cada presentación activa.
  - **Cálculo automático de kg consumidos** (usando el peso real `peso_real_g` de la presentación).
  - Asignación inteligente: Selección manual de pedidos a abastecer mediante checkboxes.
  - **Botón "Auto-Asignar":** Rellena automáticamente los pedidos pendientes priorizando los más urgentes (ordenados por fecha de entrega).
  - Alerta visual en rojo para pedidos urgentes (fecha de entrega a menos de 3 días).
  - El excedente de producción o producción sin pedido destino va automáticamente al stock general (`productos_presentacion.stock_unidades_sueltas`).
  - Actualización automática del estado del pedido a `listo` si se completan todos los productos requeridos.
- **Historial (`HistorialProduccionScreen`)**:
  - Muestra un timeline de lotes agrupados por la fecha exacta de inserción.
  - Detalla cuántos kg se le descontaron a la bobina, los rollos producidos y su destino (Stock General o Pedido Específico).

---

### 💰 Finanzas / Flujo de Caja (`src/features/finanzas`)
- **Dashboard General (`FinanzasDashboardScreen`)** accesible globalmente desde las pestañas inferiores:
  - **KPIs Financieros (Conversión USD Dinámica):** Calcula y consolida la deudas pendientes de ventas (Cuentas por Cobrar), así como el total de Ingresos y Egresos del mes actual utilizando la tasa de cambio histórica (VES->USD) almacenada individualmente en cada transacción.
  - **Estado de la Deuda:** Barra gráfica que segmenta porcentualmente si la cartera de crédito está "Al Día", "Por Vencer" (a menos de 5 días) o "Atrasada" (créditos con fecha vencida de 30 días).
  - **Flujo de Caja Histórico (Timeline):** Unifica en una sola vista cronológica todas las entradas (pagos, abonos y adelantos de clientes en `abonos_pagos`) y las salidas (gastos logísticos, peajes, gasolina, etc., en `movimientos`), reflejando montos en moneda original y su equivalente convertido.
  - **Registro de Gastos Generales (`RegistrarGastoGeneralScreen`):** Formulario dedicado accesible a través de un botón flotante para registrar pagos de Nómina, Alquiler, Servicios, Suministros u Otros (exigiendo descripción para "Otros").

---

### 📊 Dashboard de Inicio (`src/features/dashboard`)
- **Panel de Control Principal (`DashboardScreen`)** conectado 100% a la base de datos:
  - **Alertas Críticas:** Detecta automáticamente si hay pagos de clientes por vencer en los próximos 5 días o si ya están vencidos, mostrando un banner amarillo disuasivo.
  - **Gráfico Interactivo de Liquidez:** Muestra el flujo de Ingresos (verde) vs Egresos (rojo) en USD. Soporta agrupación dinámica por:
    - **Día:** Últimos 7 días.
    - **Semana:** Últimas 4 semanas.
    - **Mes:** Últimos 6 meses.
  - **Métricas Operativas:** Tarjetas con contadores en tiempo real de Pedidos Pendientes, Pedidos Listos para Despacho, Kilos Totales de Papel Disponible y Unidades de Potes en Stock.

---

### 🚚 Viajes (`src/features/viajes`)

#### Sistema de Estados por Tipo de Viaje

| Tipo | Estado | Acción disponible |
|---|---|---|
| `compra` | `en_progreso` | → Llegué al Proveedor |
| `compra` | `en_destino` | → **Cargar Bobinas** (modal) |
| `compra` | `retornando` | → Llegué a Base (Fin) |
| `entrega` | `en_progreso` | Marcar paradas individualmente |
| `entrega` | (todas entregadas) | → Cerrar Viaje |
| `mixto` | `en_progreso` | Marcar paradas → Ir al Proveedor |
| `mixto` | `en_destino` | → **Cargar Bobinas** (modal) |
| `mixto` | `retornando` | → Llegué a Base (Fin) |

#### Pantallas
- **`ViajesDashboardScreen`:** Viajes activos con acordeones por viaje. Cada acordeón muestra:
  - **Paradas individuales** con botón "Entregado" por parada (registra `hora_llegada`).
  - **`MovimientosViaje`:** Historial de gastos/ingresos registrados en el viaje con resumen Egresos / Balance / Ingresos.
  - **`GastoViajeForm`:** Formulario de movimiento rápido conectado a PowerSync con:
    - Tipo: Gasto / Ingreso.
    - Categorías con íconos: Gasolina, Peaje, Viáticos, Mantenimiento, Operativos, Otros.
    - Monto + toggle VES/USD.
    - Descripción opcional.
    - Guarda en tabla `movimientos`.
- **`RegistrarViajeScreen`:** Formulario conectado a pedidos reales de PowerSync (listos primero, en producción después). Selección de orden de paradas visual. Inserta en `viajes` + `entregas_viaje`.
- **`CargarBobinasViajeScreen`:** Filas dinámicas de bobinas (tipo A/B + peso kg). Inserta en `bobinas_grandes` y avanza el viaje a `retornando`. Opción "Retornar Sin Carga" con confirmación.

---

## 6. Schema de Base de Datos

- Todas las tablas con UUID, RLS habilitado y políticas `FOR ALL TO authenticated`.
- Schema definido en `src/core/powersync/AppSchema.ts` (PowerSync) y `src/SCHEMA_SUPABASE.sql` (Supabase).
- **Tablas principales:** `clientes`, `proveedores`, `pedidos`, `detalles_pedido`, `abonos_pagos`, `productos_presentacion`, `inventario_potes`, `viajes`, `entregas_viaje`, `bobinas_grandes`, `movimientos`.
- **Columnas migradas manualmente en Supabase (ya aplicadas):**
  ```sql
  ALTER TABLE public.entregas_viaje ADD COLUMN IF NOT EXISTS hora_llegada timestamp with time zone;
  ALTER TABLE public.entregas_viaje ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente';
  ALTER TABLE public.entregas_viaje ADD COLUMN IF NOT EXISTS orden int NOT NULL DEFAULT 1;
  ```

---

## 7. Módulos Pendientes

| Módulo | Estado | Prioridad |
|---|---|---|
| Gastos generales (fuera de viaje) | No iniciado | Media |
| Dashboard de KPIs | No iniciado | Media |
| Asignación FIFO de stock a pedidos | Pospuesto | Baja |

---

**Nota de uso continuo:** Este documento sirve como ancla contextual para futuros prompts. Si se crean nuevas pantallas, componentes o utilidades, deben adherirse a la Feature-Based Architecture y documentarse aquí.

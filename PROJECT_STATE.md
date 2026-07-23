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

- **PowerSync + Supabase:** Sincronización offline-first 100% activa en ambas direcciones (subida y descarga).
  - **Conector (`Connector.ts`):** Actúa en nombre del usuario autenticado y respeta RLS.
  - **Edge Function `powersync`:** Recibe las operaciones CRUD enviadas desde la app y las ejecuta en Supabase utilizando el token JWT del usuario.
  - **Replicación y Permisos de BD:** `powersync_role` cuenta con permisos `GRANT SELECT` en todas las tablas (`ALTER DEFAULT PRIVILEGES`), tablas registradas en la publicación de replicación y con `REPLICA IDENTITY FULL`.
  - **Autenticación PowerSync:** Validada mediante JWKS con la URI de Supabase (`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`), soportando algoritmos `ES256` y audience `authenticated`.
- **Manejo de Sesión:** `AuthProvider.tsx` gestiona globalmente el estado de autenticación de Supabase y sincronización de PowerSync con protección contra dobles conexiones en re-montajes.

---

## 3. Autenticación

- **Flujo Google Sign-In:** Implementado con `@react-native-google-signin/google-signin` e ID Token de Supabase.
- **Pantalla de Login (`LoginScreen.tsx`):** Rediseño moderno con branding de la app (`assets/icon.png`), selector para ver/ocultar contraseña, integración con `StatusBar` adaptable (`dark`), `useSafeAreaInsets` y `Toast.show`.
- **Global Loading State (`AppLoader.tsx`):** Animación de Lottie de alta fidelidad que se muestra mientras se resuelve la sesión inicial (Supabase) o se conecta la DB (PowerSync), para evitar saltos en la UI.
- **Protección de rutas:** Redirige automáticamente a `/login` si no hay sesión activa.

---

## 4. Componentes UI Reutilizables (`src/components/ui/`)

| Componente | Descripción |
|---|---|
| `CustomCard` | Tarjeta base estilizada |
| `NumericInput` | Input numérico con botones +/− |
| `CurrencyInput` | Input para precios/montos con formateo al vuelo estilo registradora/ATM (`1.234,56`) |
| `DatePickerInput` | Selector de fecha reutilizable |
| `StatusBarBadge` | Indicador de estado (badge) |
| `SyncStatusNotifier` | Indicador de estado de sincronización |

### Utilidades Globales (`src/core/utils/`)
- `currency.ts`: `formatCurrencyATM` (formatea números al formato ATM) y `parseCurrency` (convierte `"1.234,56"` a `1234.56` antes de guardar en la BD o realizar operaciones matemáticas).

---

## 5. Módulos Feature Implementados

### 🧑‍💼 Clientes (`src/features/clientes`)
- CRUD completo offline-first (PowerSync).
- Listado con búsqueda en tiempo real y filtro activo/inactivo.
- Eliminación lógica (desactivar/reactivar).
- Formulario de clientes con `CurrencyInput` para `limite_credito`.
- **Integración API CNE/Seniat:** Búsqueda automática por Cédula (V/E) para autocompletar Razón Social y RIF (`cedula.com.ve`).
- Ruta en Drawer: `app/(drawer)/clientes.tsx`.
- Modal de creación/edición: `app/(screens)/registrar-cliente.tsx`.

---

### 🏭 Proveedores (`src/features/proveedores`)
- CRUD completo offline-first (PowerSync).
- Dashboard con búsqueda, filtro activo/inactivo y eliminación lógica.
- Campos: `nombre_empresa`, `encargado`, `teléfono`, `dirección`, `notas`, `cedula`, `rif`.
- **Integración API CNE/Seniat:** Búsqueda automática por Cédula (V/E) para autocompletar el nombre del **Encargado** y el **RIF**, manteniendo independiente la Razón Social de la empresa.
- Ruta en Drawer: `app/(drawer)/proveedores.tsx`.
- Modal: `app/(screens)/registrar-proveedor.tsx`.

---

### 📦 Pedidos (`src/features/pedidos`)
- **Dashboard (`PedidosDashboardScreen`)** con dos vistas conectadas a PowerSync:
  - **Logística:** Pedidos en estado `pendiente`, `en_produccion`, `listo` con filtros por chip.
    - Muestra detalles de productos (JOIN con `detalles_pedido`, `productos_presentacion`, `inventario_potes`).
    - **Estimación de tiempo de producción:** Calcula automáticamente las horas/minutos requeridos para abastecer los rollos faltantes del pedido basado en `tiempo_x_paquete_min`.
    - Botones de avance de estado: `pendiente → en_produccion → listo`.
  - **Cuentas x Cobrar:** Pedidos `entregado` con `estado_pago = 'pendiente'`.
    - Calcula automáticamente si el crédito está Al Día / Por Vencer (<5 días) / Atrasado.
    - Barra de progreso de deuda (abonado vs total).
    - **Recordatorio por WhatsApp:** Botón directo que abre WhatsApp (`wa.me/58...`) con mensaje personalizado notificando factura vencida o próxima a vencer.
    - **Diálogo de Abono:** Acepta USD o Bolívares con `CurrencyInput`. Consulta la tasa BCV automáticamente con opción de recarga manual; marca el pedido como `pagado` automáticamente al saldarse.
- **Formulario (`NuevoPedidoScreen`)** conectado a PowerSync:
  - Selector de cliente (desde `clientes` activos en BD).
  - Selector de presentación/pote (desde `productos_presentacion` e `inventario_potes` activos).
  - Inputs monetarios de precios y tasa con `CurrencyInput`.
  - **Tasa de cambio automática** consultada desde `getTasaDolarBCV()` / `dolarapi.com` al abrir el formulario (con botón de refresco manual).
  - Muestra el equivalente en Bolívares en tiempo real.
  - Al guardar: inserta en `pedidos` + cada ítem en `detalles_pedido`.
  - Fecha de vencimiento de crédito calculada automáticamente: fecha entrega + 30 días.
- Ruta Modal: `app/(screens)/nuevo-pedido.tsx`.

---

### 📦 Inventario (`src/features/inventario`)

#### Tab: Bobinas Grandes
- **Dashboard (`InventarioDashboardScreen`)** conectado a datos reales de `bobinas_grandes`:
  - **Panel de resumen:** total de bobinas activas, kg totales, conteo por tipo de papel.
  - **Lista de bobinas** con barra de progreso de consumo por bobina (cambia de verde → amarillo → rojo según los kg restantes).
  - **Diálogo de Merma/Core:** descuenta `merma_core_kg` y `peso_muerto_kg` del `peso_actual_kg`. Marca la bobina como `agotada` automáticamente cuando llega a 0.
- **Historial (`HistorialBobinasScreen`)** conectado a `bobinas_grandes` con `estado = 'agotada'`:
  - Balance completo: peso inicial → merma → core → rendimiento útil.
  - Calcula y muestra **% de eficiencia** con indicador de color (verde/amarillo/rojo).

#### Tab: Rollos (Presentaciones)
- Datos reales de `productos_presentacion` (nombre, stock suelto, paquetes calculados, precio USD, tiempo estimado x paquete en minutos).

#### Tab: Potes
- Datos reales de `inventario_potes` (capacidad, stock actual, precio).
- Alerta visual "⚠️ Stock bajo" si hay menos de 20 unidades.

#### CRUD de Presentaciones y Potes
- `GestionarPresentacionesScreen` y `RegistrarPresentacionScreen` (incluye campo de `tiempo_x_paquete_min` y `precio_USD` con `CurrencyInput`).
- `GestionarPotesScreen` y `RegistrarPoteScreen` (precios de compra y venta con `CurrencyInput`).
- Rutas: `app/(screens)/gestionar-presentaciones.tsx`, `app/(screens)/gestionar-potes.tsx`, etc.

---

### 🏭 Producción Diaria (`src/features/produccion`)
- **Formulario (`RegistrarProduccionScreen`)** conectado a PowerSync:
  - Selecciona la bobina de origen a descontar (de las disponibles o en uso).
  - Ingreso de la cantidad de rollos producidos por cada presentación activa.
  - **Cálculo de Tiempo Estimado:** Muestra los minutos/horas estimadas de trabajo requeridas para la tirada seleccionada.
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
  - **Sin encabezados duplicados:** Se eliminó el `Appbar.Header` interno para integrarse directamente con la navegación global del Drawer.
  - **Tu Liquidez Estimada:** Nueva tarjeta principal interactiva que consolida todo el historial de flujo de caja real (abonos y movimientos). Separa con precisión el saldo físico disponible en **Dólares (USD)** y **Bolívares (VES)**, calculando dinámicamente tu liquidez total global convirtiendo los Bolívares usando la **Tasa Oficial BCV** actualizada en tiempo real vía API al ingresar a la pantalla.
  - **KPIs Financieros:** Consolida las cuentas por cobrar como un bloque compacto superior para no perder visibilidad del capital invertido.
  - **Estado de la Deuda:** Barra gráfica que segmenta porcentualmente si la cartera de crédito está "Al Día", "Por Vencer" (a menos de 5 días) o "Atrasada" (créditos con fecha vencida).
  - **Flujo de Caja Histórico (Timeline):** Unifica entradas (`abonos_pagos`) y salidas (`movimientos`). Rediseñado con **Agrupación por Fechas Exactas**, iconos circulares direccionales e indicador multi-moneda (ej. Abono en Bs convertido visualmente a dólares debajo del título).
  - **Registro de Gastos Generales (`RegistrarGastoGeneralScreen`):** Formulario con `CurrencyInput` para montos y tasas. Clasifica pagos de Nómina, Alquiler, Servicios, Suministros u Otros. Se auto-puebla la Tasa BCV al seleccionar VES.

---

### 📊 Dashboard de Inicio (`src/features/dashboard`)
- **Panel de Control Principal (`DashboardScreen`)** conectado a PowerSync:
  - **Card de Alerta de Cobranza Dinámica:** 
    - Se muestra en **Rojo** (`#fee2e2`) cuando hay pagos vencidos (`pagosVencidos > 0`).
    - Se muestra en **Naranja** (`#FFF3E0`) cuando hay pagos por vencer en los próximos 5 días.
    - **Acción al presionar:** Si hay 1 solo cliente moroso, abre directamente WhatsApp con el mensaje pre-redactado. Si hay múltiples clientes con deuda, despliega un **Modal / Diálogo** interactivo que lista a cada cliente con su saldo y un botón verde directo de WhatsApp `💬`.
  - **Gráfico Interactivo de Liquidez:** Muestra el flujo de Ingresos (verde) vs Egresos (rojo) en USD con agrupación dinámica por Día, Semana o Mes.
  - **Métricas Operativas:** Tarjetas con contadores en tiempo real de Pedidos Pendientes, Pedidos Listos, Kilos de Papel Disponible y Unidades de Potes en Stock.

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
- **`ViajesDashboardScreen`:** Viajes activos con acordeones por viaje.
  - **Paradas individuales** con botón "Entregado" por parada.
  - **`MovimientosViaje`:** Historial de gastos/ingresos registrados en el viaje con resumen Egresos / Balance / Ingresos.
  - **`GastoViajeForm`:** Formulario de movimiento rápido conectado a PowerSync con `CurrencyInput`.
- **`RegistrarViajeScreen`:** Formulario conectado a pedidos reales de PowerSync. Selección de orden de paradas visual. Inserta en `viajes` + `entregas_viaje`.
- **`CargarBobinasViajeScreen`:** Filas dinámicas de bobinas (tipo de papel + peso kg). Inserta en `bobinas_grandes` y avanza el viaje a `retornando`.

---

## 6. Multi-Moneda y Reglas de Precios / Empaque
- **Input de Dinero Estilo ATM (`CurrencyInput`):** Formateo automático de derecha a izquierda (`1.234,56`) con conversión limpia a número flotante (`parseCurrency`) antes de realizar operaciones de BD.
- **Venta por Rollos Individuales:** Los pedidos se solicitan y cotizan por cantidad de rollos/unidades individuales.
- **Precio por Rollo:** El `precio_USD` en `productos_presentacion` representa el **Precio x Rollo (USD)**.
- **Cálculo Automático de Empaque:** El sistema calcula en tiempo real cuántos paquetes completos y rollos sueltos representan las unidades solicitadas.
- **Desglose en Logística y Formulario:** Se visualiza el equivalente de empaque tanto al construir el pedido como en las tarjetas del Dashboard.
- **Asignación de Tipo de Papel por Ítem:** Cada ítem en `detalles_pedido` almacena `id_tipo_papel`.
- **Tasas de Cambio Dinámicas:** En la creación de pedidos y abonos, se consulta la tasa BCV automáticamente vía API o se permite tasa "Efectivo" manual.

---

## 7. Schema de Base de Datos

- Todas las tablas con UUID, RLS habilitado y políticas `FOR ALL TO authenticated`.
- Schema definido en `src/core/powersync/AppSchema.ts` (PowerSync) y base de datos (Supabase).
- **Tablas principales:** `clientes`, `proveedores`, `pedidos`, `detalles_pedido`, `abonos_pagos`, `productos_presentacion` (incluye `tiempo_x_paquete_min`), `inventario_potes`, `viajes`, `entregas_viaje`, `bobinas_grandes`, `movimientos`, `tipos_papel`.

---

## 8. Módulos Pendientes

| Módulo | Estado | Prioridad |
|---|---|---|
| **Notificaciones Push** | No iniciado | Alta |
| Pago por Destajo a Operarios | No iniciado | Media |
| Generación de PDF / Notas de Entrega | No iniciado | Media |
| Exportación a Excel/CSV | No iniciado | Baja |
| **Refactoring: Queries a Custom Hooks** | Pendiente | Media |
| **Gestión de Usuarios y Roles (UI)** | Pendiente | Media |

---

**Nota de uso continuo:** Este documento sirve como ancla contextual para futuros prompts. Si se crean nuevas pantallas, componentes o utilidades, deben adherirse a la Feature-Based Architecture y documentarse aquí.

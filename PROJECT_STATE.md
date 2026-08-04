# Estado Actual del Proyecto (Contexto de Implementación)

Este documento resume todo lo que ya está implementado en el sistema ERP-App (Sistema de Gestión Administrativa para rebobinado de papel y venta de potes) hasta la fecha.

---

## 1. Arquitectura y Configuración

- **Stack:** React Native (Expo SDK 54), Expo Router v3, React Native Paper, TypeScript estricto.
- **Estructura Base:** Feature-Based Architecture (`app/` para ruteo estricto, `src/features/` para lógica de negocio, `src/components/ui/` para componentes UI genéricos).
- **Entorno:** Configurado con `.idx/dev.nix` para un entorno aislado y reproducible (NixPackages en Firebase Studio).
- **Tipado y Alias:** `tsconfig.json` con alias (`@components`, `@ui`, `@features`, `@state`, `@core`).
- **Cliente de Desarrollo:** Cliente personalizado Android generado via EAS Build con dependencias nativas incluidas.
- **UI & Navegación:** Barras de estado (`StatusBar`) dinámicas por contexto (claro/oscuro) para garantizar contraste, y ruteo inicial fijado en Dashboard (`initialRouteName="index"`).

---

## 2. Infraestructura de Backend

- **PowerSync + Supabase:** Sincronización offline-first 100% activa en ambas direcciones (subida y descarga).
  - **Conector (`Connector.ts`):** Actúa en nombre del usuario autenticado y respeta RLS.
  - **Edge Function `powersync`:** Recibe las operaciones CRUD enviadas desde la app y las ejecuta en Supabase utilizando el token JWT del usuario.
  - **Replicación y Permisos de BD:** `powersync_role` cuenta con permisos `GRANT SELECT` en todas las tablas (`ALTER DEFAULT PRIVILEGES`), tablas registradas en la publicación de replicación y con `REPLICA IDENTITY FULL`.
- **Autenticación PowerSync:** Validada mediante JWKS con la URI de Supabase (`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`), soportando algoritmos `ES256` y audience `authenticated`.
- **Manejo de Sesión:** `AuthProvider.tsx` gestiona globalmente el estado de autenticación de Supabase y sincronización de PowerSync con protección contra dobles conexiones en re-montajes.
- **Notificaciones Push (Nativas):** Integración mediante Edge Functions (`notify`, `check_cobranzas`) y Triggers en PostgreSQL (`pg_net`). Los tokens de Expo se recolectan vía `usePushNotifications` al hacer login. **FCM V1 configurado y verificado:** Service Account JSON subido al dashboard de EAS (`expo.dev/.../credentials`). La Edge Function `notify` incluye cabecera `Authorization: Bearer` usando el secreto `EXPO_ACCESS_TOKEN` almacenado en Supabase. Notificaciones push funcionando y verificadas en dispositivo físico Android.
  - **Triggers de Notificación Corregidos:** Se actualizaron todos los triggers (`on_bobinas_insert`, `on_pedidos_insert`, `on_viajes_update`, `on_movimientos_insert`, `on_produccion_insert`) para usar `jsonb_build_object` en lugar de `json_build_object`, evitando errores de discrepancia de tipos (JSON vs JSONB) al invocar `send_push_notification`.
  - **Parámetros en Tabla `configuracion`:** Para evadir las restricciones de permisos GUC (`ALTER DATABASE`) en instancias gestionadas de Supabase, la función `send_push_notification` lee dinámicamente la URL del proyecto (`project_url`) y el token (`anon_key`) directamente desde la tabla `public.configuracion`.
  - **Campana In-App (Offline-First):** Se agregó `NotificacionesScreen` con un ícono de campana global en el header. Utiliza la tabla `notificaciones_historial` sincronizada vía PowerSync para mantener el conteo de no leídas (badge) e historial localmente.
  - **Sincronización en PowerSync v3 (Edition 3):** El historial de notificaciones se sincroniza de forma segura y automática para cada usuario utilizando la función `auth.user_id()` (`SELECT * FROM notificaciones_historial WHERE user_id = auth.user_id()`) en la configuración de Sync Streams, lo que permite la separación implícita y automática de buckets.
  - **Deep Linking:** Las notificaciones (tanto OS como In-App) incluyen un payload `ruta` que redirige automáticamente al usuario al módulo correspondiente (`/inventario`, `/pedidos`, etc.) al tocarlas.

---

## 3. Autenticación

- **Flujo Google Sign-In:** Implementado con `@react-native-google-signin/google-signin` e ID Token de Supabase.
- **Creación de Perfiles (Trigger):** Supabase ejecuta un trigger (`handle_new_user`) que automáticamente crea un perfil con rol `operador` y estado inactivo (`activo = false`) al registrar un nuevo usuario vía OAuth.
- **Pantalla de Login (`LoginScreen.tsx`):** Rediseño moderno con branding de la app, selector de contraseña y loaders.
- **Protección de Navegación (`app/_layout.tsx`):** 
  - Redirige a `/login` si no hay sesión.
  - Redirige a `CuentaInactivaScreen` si el usuario está autenticado pero su perfil tiene `activo = false` (hasta que el Admin lo apruebe).

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
- **Integración API CNE/Seniat:** Búsqueda automática y soporte para Documentos Personales y Jurídicos (V, E, J, G, P, C) permitiendo un registro amplio de identidades.
- Ruta en Drawer: `app/(drawer)/clientes.tsx`.
- Modal de creación/edición: `app/(screens)/registrar-cliente.tsx`.

---

### 🏭 Proveedores (`src/features/proveedores`)
- CRUD completo offline-first (PowerSync).
- Dashboard con búsqueda, filtro activo/inactivo y eliminación lógica.
- Campos: `nombre_empresa`, `encargado`, `teléfono`, `dirección`, `notas`, `cedula`, `rif`.
- **Integración API CNE/Seniat:** Búsqueda automática y soporte completo (V, E, J, G, P, C) para registrar identidad y RIF. En la BD (`Supabase`) solo el **Nombre de la Empresa** es estrictamente obligatorio (`NOT NULL`).
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
- **Generación de Notas de Entrega en PDF**:
  - Diseño calcado y profesional del talonario físico con CSS Grid, usando `expo-print`.
  - Número de secuencia global gestionado a través de la tabla `configuracion` (sincronizada en PowerSync). El consecutivo avanza dinámicamente y se bloquea para el pedido impreso.
  - Formato de fecha dinámico: usa `fecha_entrega` si está entregado, o fecha actual (`new Date()`) en otro estado.
  - Los archivos generados se guardan usando `expo-file-system/legacy` y se nombran automáticamente con el Nro y Razón Social del cliente para compartir profesionalmente vía `expo-sharing`.
  - Aviso legal obligatorio incluido en el diseño ("NO TIENE VALIDEZ FISCAL").

---

### 📦 Inventario (`src/features/inventario`)

#### Tab: Bobinas Grandes
- **Dashboard (`InventarioDashboardScreen`)** conectado a datos reales de `bobinas_grandes`:
  - **Panel de resumen:** total de bobinas activas, kg totales, conteo por tipo de papel.
  - **Lista de bobinas** con barra de progreso de consumo por bobina (cambia de verde → amarillo → rojo según los kg restantes).
  - **Diálogo de Merma:** descuenta `merma_core_kg` del `peso_actual_kg`. El sistema calcula automáticamente el `peso_muerto_kg` (el resto de la bobina), marca la bobina como `agotada` y registra la fecha de gasto exacta (`fecha_gasto = now()`).
- **Historial (`HistorialBobinasScreen`)** conectado a `bobinas_grandes` con `estado = 'agotada'`:
  - Selector de Filtros de Tiempo (1 Mes, 3 Meses, 6 Meses, 1 Año, Rango Personalizado).
  - Balance completo: peso inicial → merma → core → rendimiento útil.
  - Calcula y muestra **% de eficiencia** con indicador de color (verde/amarillo/rojo). Flex wrap incorporado para evitar overflows visuales.

#### Tab: Rollos (Presentaciones)
- Datos reales de `productos_presentacion` (nombre, stock suelto, paquetes calculados, precio USD, tiempo estimado x paquete en minutos).

#### Tab: Potes
- Datos reales de `inventario_potes` (capacidad, stock actual, precio).
- Alerta visual "⚠️ Stock bajo" si hay menos de 20 unidades.
- **Historial de Salidas (`HistorialPotesScreen`)**:
  - Filtros de tiempo por fecha.
  - Muestra un desglose histórico de los potes consumidos en `detalles_pedido` (descontados por pedidos confirmados o cancelados).

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
  - Filtros de tiempo por fecha incorporados.
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
  - **Filtros Avanzados y Reportes:** Sistema de filtrado robusto mediante `CalendarCustom` para filtrar por fechas y tipos (Todos/Ingresos/Gastos). Permite ordenar por "Mayor Monto" y **exportar la vista actual a PDF** (`generateFinanzasPdf.ts`) con resumen de totales y conversión monetaria.
  - **Registro de Gastos Generales (`RegistrarGastoGeneralScreen`):** Formulario con `CurrencyInput` para montos y tasas. Clasifica pagos de Nómina, Alquiler, Servicios, Suministros u Otros. Se auto-puebla la Tasa BCV al seleccionar VES.

---

### 📊 Dashboard de Inicio (`src/features/dashboard`)
- **Panel de Control Principal (`DashboardScreen`)** conectado a PowerSync y con **Control de Acceso (RBAC)**:
  - **Diferenciación por Rol:**
    - **Administrador:** Visualiza las Alertas Financieras de Cobranza (Rojo/Naranja) y el Gráfico Financiero de Ingresos vs Egresos ($) con agrupación por Día, Semana o Mes.
    - **Operador / Otros:** El gráfico financiero se reemplaza por el **Gráfico de Producción** (LineChart con área) con toggle de métrica (🧻 Rollos / ⚖️ Kg) y filtros de período (Hoy / Semana / Mes).
  - **Métricas Operativas:** Tarjetas con contadores en tiempo real de Pedidos Pendientes, Pedidos Listos, Kilos de Papel Disponible y Unidades de Potes en Stock.
  - **Botón Flotante (FAB):** Acceso rápido preservado para registro inmediato de pedidos, producción y viajes.

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
- **`RegistrarViajeScreen`:** Formulario conectado a pedidos reales de PowerSync. Selección de orden de paradas visual. Inserta en `viajes` + `entregas_viaje`.
- **`CargarBobinasViajeScreen` ("Cargar Mercancía"):** Pantalla rediseñada con pestañas (`SegmentedButtons`) para registrar **🧻 Bobinas** (tipo + peso en kg) y **🫙 Potes** (cantidades por tipo). Actualiza `inventario_potes.stock_actual` e inserta en `bobinas_grandes`, avanzando el viaje a `retornando`.

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

### 📈 Reportes y Estadísticas (`src/features/reportes`)
- **Dashboard Dual/Triple (`ReportesDashboardScreen`)** conectado offline-first:
  - **Producción:** Analíticas de eficiencia de materia prima (Mermas vs Papel Útil) con gráfico tipo Pie. Historial de producción en gráficos de línea para **Rollos Producidos** y **Kg Consumidos**.
  - **Finanzas:** Flujo de caja comparativo (Ventas, Cobranzas, Cuentas por Cobrar) con gráfico de Barras multi-columna.
  - **Logística:** Desglose del presupuesto gastado en ruta (Gasolina, Peaje, Viáticos) con gráfico tipo Donut interactivo, convertido a USD automáticamente.
- **Filtros Globales de Tiempo:** Selector unificado (1 Mes, 3 Meses, Rango Personalizado "Desde-Hasta").
- **Motor de Exportación PDF Avanzado (`generatePdf.ts`):** 
  - **Gráficos Incrustados:** Captura en tiempo real del gráfico activo (Base64) mediante `react-native-view-shot`. Se implementó un algoritmo dinámico (`maxValue={max * 1.2}`) para evitar recortes en la parte superior de las gráficas de línea.
  - **Selector de Nivel de Detalle:** Permite emitir un "Resumen" gerencial o un reporte "Detallado" con tablas de registro exacto (ej. lista de facturas emitidas, historia de viáticos).
  - **Análisis Automatizado:** Los PDF generan texto explicativo (KPIs) automático basado en los porcentajes calculados (ej. Eficiencia de Mermas, Deuda vs Facturado).
  - **Formato Corporativo:** Cabeceras HTML profesionales y uso de CSS (`page-break-before`) para paginación controlada al imprimir. Exportación a archivo físico usando `expo-file-system/legacy` para nombres de archivo limpios antes de compartir.
  - **Animación y UX:** Botón de descarga interactivo con loader para evitar dobles clics durante el renderizado asíncrono.

---

### 🛡️ Gestión de Usuarios y Permisos (RBAC) (`src/features/usuarios`)
- **Sistema Basado en Roles:** Soporte para 4 roles: `admin`, `operador`, `chofer`, `vendedor`.
- **Dashboard de Usuarios (`UsuariosDashboardScreen`):** Panel exclusivo para administradores que lista usuarios activos y pendientes de activación.
- **Edición de Perfiles:** Permite al administrador cambiar el rol de cualquier usuario y alternar su estado de acceso (`activo`).
- **Matriz de Permisos (`MatrizPermisosScreen`):**
  - Interfaz de grid/tabla donde el admin configura con 'switches' qué rol tiene acceso a qué módulo de la app.
  - El rol `admin` tiene acceso total bloqueado por defecto.
  - Sincronización en tiempo real con PowerSync, propagando las restricciones a los dispositivos offline.
- **Controladores de UI:** El Hook `usePermissions()` determina qué pantallas, menús (Drawer) y pestañas (Tabs) son visibles según la configuración de la matriz para el rol actual del usuario.

---

## 8. Módulos Pendientes

| Módulo | Estado | Prioridad |
|---|---|---|
| **Mejoras Visuales en PDF (Gráficos Base64 y Tablas)** | ✅ Completado | Media |
| **Notificaciones Push (Nativas Expo + Edge Functions + FCM V1)** | ✅ Completado | Alta |
| **Gestión de Usuarios y Roles (RBAC)** | ✅ Completado | Alta |
| **Pestaña Mi Perfil (Switch Notificaciones + Info Real)** | ✅ Completado | Media |
| **Carga de Mercancía en Viajes (Bobinas + Potes)** | ✅ Completado | Alta |
| Exportación a Excel/CSV | No iniciado | Baja |
| **Refactoring: Queries a Custom Hooks** | Pendiente | Media |
| **Limpieza de Tokens Push Muertos (`DeviceNotRegistered`) en Edge Functions** | Pendiente | Media |

---

**Nota de uso continuo:** Este documento sirve como ancla contextual para futuros prompts. Si se crean nuevas pantallas, componentes o utilidades, deben adherirse a la Feature-Based Architecture y documentarse aquí.

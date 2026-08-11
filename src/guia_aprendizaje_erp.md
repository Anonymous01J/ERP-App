# 🎓 Guía de Aprendizaje — ERP-App
> Tecnologías, conceptos y patrones que debes dominar para trabajar en el proyecto de forma independiente.

---

## 🗺️ Mapa General del Stack

```
ERP-App
├── React Native 0.81 + Expo SDK 54     ← Motor de la app
├── Expo Router v6                       ← Navegación file-based
├── React Native Paper v5                ← Componentes UI (Material Design)
├── TypeScript estricto                  ← Lenguaje (sin `any`)
├── PowerSync + @powersync/react         ← SQLite local Offline-First
├── Supabase                             ← Backend (Auth + Postgres + Edge Functions)
└── EAS Build / Expo Dev Client          ← Build y distribución
```

---

## 1. 🟦 TypeScript (Prioridad ALTA)

El proyecto usa TypeScript **sin `any`**. Es la base de todo el código.

### Conceptos a dominar

| Concepto | ¿Por qué lo usamos? | Ejemplo en el proyecto |
|---|---|---|
| **Interfaces y Types** | Definir la forma de los datos | `type Perfil = { id: string; rol: UserRole; activo: boolean }` |
| **Generics** | Funciones/componentes reutilizables tipados | `useState<Session \| null>(null)` |
| **Union Types** | Estados, roles, monedas | `type UserRole = 'admin' \| 'operador' \| 'chofer' \| 'vendedor'` |
| **Type Guards** | `instanceof Error`, narrowing | Ver `Connector.ts` línea 94 |
| **Optional Chaining** | Acceso seguro a objetos posiblemente nulos | `result.rows?.length` |
| **Nullish Coalescing** | Valores por defecto | `data ?? []` |
| **Partial / Pick / Omit** | Manipular tipos existentes | Formularios donde no todos los campos son requeridos |
| **`as const`** | Constantes tipadas | Arrays de opciones |
| **Tipado de Props** | Siempre tipar las props de componentes | `type Props = { onSave: () => void; titulo: string }` |
| **Path Aliases en tsconfig** | Importaciones limpias | `@core/*`, `@ui/*`, `@features/*` |

### 📚 Recursos
- https://www.typescriptlang.org/docs/handbook/2/types-from-types.html

---

## 2. ⚛️ React — Fundamentos y Hooks (Prioridad ALTA)

React es el motor del renderizado. Antes de tocar React Native, debes tener esto claro.

### Hooks esenciales

| Hook | ¿Cuándo se usa? | Ejemplo en el proyecto |
|---|---|---|
| `useState` | Estado local de UI (modales, inputs, selecciones) | `const [visible, setVisible] = useState(false)` |
| `useEffect` | Efectos secundarios (suscripciones, carga inicial) | `AuthProvider.tsx` — suscripción a `onAuthStateChange` |
| `useContext` | Consumir contexto global | `const { session, perfil } = useAuth()` |
| `createContext` | Crear contexto global | `AuthContext` en `AuthProvider.tsx` |
| `useCallback` | Evitar recreación de funciones en renders | Formularios con validaciones complejas |
| `useMemo` | Cálculos derivados costosos | Filtrar/ordenar listas largas |
| `useRef` | Referencia a elementos o valores persistentes | Refs para inputs, scroll, view capture |

### Conceptos de React
- **Renderizado condicional**: `{condition && <Component />}`
- **Listas con `.map()`**: siempre con `key` único
- **Lifting State Up**: pasar setters como props a hijos
- **Custom Hooks**: lógica extraída en funciones `useXxx`
- **Provider Pattern**: `<AuthContext.Provider value={...}>` envolviendo la app

### Custom Hooks en el proyecto
Toda query SQL compleja **debe** estar en su propio hook en `src/features/<dominio>/hooks/`:
```typescript
// src/features/inventario/hooks/useInventario.ts
export function useInventario() {
  const { data: bobinas = [], isLoading } = useQuery('SELECT * FROM bobinas_grandes ORDER BY fecha_llegada DESC');
  return { bobinas, isLoading };
}
```

---

## 3. 📱 React Native — Core (Prioridad ALTA)

### Componentes fundamentales que usamos

| Componente | Descripción |
|---|---|
| `View` | Contenedor base (equivalente a `<div>`) |
| `Text` | Texto. Soporta `adjustsFontSizeToFit` y `numberOfLines` para overflow de montos grandes |
| `ScrollView` | Lista scrolleable simple |
| `FlatList` | Lista virtualizada para datos grandes (pedidos, clientes, etc.) |
| `TouchableOpacity` | Elemento presionable con efecto de opacidad |
| `Pressable` | Presionable más moderno con más control |
| `TextInput` | Campo de texto nativo |
| `StyleSheet` | Definición de estilos (siempre fuera del componente) |
| `Platform` | Detectar iOS vs Android |
| `Modal` | Ventana modal nativa |
| `Alert` | Diálogos de confirmación nativos |
| `Share` | API nativa para compartir texto (hojas de ruta) |

### Flexbox en React Native
**CRÍTICO**: React Native usa Flexbox por defecto, pero con diferencias respecto a CSS:
- `flexDirection` es **`column`** por defecto (no `row` como en web)
- No existe `display: grid`; todo es Flexbox
- `flex: 1` hace que un hijo ocupe todo el espacio disponible
- `flexShrink: 1` evita que montos grandes desborden su contenedor

### StyleSheet
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  monto: {
    flex: 1,        // Ocupa espacio disponible
    flexShrink: 1,  // Se encoge si el texto es largo
  }
});
```

### Safe Area
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
// Siempre envolver el root de la pantalla para respetar notch/isla
```

---

## 4. 🧭 Expo Router — Navegación (Prioridad ALTA)

El proyecto usa **Expo Router v6**, que es navegación **file-based** (igual que Next.js).

### Estructura de rutas

```
app/
├── _layout.tsx          ← Root layout: Auth Guard + Providers
├── login.tsx            ← Pantalla de login (shell)
├── (drawer)/            ← Grupo de navegación con Drawer lateral
│   ├── _layout.tsx      ← Define el Drawer + Tabs
│   ├── (tabs)/          ← Pestañas inferiores
│   │   ├── index.tsx    ← Dashboard (tab 1)
│   │   └── finanzas.tsx ← Finanzas (tab 2)
│   └── clientes.tsx     ← Sección accesible desde el Drawer
└── (screens)/           ← Modales y pantallas secundarias
    ├── nuevo-pedido.tsx
    └── registrar-cliente.tsx
```

### Hooks de Expo Router

| Hook | ¿Para qué? |
|---|---|
| `useRouter()` | Navegar programáticamente: `router.push('/ruta')`, `router.back()` |
| `useLocalSearchParams()` | Leer parámetros de URL: `?viajeId=123` |
| `useSegments()` | Saber en qué segmento de ruta estás (para Auth Guard) |

### Auth Guard (patrón central del proyecto)
El archivo `app/_layout.tsx` es el guardián de toda la navegación:
```typescript
// Si no hay sesión → redirigir a /login
// Si la cuenta está inactiva → redirigir a CuentaInactivaScreen
// Si todo OK → mostrar la app normal
```

### Grupos de rutas
- `(drawer)` y `(screens)` son grupos de rutas: los paréntesis los excluyen del path real de la URL.

---

## 5. 🎨 React Native Paper — UI (Prioridad ALTA)

Librería de componentes UI basada en Material Design 3.

### Componentes que usamos frecuentemente

| Componente | Uso en el proyecto |
|---|---|
| `Appbar.Header` + `Appbar.Content` + `Appbar.Action` | Cabeceras de pantalla |
| `Button` | Botones con variantes (`contained`, `outlined`, `text`) |
| `Card` + `Card.Content` | Tarjetas de información |
| `Surface` | Contenedor elevado |
| `Text` | Textos con variantes tipográficas (`titleMedium`, `bodySmall`, etc.) |
| `TextInput` | Inputs estilizados con modo `outlined`/`flat` |
| `Dialog` + `Dialog.Content` + `Dialog.Actions` | Diálogos modales |
| `FAB` | Botón flotante de acción |
| `Chip` | Filtros de estado (pendiente / listo) |
| `SegmentedButtons` | Tabs tipo selector (Bobinas / Potes) |
| `ProgressBar` | Barra de progreso (consumo de bobinas, deuda) |
| `Switch` | Toggle on/off (permisos en MatrizPermisosScreen) |
| `Divider` | Separador horizontal |
| `Portal` + `Modal` | Modales que renderizan sobre todo el árbol de vistas |
| `useTheme()` | Hook para acceder a los colores del tema activo |
| `ActivityIndicator` | Spinner de carga |

### Tema personalizado
El tema de la app se define en `src/core/theme/` y se pasa al `<PaperProvider>`.

---

## 6. 🔄 PowerSync — Offline-First (Prioridad MUY ALTA)

PowerSync es el sistema que hace que la app funcione **sin internet**, sincronizando los datos de Supabase a una base de datos SQLite local en el dispositivo.

### Conceptos fundamentales

#### ¿Cómo funciona?
```
Dispositivo (SQLite local) ←→ PowerSync Server ←→ Supabase (PostgreSQL)
        ↑                                                    ↑
   Lee datos locales                             Guarda cambios definitivos
   (siempre rápido, sin red)                     (cuando hay conexión)
```

#### Inicialización (NUNCA bloquear por red)
```typescript
// ✅ CORRECTO — Offline First
await db.init();                             // Abre SQLite local
db.connect(connector).catch(console.error);  // Fire-and-forget (no await)

// ❌ INCORRECTO — Bloquea si no hay red
await db.connect(connector);
```

#### Schema (`AppSchema.ts`)
Define qué tablas y columnas existe localmente en el dispositivo:
```typescript
const clientes = new Table({
  razon_social: column.text,
  limite_credito: column.real,
  estado: column.text
});
export const AppSchema = new Schema({ clientes, /* ... */ });
```

#### `useQuery` — Lectura reactiva
```typescript
import { useQuery } from '@powersync/react'; // ← SIEMPRE de aquí

// Los datos se actualizan automáticamente cuando cambia la BD local
const { data: clientes = [], isLoading } = useQuery(
  'SELECT * FROM clientes WHERE estado = ? ORDER BY razon_social',
  ['activo']
);
```

#### `db.execute()` — Escritura / mutaciones
```typescript
import { db } from '@core/powersync/system';

await db.execute(
  'INSERT INTO pedidos (id, id_cliente, estado) VALUES (?, ?, ?)',
  [uuid(), clienteId, 'pendiente']
);
// PowerSync lo sube automáticamente a Supabase cuando haya conexión
```

#### Connector (`Connector.ts`)
Es el puente que sube los cambios locales a Supabase via Edge Function:
- `fetchCredentials()` → obtiene el JWT de Supabase para autenticarse con PowerSync
- `uploadData()` → envía los cambios pendientes a la Edge Function `powersync` en Supabase

### Reglas críticas del proyecto
- **Fallback de arrays**: `const { data: items = [] } = useQuery(...)` — siempre poner default vacío
- **No usar**: `powerSync.useQuery()` (no existe, da TypeError)
- **Usar siempre**: `import { useQuery } from '@powersync/react'`

---

## 7. 🗄️ Supabase — Backend (Prioridad ALTA)

Supabase es el backend: autenticación, base de datos PostgreSQL y funciones en el servidor.

### Módulos que usamos

#### Autenticación
```typescript
import { supabase } from '@core/supabase/client';

// Obtener la sesión actual
const { data: { session } } = await supabase.auth.getSession();

// Escuchar cambios de sesión
supabase.auth.onAuthStateChange((event, session) => { ... });

// Cerrar sesión
await supabase.auth.signOut();

// Google Sign-In (OAuth)
await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
```

#### Row Level Security (RLS)
Todas las tablas tienen RLS activado. Esto significa que cada usuario **solo puede ver sus propios datos**. La política es `FOR ALL TO authenticated`, lo que significa que cualquier usuario autenticado puede operar sus registros.

#### Edge Functions
Son funciones en el servidor (Deno/TypeScript) que ejecutamos con:
```typescript
const { data, error } = await supabase.functions.invoke('nombre-funcion', {
  body: { ... },
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```
Funciones en el proyecto: `powersync` (CRUD sync), `notify` (push), `check_cobranzas`.

#### Base de datos (solo lectura directa cuando sea necesario)
```typescript
const { data, error } = await supabase
  .from('clientes')
  .select('*')
  .eq('estado', 'activo');
```
> **NOTA**: En este proyecto, la mayoría de lecturas se hacen via PowerSync (`useQuery`), NO directamente con Supabase.

---

## 8. 🔔 Notificaciones Push — Expo Notifications (Prioridad MEDIA)

### Flujo completo
1. Al hacer login, `usePushNotifications` hook pide permiso al OS y obtiene el **Expo Push Token**
2. El token se guarda en la tabla `push_tokens` de Supabase
3. Triggers de PostgreSQL (via `pg_net`) llaman a la Edge Function `notify` cuando ocurre un evento (nuevo pedido, stock bajo, etc.)
4. La Edge Function envía la notificación al dispositivo via Expo Push API + FCM V1

### Conceptos clave
- **FCM V1**: Firebase Cloud Messaging. Necesario para Android nativo. El `google-services.json` y el Service Account JSON son la configuración clave.
- **Token muerto (`DeviceNotRegistered`)**: Si el token falla con este error, la Edge Function debe eliminarlo de `push_tokens`.
- **Deep Linking**: La notificación incluye un campo `ruta` que Expo Router usa para navegar a una pantalla específica al tocar la notificación.

---

## 9. 📄 Generación de PDF — `expo-print` (Prioridad MEDIA)

Para generar Notas de Entrega y Reportes en PDF.

```typescript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy'; // ← Siempre legacy en SDK 54

// 1. Generar HTML
const html = `<html><body>...</body></html>`;

// 2. Crear el PDF
const { uri } = await Print.printToFileAsync({ html });

// 3. Mover el archivo a un nombre descriptivo
await FileSystem.moveAsync({ from: uri, to: targetPath });

// 4. Compartir
await Sharing.shareAsync(targetPath);
```

**Importante**: En Expo SDK 54, `expo-file-system` usa una nueva API. Para `moveAsync` y `readAsStringAsync` debes importar desde `'expo-file-system/legacy'`.

---

## 10. 📊 Gráficas — `react-native-gifted-charts` (Prioridad MEDIA)

Para el Dashboard y módulo de Reportes.

### Tipos de gráficas usadas
- `LineChart` — Producción diaria (rollos / kg)
- `BarChart` — Finanzas (ingresos vs egresos)
- `PieChart` / `PieChart` (modo donut) — Distribución de gastos de viaje y mermas

### Regla crítica del proyecto
```typescript
// Siempre calcular un maxValue con 20% de margen para evitar corte del punto máximo
const maxVal = Math.max(...data.map(d => d.value));
<LineChart data={data} maxValue={maxVal * 1.2} />
```

---

## 11. 💱 Sistema Multi-Moneda (Regla de negocio crítica)

El negocio opera en **USD y VES (Bolívares)** con tasa BCV dinámica.

### Reglas de la app

1. **Inputs de dinero** → Siempre usar `<CurrencyInput>` de `@ui/CurrencyInput`
   - Formateo ATM estilo registradora: `1.234,56` (punto = miles, coma = decimales)

2. **Antes de guardar en BD** → Siempre convertir con `parseCurrency`
   ```typescript
   import { parseCurrency } from '@core/utils/currency';
   const valorNumerico = parseCurrency('1.234,56'); // → 1234.56
   ```

3. **Para mostrar un float** → Usar `formatCurrencyATM` con `.toFixed(2)` antes
   ```typescript
   import { formatCurrencyATM } from '@core/utils/currency';
   formatCurrencyATM((1234.5).toFixed(2)); // → '1.234,50'
   ```

4. **Tasa BCV** → Se consulta desde `dolarapi.com` al abrir formularios de pedidos y abonos

---

## 12. 🏗️ Arquitectura Feature-Based (Patrón del proyecto)

### Estructura por feature

```
src/features/pedidos/
├── screens/
│   ├── PedidosDashboardScreen.tsx   ← Solo UI + estado local
│   └── NuevoPedidoScreen.tsx
├── components/
│   └── PedidoCard.tsx               ← Componente específico del dominio
├── hooks/
│   └── usePedidos.ts                ← Queries SQL + lógica de negocio
└── types/
    └── index.ts                     ← Interfaces del dominio
```

### Regla de separación de responsabilidades

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| `app/` | Solo ruteo (shells) | Lógica de negocio |
| `screens/` | UI + estado local de modales/inputs | SQL directo, cálculos complejos |
| `hooks/` | SQL queries, mutaciones, cálculos | JSX/renderizado |
| `components/` | Componentes visuales del dominio | Estado global |
| `src/components/ui/` | Componentes universales | Lógica de negocio específica |
| `src/core/` | Utilidades, clientes API, tema | Nada específico de features |
| `src/state/` | Estado global (AuthProvider) | UI |

---

## 13. 🔐 Sistema de Roles (RBAC) (Prioridad MEDIA)

### Roles disponibles
`admin`, `operador`, `chofer`, `vendedor`

### ¿Cómo funciona?
1. El `perfil.rol` del usuario se carga al hacer login
2. Los permisos por módulo se leen de la tabla `rol_permisos`
3. El hook `useAuth().canAccess('modulo')` retorna `true/false`
4. El admin siempre tiene acceso a todo
5. Los elementos de UI (tabs, drawer items) se ocultan según los permisos

```typescript
const { canAccess } = useAuth();

// Solo mostrar si tiene acceso
{canAccess('finanzas') && <FinanzasTab />}
```

---

## 14. 🆔 UUIDs (Identificadores únicos)

Todo registro en la BD usa UUID como clave primaria:
```typescript
import { v4 as uuid } from 'uuid';
// o
import 'react-native-get-random-values'; // Necesario como polyfill antes de uuid

const nuevoId = uuid(); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
```

---

## 15. 📅 Manejo de Fechas — `date-fns` (Prioridad MEDIA)

```typescript
import { format, addDays, isAfter, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

// Formatear para mostrar
format(new Date(), 'dd/MM/yyyy', { locale: es }); // '08/08/2026'

// Calcular fecha de vencimiento de crédito (30 días)
addDays(new Date(), 30);

// ¿Está vencido?
isAfter(new Date(), new Date(pedido.fecha_vencimiento_credito));

// ¿Cuántos días faltan?
differenceInDays(new Date(pedido.fecha_vencimiento_credito), new Date());
```

---

## 16. 🛢️ SQL en PowerSync (Prioridad ALTA)

Todo el acceso a datos es mediante **SQL puro** en strings. Debes conocer:

### Queries que se usan en el proyecto

```sql
-- SELECT básico con filtro
SELECT * FROM clientes WHERE estado = 'activo' ORDER BY razon_social

-- JOIN entre tablas (pedidos con cliente y detalles)
SELECT p.*, c.razon_social,
       dp.cantidad_solicitada, pp.nombre as presentacion
FROM pedidos p
JOIN clientes c ON c.id = p.id_cliente
JOIN detalles_pedido dp ON dp.id_pedido = p.id
JOIN productos_presentacion pp ON pp.id = dp.id_producto
WHERE p.estado = 'pendiente'

-- Agregaciones
SELECT SUM(peso_actual_kg) as total_kg, COUNT(*) as total_bobinas
FROM bobinas_grandes WHERE estado = 'disponible'

-- Parámetros con ?
db.execute('SELECT * FROM viajes WHERE id = ?', [viajeId])
```

### Tipos de columnas en PowerSync Schema
- `column.text` → strings, UUIDs, fechas ISO
- `column.integer` → números enteros, booleanos (0/1)
- `column.real` → números decimales (precios, pesos, tasas)

---

## 17. 🚨 Sentry — Monitoreo de Errores (Prioridad BAJA)

```typescript
import * as Sentry from '@sentry/react-native';

// Reportar excepciones
Sentry.captureException(err, {
  tags: { section: 'auth-powersync-connect' },
  extra: { userId: session.user.id }
});
```
Usado para detectar errores en producción sin que el usuario tenga que reportarlos manualmente.

---

## 18. 🗃️ PostgreSQL + Supabase (Base de datos) (Prioridad MEDIA)

Para entender el backend y configurar nuevas tablas.

### Conceptos que debes manejar

| Concepto | Descripción | Ejemplo en el proyecto |
|---|---|---|
| **UUID** | Primary key universal | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| **RLS** | Row Level Security, permisos por fila | Todas las tablas usan políticas `FOR ALL TO authenticated` |
| **Triggers** | Funciones que se ejecutan automáticamente | `handle_new_user` crea el perfil al registrarse |
| **pg_net** | Hacer HTTP requests desde Postgres | Triggers que llaman a Edge Functions para notificaciones |
| **REPLICA IDENTITY FULL** | Replicación completa de filas para PowerSync | `ALTER TABLE clientes REPLICA IDENTITY FULL` |
| **Publicación** | Qué tablas se replican | El proyecto usa `FOR ALL TABLES` (automático) |
| **JSONB** | Columnas JSON binario | Siempre usar `jsonb_build_object()` en triggers (no `json_build_object()`) |
| **Functions / Stored Procedures** | Lógica compleja en el servidor | `send_push_notification()` en `STORED_PROCEDURES.sql` |

---

## 📋 Hoja de Ruta de Aprendizaje Sugerida

### Semana 1-2: Fundamentos
- [ ] TypeScript: tipos, interfaces, generics, union types
- [ ] React: useState, useEffect, useContext, custom hooks, Provider Pattern
- [ ] Flexbox en React Native (diferencias con CSS web)

### Semana 3-4: React Native + Expo
- [ ] Componentes core de RN: View, Text, FlatList, ScrollView, Modal
- [ ] StyleSheet, Platform, SafeAreaView
- [ ] Expo Router: file-based routing, useRouter, useLocalSearchParams
- [ ] React Native Paper: componentes más usados en el proyecto

### Semana 5-6: Backend + Datos
- [ ] SQL básico e intermedio (SELECT, JOIN, WHERE, GROUP BY)
- [ ] PowerSync: AppSchema, useQuery, db.execute, el ciclo Offline-First
- [ ] Supabase Auth: session, onAuthStateChange, signIn, signOut
- [ ] RLS y su impacto en la seguridad de datos

### Semana 7-8: Features avanzadas
- [ ] Arquitectura Feature-Based: entender la estructura de carpetas
- [ ] Sistema multi-moneda: CurrencyInput, parseCurrency, formatCurrencyATM
- [ ] Generación de PDF: expo-print + expo-file-system/legacy
- [ ] Sistema RBAC: roles, canAccess, permisosCache
- [ ] Notificaciones Push: Expo Notifications + FCM V1

---

## 🔧 Archivos Clave del Proyecto

| Archivo | ¿Qué hace? |
|---|---|
| [app/_layout.tsx](file:///c:/xampp/htdocs/ERP-App/app/_layout.tsx) | Root layout + Auth Guard |
| [src/state/AuthProvider.tsx](file:///c:/xampp/htdocs/ERP-App/src/state/AuthProvider.tsx) | Estado global de sesión + PowerSync |
| [src/core/powersync/AppSchema.ts](file:///c:/xampp/htdocs/ERP-App/src/core/powersync/AppSchema.ts) | Definición de todas las tablas locales |
| [src/core/powersync/Connector.ts](file:///c:/xampp/htdocs/ERP-App/src/core/powersync/Connector.ts) | Sincronización local ↔ Supabase |
| [src/core/powersync/system.ts](file:///c:/xampp/htdocs/ERP-App/src/core/powersync/system.ts) | Instancia singleton de la BD local |
| [src/core/utils/currency.ts](file:///c:/xampp/htdocs/ERP-App/src/core/utils/currency.ts) | `parseCurrency`, `formatCurrencyATM` |
| [AGENTS.md](file:///c:/xampp/htdocs/ERP-App/AGENTS.md) | Reglas del proyecto (léelo como biblia) |
| [PROJECT_STATE.md](file:///c:/xampp/htdocs/ERP-App/PROJECT_STATE.md) | Estado actual de todos los módulos |
| [src/SCHEMA.sql](file:///c:/xampp/htdocs/ERP-App/src/SCHEMA.sql) | Estructura de la BD en Supabase |


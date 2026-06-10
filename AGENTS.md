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
* **Base de Datos / Backend:** **Supabase** *(Próximamente)*.
* **Lenguaje:** **TypeScript estricto** (sin `any`, interfaces claras y tipado fuerte).

## 3. Expo & Framework Versions
- **CRITICAL: Expo HAS CHANGED.** Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

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
* **Producción Diaria:** Registro de rebobinado por día, asignación a stock/pedidos y cálculo automático de pagos por destajo.
* **Logística de Viajes:** Registro flexible de gastos (gasolina, peajes, viáticos) durante o después del viaje.
* **Venta de Potes:** Control de stock y salidas independiente de los rollos de papel.
* **Finanzas:** Ventas a crédito a 30 días (una sola cuota), soporte para abonos, adelantos y notas de entrega.

## 7. Development Environment (Project IDX & Nix)
- System dependencies, CLIs, Node versions, and VS Code extensions must be configured in `dev.nix` (Nix packages).

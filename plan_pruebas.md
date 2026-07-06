# 🧪 Plan de Pruebas: Flujo Completo del ERP

Este documento es una guía paso a paso para probar la aplicación de principio a fin, simulando el ciclo de vida completo de tu negocio: desde que se compra el papel al molino, hasta que se le cobra al cliente.

Sigue estos pasos en este orden exacto para validar que todos los módulos se comunican correctamente.

---

## ⚙️ Fase 1: Configuración de Catálogos (Bases de datos)

Antes de operar, necesitamos entidades con las que trabajar. Ve al **Menú Lateral (Drawer)**:

1. **Crear un Tipo de Papel (NUEVO):**
   - Ve a *Inicio > Panel de Control > Materia Prima y Stock > Gestionar Tipos de Papel*.
   - Crea un nuevo tipo (ej: "Blanco 1era" o "Kraft").
2. **Crear un Proveedor:**
   - Ve a *Proveedores* > Pulsa (+) > Crea "Papelera Nacional" (o similar).
3. **Crear un Cliente:**
   - Ve a *Clientes* > Pulsa (+) > Crea "Distribuidora El Sol" con un límite de crédito generoso. AÑADE un número de teléfono válido (ej: +584121234567) para probar WhatsApp luego.
4. **Crear Catálogo de Productos:**
   - Ve a *Inicio > Panel de Control > Materia Prima y Stock > Gestionar Presentaciones*
   - **Presentación:** Registra un formato (ej: "Paquetes 1Kg"). Ingresa un `Precio (USD)` base, por ejemplo `$5.00`.
   - **Potes:** Registra un tipo de pote (ej: "Pote Estándar") con su precio de venta.

---

## 🚛 Fase 2: Abastecimiento (Comprar Materia Prima)

Necesitamos traer bobinas grandes al almacén.

1. **Crear Viaje de Compra:**
   - Ve a la pestaña **Viajes**.
   - Pulsa (+) > Selecciona **"Compra (Búsqueda)"**.
   - Selecciona el Proveedor que creaste ("Papelera Nacional").
2. **Ciclo Logístico de Compra:**
   - En la tarjeta del viaje, pulsa `Llegué al Proveedor` (Pasa a estado: *En Destino*).
   - Pulsa `Cargar Bobinas`. 
   - Añade 1 o 2 bobinas seleccionando el **Tipo de Papel** que creaste antes (Ej: Blanco 1era, 800 kg, costo 1000$). Confirma y retorna.
   - Pulsa `Llegué a Base` para finalizar el viaje.
3. **Verificación de Inventario:**
   - Ve a la pestaña **Inventario** > Tab: **Bobinas Grandes**.
   - Asegúrate de ver las bobinas que acabas de traer listas para usarse.

---

## 🛍️ Fase 3: Ventas Dinámicas (Recibir un Pedido)

Ahora que tenemos papel, probaremos la flexibilidad financiera.

1. **Crear un Pedido:**
   - Ve a la pestaña **Pedidos**.
   - Pulsa el botón flotante (+) para Nuevo Pedido.
   - Selecciona "Distribuidora El Sol" y ponle fecha de entrega.
2. **Probar Tasas de Cambio:**
   - En la sección "Tasa de Cambio", alterna entre los botones `BCV ($)`, `BCV (€)` y `Efectivo`. 
   - **NUEVO:** Observa cómo el sistema trae la tasa del euro o del dólar automáticamente. Déjalo en `BCV (€)` para la prueba.
3. **Probar Precios Flexibles:**
   - En "Añadir Productos", selecciona la presentación de "Paquetes 1Kg" que creaste en la Fase 1.
   - Observa cómo el campo de "Precio Unitario" se llena solo con `$5.00`.
   - Borra el 5 y pon un precio con descuento, por ejemplo `$4.80`, y añade 50 unidades.
4. **Guardar y Verificar:**
   - Fíjate abajo en el total. Te mostrará el total en USD ($240.00) y su equivalente en Bolívares usando la tasa del Euro que seleccionaste.
   - Guarda el pedido. Aparecerá en estado **"Pendiente"**. 

---

## 🏭 Fase 4: Producción (Rebobinado de Papel)

Es hora de convertir la bobina en rollos para surtir el pedido.

1. **Registrar Producción:**
   - En la barra inferior, o desde la pantalla principal, busca el acceso a **Producción Diaria**.
   - Pulsa (+) "Nueva Producción".
   - **Paso 1:** Selecciona la bobina que ingresaste en la Fase 2.
   - **Paso 2:** Introduce la cantidad de rollos generados.
   - **Paso 3:** Activa el switch "Vincular a Pedidos Pendientes".
   - **NUEVO:** Prueba el botón de **Auto-Asignar**, que repartirá los rollos ingresados inteligentemente.
   - **Guardar:** El sistema calculará automáticamente los kilos descontados (todo bajo una transacción segura).
2. **Verificar Merma y Agotamiento:**
   - Vuelve a **Inventario > Bobinas Grandes**.
   - La barra de la bobina debería haber bajado. 
   - Pulsa en la bobina para "Ajustar Merma/Core". Añade un kilo de prueba.
3. **Avance del Pedido:**
   - Ve a la pestaña **Pedidos**. Si completaste todos los rollos que pedía, avanza su estado de *En Producción* a **Listo**.

---

## 🚚 Fase 5: Logística (Entregar el Pedido)

El pedido está fabricado, hay que llevarlo.

1. **Crear Viaje de Entrega:**
   - Ve a **Viajes** > (+).
   - Selecciona **"Entrega (Pedidos)"**.
   - El sistema te mostrará los pedidos "Listos". Selecciona el que acabas de fabricar.
2. **Añadir un Gasto de Viaje:**
   - En la tarjeta del viaje recién creado, pulsa **"Añadir Movimiento"** u "Opciones".
   - Registra un gasto (Ej: $10 de Gasolina o Peaje).
3. **Ciclo Logístico de Entrega:**
   - Pulsa en la parada del cliente y dale **"Entregar"**.
   - Finaliza el Viaje.
   - *Verificación:* El pedido en la pestaña Pedidos ahora se fue a la vista **Cuentas x Cobrar**.

---

## 💰 Fase 6: Finanzas (Cobranza y Contabilidad)

El ciclo se cierra cuando el dinero entra.

1. **Cobrar el Pedido:**
   - Ve a **Pedidos** > **Cuentas x Cobrar**.
   - Abre el pedido entregado y pulsa **"Abonar"**.
   - Añade un pago total o parcial en Dólares o Bolívares.
   - *Verificación:* Si fue total, el pedido desaparece de esta vista (fue saldado).
2. **Notificar por WhatsApp (NUEVO):**
   - Antes de saldarlo por completo (si hiciste un pago parcial), pulsa el botón **"Cobrar" (ícono de WhatsApp)** al lado de Abonar.
   - Verifica que abra WhatsApp con el mensaje automático indicando el saldo pendiente.
3. **Dashboard Financiero:**
   - Ve a **Inicio (Dashboard)**.
   - Deberías ver:
     - El ingreso (abono) reflejado en verde.
     - El gasto del viaje reflejado en rojo.
     - Tus métricas generales actualizadas.
4. **Verificar Estado de Red Global (NUEVO):**
   - En cualquier pantalla, ubica el **Ícono de Nube** en la esquina superior derecha.
   - Toca el ícono y verifica que el *Estado de Red* te indique "Conectado" y muestre la hora de tu "Última Sincronización".

> [!TIP]
> Si logras hacer este recorrido completo y los números cuadran (los kilos se descuentan, el pedido cambia de estado, y la plata entra), **¡El ERP está matemáticamente blindado!**

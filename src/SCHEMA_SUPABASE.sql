-- Esquema convertido para Supabase (PostgreSQL)
-- Usa UUIDs para claves primarias en vez de INT para soportar inserciones offline-first de PowerSync.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tablas de catálogo/maestras
CREATE TABLE public.clientes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  razon_social text NOT NULL,
  telefono text,
  limite_credito numeric(10,2) DEFAULT 0.00,
  saldo_a_favor_usd numeric(10,2) NOT NULL DEFAULT 0.00,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE public.inventario_potes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  capacidad text NOT NULL,
  stock_unidades int NOT NULL DEFAULT 0,
  precio_compra_usd numeric(10,2) NOT NULL DEFAULT 0.00,
  precio_venta_usd numeric(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE public.productos_presentacion (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text,
  peso_nominal_g int,
  peso_real_g int,
  rollos_por_paquete int,
  stock_unidades_sueltas int,
  precio_USD numeric(10,2) NOT NULL DEFAULT 0.00,
  tiempo_x_paquete_min real
);

CREATE TABLE public.viajes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_viaje text NOT NULL,
  fecha_viaje_inicio timestamp with time zone NOT NULL,
  fecha_viaje_llegada_destino timestamp with time zone NOT NULL,
  fecha_viaje_retorno timestamp with time zone NOT NULL,
  fecha_viaje_llegada_base timestamp with time zone NOT NULL,
  estado text NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso','en_destino','retornando','completado'))
);

CREATE TABLE public.pedidos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_cliente uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_entrega_estimada timestamp with time zone NOT NULL,
  fecha_entrega timestamp with time zone,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_produccion','listo','entregado','cancelado')),
  estado_pago text NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente','pagado')),
  fecha_vencimiento_credito date,
  monto_total numeric(10,2) NOT NULL DEFAULT 0.00,
  tasa_cambio_creacion numeric(10,4)
);

CREATE TABLE public.abonos_pagos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_pedido uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  monto numeric(10,2) NOT NULL,
  monto_equivalente_usd numeric(10,2) NOT NULL DEFAULT 0.00,
  moneda text NOT NULL DEFAULT 'VES' CHECK (moneda IN ('VES','USD')),
  tasa_cambio numeric(10,4) NOT NULL DEFAULT 1.0000,
  fecha_pago timestamp with time zone DEFAULT now(),
  tipo_pago text NOT NULL CHECK (tipo_pago IN ('adelanto','abono'))
);

CREATE TABLE public.bobinas_grandes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_viaje_compra uuid NOT NULL REFERENCES public.viajes(id),
  peso_inicial_kg real NOT NULL,
  tipo_papel text NOT NULL DEFAULT 'A' CHECK (tipo_papel IN ('A','B')),
  peso_actual_kg real,
  peso_muerto_kg real,
  merma_core_kg real,
  costo_bobina numeric(10,2) NOT NULL DEFAULT 0.00,
  fecha_llegada timestamp with time zone,
  fecha_uso timestamp with time zone,
  fecha_gasto timestamp with time zone,
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','en_uso','agotada'))
);

CREATE TABLE public.produccion_diaria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_producto uuid NOT NULL REFERENCES public.productos_presentacion(id),
  id_pedido_destino uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  fecha date NOT NULL,
  cantidad_rollos_total int NOT NULL
);

CREATE TABLE public.consumo_bobinas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_produccion uuid NOT NULL REFERENCES public.produccion_diaria(id) ON DELETE CASCADE,
  id_bobina uuid NOT NULL REFERENCES public.bobinas_grandes(id),
  kg_consumidos numeric(10,2) NOT NULL
);

CREATE TABLE public.detalles_pedido (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_pedido uuid NOT NULL REFERENCES public.pedidos(id),
  id_producto uuid REFERENCES public.productos_presentacion(id),
  id_pote uuid REFERENCES public.inventario_potes(id),
  cantidad_solicitada int NOT NULL,
  cantidad_producida int,
  precio_unitario numeric(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE public.entregas_viaje (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_viaje uuid NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
  id_pedido uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  nota_entrega_numero text NOT NULL
);

CREATE TABLE public.movimientos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  descripcion text NOT NULL,
  monto numeric(10,2) NOT NULL,
  moneda text NOT NULL DEFAULT 'VES' CHECK (moneda IN ('VES','USD')),
  tasa_cambio numeric(10,4) NOT NULL DEFAULT 1.0000,
  categoria text NOT NULL CHECK (categoria IN ('gasolina','peaje','viaticos','mantenimiento','operativos','otros','nomina')),
  fecha timestamp with time zone DEFAULT now(),
  id_viaje uuid REFERENCES public.viajes(id) ON DELETE SET NULL,
  tipo text CHECK (tipo IN ('ingreso','egreso'))
);

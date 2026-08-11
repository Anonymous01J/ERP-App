-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  razon_social text NOT NULL,
  telefono text,
  limite_credito numeric DEFAULT 0.00,
  saldo_a_favor_usd numeric NOT NULL DEFAULT 0.00,
  estado text NOT NULL DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  cedula text,
  rif text,
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventario_potes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  capacidad text NOT NULL,
  stock_unidades integer NOT NULL DEFAULT 0,
  precio_compra_usd numeric NOT NULL DEFAULT 0.00,
  precio_venta_usd numeric NOT NULL DEFAULT 0.00,
  estado text NOT NULL DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  CONSTRAINT inventario_potes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.productos_presentacion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text,
  peso_nominal_g integer,
  peso_real_g integer,
  rollos_por_paquete integer,
  stock_unidades_sueltas integer,
  precio_USD numeric NOT NULL DEFAULT 0.00,
  tiempo_x_paquete_min real,
  estado text NOT NULL DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  CONSTRAINT productos_presentacion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.viajes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_viaje text NOT NULL,
  fecha_viaje_inicio timestamp with time zone NOT NULL,
  fecha_viaje_llegada_destino timestamp with time zone,
  fecha_viaje_retorno timestamp with time zone,
  fecha_viaje_llegada_base timestamp with time zone,
  estado text NOT NULL DEFAULT 'en_progreso'::text CHECK (estado = ANY (ARRAY['en_progreso'::text, 'en_destino'::text, 'retornando'::text, 'completado'::text])),
  notas text,
  id_proveedor uuid,
  CONSTRAINT viajes_pkey PRIMARY KEY (id),
  CONSTRAINT viajes_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id)
);
CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_entrega_estimada timestamp with time zone NOT NULL,
  fecha_entrega timestamp with time zone,
  estado text NOT NULL DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'en_produccion'::text, 'listo'::text, 'entregado'::text, 'cancelado'::text])),
  estado_pago text NOT NULL DEFAULT 'pendiente'::text CHECK (estado_pago = ANY (ARRAY['pendiente'::text, 'pagado'::text])),
  fecha_vencimiento_credito date,
  monto_total numeric NOT NULL DEFAULT 0.00,
  tasa_cambio_creacion numeric,
  nota_entrega_numero integer,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id)
);
CREATE TABLE public.abonos_pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_pedido uuid NOT NULL,
  monto numeric NOT NULL,
  monto_equivalente_usd numeric NOT NULL DEFAULT 0.00,
  moneda text NOT NULL DEFAULT 'VES'::text CHECK (moneda = ANY (ARRAY['VES'::text, 'USD'::text])),
  tasa_cambio numeric NOT NULL DEFAULT 1.0000,
  fecha_pago timestamp with time zone DEFAULT now(),
  tipo_pago text NOT NULL CHECK (tipo_pago = ANY (ARRAY['adelanto'::text, 'abono'::text])),
  CONSTRAINT abonos_pagos_pkey PRIMARY KEY (id),
  CONSTRAINT abonos_pagos_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id)
);
CREATE TABLE public.bobinas_grandes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_viaje_compra uuid NOT NULL,
  peso_inicial_kg real NOT NULL,
  peso_actual_kg real,
  peso_muerto_kg real,
  merma_core_kg real,
  costo_bobina numeric NOT NULL DEFAULT 0.00,
  fecha_llegada timestamp with time zone,
  fecha_uso timestamp with time zone,
  fecha_gasto timestamp with time zone,
  estado text NOT NULL DEFAULT 'disponible'::text CHECK (estado = ANY (ARRAY['disponible'::text, 'en_uso'::text, 'agotada'::text])),
  id_tipo_papel uuid NOT NULL,
  CONSTRAINT bobinas_grandes_pkey PRIMARY KEY (id),
  CONSTRAINT bobinas_grandes_id_viaje_compra_fkey FOREIGN KEY (id_viaje_compra) REFERENCES public.viajes(id),
  CONSTRAINT bobinas_grandes_id_tipo_papel_fkey FOREIGN KEY (id_tipo_papel) REFERENCES public.tipos_papel(id)
);
CREATE TABLE public.produccion_diaria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_producto uuid NOT NULL,
  id_pedido_destino uuid,
  fecha date NOT NULL,
  cantidad_rollos_total integer NOT NULL,
  CONSTRAINT produccion_diaria_pkey PRIMARY KEY (id),
  CONSTRAINT produccion_diaria_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos_presentacion(id),
  CONSTRAINT produccion_diaria_id_pedido_destino_fkey FOREIGN KEY (id_pedido_destino) REFERENCES public.pedidos(id)
);
CREATE TABLE public.consumo_bobinas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_produccion uuid NOT NULL,
  id_bobina uuid NOT NULL,
  kg_consumidos numeric NOT NULL,
  CONSTRAINT consumo_bobinas_pkey PRIMARY KEY (id),
  CONSTRAINT consumo_bobinas_id_produccion_fkey FOREIGN KEY (id_produccion) REFERENCES public.produccion_diaria(id),
  CONSTRAINT consumo_bobinas_id_bobina_fkey FOREIGN KEY (id_bobina) REFERENCES public.bobinas_grandes(id)
);
CREATE TABLE public.detalles_pedido (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_pedido uuid NOT NULL,
  id_producto uuid,
  id_pote uuid,
  cantidad_solicitada integer NOT NULL,
  cantidad_producida integer,
  precio_unitario numeric NOT NULL DEFAULT 0.00,
  id_tipo_papel uuid,
  CONSTRAINT detalles_pedido_pkey PRIMARY KEY (id),
  CONSTRAINT detalles_pedido_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id),
  CONSTRAINT detalles_pedido_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos_presentacion(id),
  CONSTRAINT detalles_pedido_id_pote_fkey FOREIGN KEY (id_pote) REFERENCES public.inventario_potes(id),
  CONSTRAINT detalles_pedido_id_tipo_papel_fkey FOREIGN KEY (id_tipo_papel) REFERENCES public.tipos_papel(id)
);
CREATE TABLE public.entregas_viaje (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_viaje uuid NOT NULL,
  id_pedido uuid NOT NULL,
  nota_entrega_numero text,
  hora_llegada timestamp with time zone,
  estado text NOT NULL DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'entregado'::text])),
  orden integer NOT NULL DEFAULT 1,
  CONSTRAINT entregas_viaje_pkey PRIMARY KEY (id),
  CONSTRAINT entregas_viaje_id_viaje_fkey FOREIGN KEY (id_viaje) REFERENCES public.viajes(id),
  CONSTRAINT entregas_viaje_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id)
);
CREATE TABLE public.movimientos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  descripcion text,
  monto numeric NOT NULL,
  moneda text NOT NULL DEFAULT 'VES'::text CHECK (moneda = ANY (ARRAY['VES'::text, 'USD'::text])),
  tasa_cambio numeric NOT NULL DEFAULT 1.0000,
  categoria text NOT NULL CHECK (categoria = ANY (ARRAY['gasolina'::text, 'peaje'::text, 'viaticos'::text, 'mantenimiento'::text, 'operativos'::text, 'otros'::text, 'nomina'::text])),
  fecha timestamp with time zone DEFAULT now(),
  id_viaje uuid,
  tipo text CHECK (tipo = ANY (ARRAY['ingreso'::text, 'egreso'::text])),
  CONSTRAINT movimientos_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_id_viaje_fkey FOREIGN KEY (id_viaje) REFERENCES public.viajes(id)
);
CREATE TABLE public.proveedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre_empresa text NOT NULL,
  telefono text,
  direccion text,
  notas text,
  estado text NOT NULL DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  cedula text,
  rif text,
  encargado text,
  CONSTRAINT proveedores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_papel (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  estado text NOT NULL DEFAULT 'activo'::text,
  CONSTRAINT tipos_papel_pkey PRIMARY KEY (id)
);
CREATE TABLE public.perfiles (
  id uuid NOT NULL,
  nombre text NOT NULL DEFAULT ''::text,
  rol text NOT NULL DEFAULT 'operador'::text CHECK (rol = ANY (ARRAY['admin'::text, 'operador'::text, 'chofer'::text, 'vendedor'::text])),
  activo boolean NOT NULL DEFAULT false,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.rol_permisos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rol text NOT NULL CHECK (rol = ANY (ARRAY['admin'::text, 'operador'::text, 'chofer'::text, 'vendedor'::text])),
  modulo text NOT NULL,
  habilitado boolean NOT NULL DEFAULT false,
  CONSTRAINT rol_permisos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.configuracion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE,
  valor text NOT NULL,
  CONSTRAINT configuracion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notificaciones_historial (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  cuerpo text NOT NULL,
  data jsonb,
  leido boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notificaciones_historial_pkey PRIMARY KEY (id),
  CONSTRAINT notificaciones_historial_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
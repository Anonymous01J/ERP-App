-- Migración Fase 1: Generalización de Potes a Productos de Reventa y Viajes Multiproveedor

-- 1. Renombrar la tabla de potes a productos_reventa
ALTER TABLE public.inventario_potes RENAME TO productos_reventa;

-- 2. Renombrar la columna 'capacidad' por 'nombre_producto'
ALTER TABLE public.productos_reventa RENAME COLUMN capacidad TO nombre_producto;

-- 3. Agregar el campo descripción que faltaba
ALTER TABLE public.productos_reventa ADD COLUMN descripcion text;

-- 4. Actualizar la FK en detalles_pedido
ALTER TABLE public.detalles_pedido RENAME COLUMN id_pote TO id_producto_reventa;

-- 5. Renombrar la restricción FK para mantener consistencia
ALTER TABLE public.detalles_pedido 
  RENAME CONSTRAINT detalles_pedido_id_pote_fkey TO detalles_pedido_id_producto_reventa_fkey;

-- 6. Habilitar Replicación para PowerSync
ALTER TABLE public.productos_reventa REPLICA IDENTITY FULL;

----------------------------------------------------------------------

-- 7. Crear la nueva tabla de paradas de compra (compras_viaje)
CREATE TABLE public.compras_viaje (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_viaje uuid NOT NULL,
  id_proveedor uuid NOT NULL,
  hora_llegada timestamp with time zone,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado = ANY (ARRAY['pendiente','en_carga','completado'])),
  orden integer NOT NULL DEFAULT 1,
  notas text,
  CONSTRAINT compras_viaje_pkey PRIMARY KEY (id),
  CONSTRAINT compras_viaje_id_viaje_fkey FOREIGN KEY (id_viaje) REFERENCES public.viajes(id),
  CONSTRAINT compras_viaje_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id)
);

-- 8. Permisos de Seguridad (RLS)
ALTER TABLE public.compras_viaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_viaje REPLICA IDENTITY FULL;
CREATE POLICY "allow_all_authenticated" ON public.compras_viaje
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Otorgar permisos al rol de powersync para poder replicar esta tabla
GRANT SELECT ON TABLE public.compras_viaje TO powersync_role;

----------------------------------------------------------------------

-- 10. Agregar id_proveedor a bobinas_grandes
ALTER TABLE public.bobinas_grandes ADD COLUMN id_proveedor uuid;
ALTER TABLE public.bobinas_grandes 
  ADD CONSTRAINT bobinas_grandes_id_proveedor_fkey 
  FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id);

----------------------------------------------------------------------

-- 11. Eliminar id_proveedor de viajes (⚠️ VERIFICAR PRIMERO SI HAY DATOS)
ALTER TABLE public.viajes DROP COLUMN id_proveedor;

-- MIGRATION: Ejecutar este script en el SQL Editor de Supabase
-- Añade la tabla de configuración global y la columna a pedidos

CREATE TABLE IF NOT EXISTS public.configuracion (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clave text UNIQUE NOT NULL,
  valor text NOT NULL
);

ALTER TABLE public.configuracion REPLICA IDENTITY FULL;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_all" ON public.configuracion FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT ON public.configuracion TO powersync_role;

-- Insertar el número de nota inicial basado en la foto (166)
INSERT INTO public.configuracion (clave, valor) VALUES ('secuencia_nota_entrega', '166')
ON CONFLICT (clave) DO NOTHING;

-- La publicación 'powersync' está definida como FOR ALL TABLES, por lo que no es necesario agregar la tabla manualmente.

-- Añadir columna a pedidos para almacenar el número generado
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nota_entrega_numero integer;

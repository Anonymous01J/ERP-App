CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens" 
ON public.push_tokens 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Opcional: Tabla de historial de notificaciones enviadas
CREATE TABLE IF NOT EXISTS public.notificaciones_historial (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    cuerpo TEXT NOT NULL,
    data JSONB,
    leido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notificaciones_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON public.notificaciones_historial 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Replicación en PowerSync (solo necesario si queremos historial offline)
GRANT SELECT ON public.notificaciones_historial TO powersync_role;
ALTER TABLE public.notificaciones_historial REPLICA IDENTITY FULL;

-- ==========================================
-- Triggers para Notificaciones Push usando pg_net
-- ==========================================

-- Asegurarse de que la extensión pg_net esté habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función genérica para enviar notificaciones desde triggers
CREATE OR REPLACE FUNCTION public.trigger_send_push()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_body JSONB;
  project_url TEXT := current_setting('custom.project_url', true);
  anon_key TEXT := current_setting('custom.anon_key', true);
BEGIN
  -- Definir qué enviar según la tabla
  
  IF TG_TABLE_NAME = 'bobinas_grandes' AND TG_OP = 'INSERT' THEN
    request_body := json_build_object(
      'title', '🚚 ¡Nuevas Bobinas Llegaron!',
      'body', 'Se han registrado nuevas bobinas en el inventario (' || NEW.tipo_papel || ').',
      'target_roles', '["operador"]'::jsonb
    );
    
  ELSIF TG_TABLE_NAME = 'pedidos' AND TG_OP = 'INSERT' THEN
    request_body := json_build_object(
      'title', '📝 Nuevo Pedido Registrado',
      'body', 'Se ha creado un nuevo pedido. Revisa los detalles.',
      'target_roles', '["operador"]'::jsonb
    );
    
  ELSIF TG_TABLE_NAME = 'viajes' AND TG_OP = 'UPDATE' AND NEW.estado != OLD.estado THEN
    request_body := json_build_object(
      'title', '📍 Actualización de Viaje',
      'body', 'El viaje ha cambiado su estado a: ' || NEW.estado,
      'target_roles', '["admin"]'::jsonb
    );
    
  ELSIF TG_TABLE_NAME = 'movimientos' AND TG_OP = 'INSERT' AND NEW.viaje_id IS NOT NULL THEN
    request_body := json_build_object(
      'title', '💸 Nuevo Gasto en Ruta',
      'body', 'Se ha registrado un gasto en el viaje por: ' || NEW.monto_usd || ' USD.',
      'target_roles', '["admin"]'::jsonb
    );
    
  ELSIF TG_TABLE_NAME = 'produccion_diaria' AND TG_OP = 'INSERT' THEN
    request_body := json_build_object(
      'title', '⚙️ Nueva Producción',
      'body', 'Un operador ha finalizado un lote de producción.',
      'target_roles', '["admin"]'::jsonb
    );
  END IF;

  -- Si hay algo que enviar y las variables de entorno están configuradas (en Supabase env)
  IF request_body IS NOT NULL AND project_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := project_url || '/functions/v1/notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := request_body
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Adjuntar los Triggers a las tablas
-- ==========================================

DROP TRIGGER IF EXISTS on_bobinas_insert ON public.bobinas_grandes;
CREATE TRIGGER on_bobinas_insert
  AFTER INSERT ON public.bobinas_grandes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

DROP TRIGGER IF EXISTS on_pedidos_insert ON public.pedidos;
CREATE TRIGGER on_pedidos_insert
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

DROP TRIGGER IF EXISTS on_viajes_update ON public.viajes;
CREATE TRIGGER on_viajes_update
  AFTER UPDATE OF estado ON public.viajes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

DROP TRIGGER IF EXISTS on_movimientos_insert ON public.movimientos;
CREATE TRIGGER on_movimientos_insert
  AFTER INSERT ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

DROP TRIGGER IF EXISTS on_produccion_insert ON public.produccion_diaria;
CREATE TRIGGER on_produccion_insert
  AFTER INSERT ON public.produccion_diaria
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

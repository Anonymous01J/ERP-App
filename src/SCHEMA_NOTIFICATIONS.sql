CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.push_tokens;
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

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificaciones_historial;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notificaciones_historial;
CREATE POLICY "Users can manage their own notifications" 
ON public.notificaciones_historial 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Replicación en PowerSync (solo necesario si queremos historial offline)
GRANT SELECT ON public.notificaciones_historial TO powersync_role;
ALTER TABLE public.notificaciones_historial REPLICA IDENTITY FULL;

-- ==========================================
-- Triggers para Notificaciones Push usando pg_net
-- ==========================================

-- Asegurarse de que la extensión pg_net esté habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función de utilidad para enviar la petición HTTP
CREATE OR REPLACE FUNCTION public.send_push_notification(request_body JSONB)
RETURNS VOID AS $$
DECLARE
  project_url TEXT;
  anon_key TEXT;
BEGIN
  SELECT valor INTO project_url FROM public.configuracion WHERE clave = 'project_url';
  SELECT valor INTO anon_key FROM public.configuracion WHERE clave = 'anon_key';

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Trigger para Bobinas
CREATE OR REPLACE FUNCTION public.trigger_push_bobinas()
RETURNS TRIGGER AS $$
DECLARE
  v_tipo_papel TEXT;
BEGIN
  SELECT nombre INTO v_tipo_papel FROM public.tipos_papel WHERE id = NEW.id_tipo_papel;
  PERFORM public.send_push_notification(
    jsonb_build_object(
      'title', '🚚 ¡Nuevas Bobinas Llegaron!',
      'body', 'Se han registrado nuevas bobinas en el inventario (' || COALESCE(v_tipo_papel, 'Desconocido') || ').',
      'target_roles', '["operador"]'::jsonb,
      'data', jsonb_build_object('ruta', '/(drawer)/(tabs)/inventario')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger para Pedidos
CREATE OR REPLACE FUNCTION public.trigger_push_pedidos()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.send_push_notification(
    jsonb_build_object(
      'title', '📝 Nuevo Pedido Registrado',
      'body', 'Se ha creado un nuevo pedido. Revisa los detalles.',
      'target_roles', '["operador"]'::jsonb,
      'data', jsonb_build_object('ruta', '/(drawer)/(tabs)/pedidos')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para Viajes
CREATE OR REPLACE FUNCTION public.trigger_push_viajes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado != OLD.estado THEN
    PERFORM public.send_push_notification(
      jsonb_build_object(
        'title', '📍 Actualización de Viaje',
        'body', 'El viaje ha cambiado su estado a: ' || NEW.estado,
        'target_roles', '["admin"]'::jsonb,
        'data', jsonb_build_object('ruta', '/(drawer)/(tabs)/viajes')
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para Movimientos
CREATE OR REPLACE FUNCTION public.trigger_push_movimientos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id_viaje IS NOT NULL THEN
    PERFORM public.send_push_notification(
      jsonb_build_object(
        'title', '💸 Nuevo Gasto en Ruta',
        'body', 'Se ha registrado un gasto en el viaje por: ' || NEW.monto || ' ' || NEW.moneda || '.',
        'target_roles', '["admin"]'::jsonb,
        'data', jsonb_build_object('ruta', '/(drawer)/(tabs)/viajes?viajeId=' || NEW.id_viaje::text)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para Produccion Diaria
CREATE OR REPLACE FUNCTION public.trigger_push_produccion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.send_push_notification(
    jsonb_build_object(
      'title', '⚙️ Nueva Producción',
      'body', 'Un operador ha finalizado un lote de producción.',
      'target_roles', '["admin"]'::jsonb,
      'data', jsonb_build_object('ruta', '/(screens)/historial-produccion')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para Perfiles (Nuevos Usuarios)
CREATE OR REPLACE FUNCTION public.trigger_push_perfiles()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM public.send_push_notification(
      jsonb_build_object(
        'title', '👤 Nuevo Usuario Registrado',
        'body', 'El usuario ' || COALESCE(NEW.nombre::text, 'Sin nombre') || ' se ha registrado en el sistema y requiere asignación de rol.',
        'target_roles', '["admin"]'::jsonb,
        'data', jsonb_build_object('ruta', '/(drawer)/usuarios')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silenciar silenciosamente el error para no abortar el registro del usuario
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Adjuntar los Triggers a las tablas
-- ==========================================

DROP TRIGGER IF EXISTS on_bobinas_insert ON public.bobinas_grandes;
CREATE TRIGGER on_bobinas_insert
  AFTER INSERT ON public.bobinas_grandes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_push_bobinas();

DROP TRIGGER IF EXISTS on_pedidos_insert ON public.pedidos;
CREATE TRIGGER on_pedidos_insert
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_push_pedidos();

DROP TRIGGER IF EXISTS on_viajes_update ON public.viajes;
CREATE TRIGGER on_viajes_update
  AFTER UPDATE OF estado ON public.viajes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_push_viajes();

DROP TRIGGER IF EXISTS on_movimientos_insert ON public.movimientos;
CREATE TRIGGER on_movimientos_insert
  AFTER INSERT ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_push_movimientos();

DROP TRIGGER IF EXISTS on_produccion_insert ON public.produccion_diaria;
CREATE TRIGGER on_produccion_insert
  AFTER INSERT ON public.produccion_diaria
  FOR EACH ROW EXECUTE FUNCTION public.trigger_push_produccion();

DROP TRIGGER IF EXISTS on_perfiles_insert ON public.perfiles;
CREATE TRIGGER on_perfiles_insert
  AFTER INSERT ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_push_perfiles();

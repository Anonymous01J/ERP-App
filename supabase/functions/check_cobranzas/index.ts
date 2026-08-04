import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as Sentry from "npm:@sentry/deno";

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN') || Deno.env.get('EXPO_PUBLIC_SENTRY_DSN') || '',
  tracesSampleRate: 1.0,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usar service role
    );

    // Endpoint pensado para ser ejecutado diariamente por un cron externo
    // Buscar pedidos entregados que no estén pagados
    const { data: deudas, error } = await supabaseClient
      .from('pedidos')
      .select('id, id_cliente, clientes(razon_social), fecha_entrega, monto_total')
      .eq('estado', 'entregado')
      .neq('estado_pago', 'pagado');

    if (error) throw error;

    let vencidos = 0;
    let porVencer = 0;

    const hoy = new Date();

    deudas?.forEach(pedido => {
      const fechaEntrega = new Date(pedido.fecha_entrega);
      const fechaVencimiento = new Date(fechaEntrega);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      const diffTime = fechaVencimiento.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        vencidos++;
      } else if (diffDays <= 5) {
        porVencer++;
      }
    });

    // Si hay algo que reportar, enviar la notificación al admin
    if (vencidos > 0 || porVencer > 0) {
      // Llamar a nuestra propia función notify
      // O hacer la petición a la API de notify localmente
      const notifyPayload = {
        title: "Reporte de Cobranzas 💰",
        body: `Tienes ${vencidos} deudas vencidas y ${porVencer} por vencer en los próximos 5 días.`,
        target_roles: ['admin'],
        data: { ruta: '/(drawer)/(tabs)/pedidos?vista=finanzas' }
      };

      // Como estamos dentro del entorno de Supabase, podemos llamar a la otra edge function
      // Pero para mayor seguridad y evitar problemas de red interna, enviamos directamente a Expo
      // O reutilizamos la lógica. Para no duplicar, hagamos un HTTP POST a nuestra propia función.
      const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify`;
      
      await fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify(notifyPayload)
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      resumen: { vencidos, porVencer } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error checking cobranzas:', error);
    Sentry.captureException(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

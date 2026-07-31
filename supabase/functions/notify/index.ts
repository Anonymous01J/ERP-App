import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interfaz para la solicitud que recibiremos
interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  target_roles?: string[]; // ej. ['admin', 'operador']
  target_user_ids?: string[]; // Si queremos notificar a usuarios específicos
}

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usar service role para saltar RLS
    );

    const payload: NotificationPayload = await req.json();
    const { title, body, data, target_roles, target_user_ids } = payload;

    if (!title || !body) {
      throw new Error('Title and body are required');
    }

    let userIdsToNotify: string[] = [];

    // 1. Obtener usuarios por roles (si aplica)
    if (target_roles && target_roles.length > 0) {
      const { data: usersByRole, error: roleError } = await supabaseClient
        .from('perfiles')
        .select('id')
        .in('rol', target_roles);

      if (roleError) throw roleError;
      
      if (usersByRole) {
        userIdsToNotify.push(...usersByRole.map((u: any) => u.id));
      }
    }

    // 2. Añadir usuarios específicos (si aplica)
    if (target_user_ids && target_user_ids.length > 0) {
      userIdsToNotify.push(...target_user_ids);
    }

    // Eliminar duplicados
    userIdsToNotify = [...new Set(userIdsToNotify)];

    if (userIdsToNotify.length === 0) {
      return new Response(JSON.stringify({ message: 'No users found to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Obtener tokens de push para esos usuarios
    const { data: tokensData, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', userIdsToNotify);

    if (tokensError) throw tokensError;

    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens found for target users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const expoPushTokens = tokensData.map(t => t.token);

    // 4. Enviar a Expo Push API
    const messages = expoPushTokens.map(pushToken => ({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoData = await expoRes.json();

    // 5. Guardar en historial (opcional, pero útil)
    // Para simplificar, guardamos un registro por cada usuario notificado
    const historyInserts = tokensData.map(t => ({
      user_id: t.user_id,
      titulo: title,
      cuerpo: body,
      data: data || {}
    }));

    await supabaseClient.from('notificaciones_historial').insert(historyInserts);

    return new Response(JSON.stringify({ success: true, expoResponse: expoData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

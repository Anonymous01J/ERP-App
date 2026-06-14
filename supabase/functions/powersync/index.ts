import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Las variables de entorno son inyectadas automáticamente por Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  const errorMessage = 'Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

/**
 * Maneja las solicitudes entrantes desde el conector de PowerSync.
 */
serve(async (req) => {
  try {
    // 1. Crear un cliente de Supabase con permisos de administrador.
    // Este cliente puede saltarse las políticas de RLS.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 2. Obtener las operaciones del cuerpo de la solicitud
    const { operations } = await req.json();
    if (!operations) {
      throw new Error("No se encontraron operaciones en el cuerpo de la solicitud.");
    }

    // 3. Procesar cada operación del lote de PowerSync
    for (const op of operations) {
      const { op: opType, table, id, opData } = op;

      let query;
      switch (opType) {
        case 'PUT':
          // Usar `upsert` para insertar o actualizar. Es la operación ideal para PUT.
          query = supabaseAdmin.from(table).upsert({ id, ...opData });
          break;
        case 'PATCH':
          // Usar `update` para actualizaciones parciales.
          query = supabaseAdmin.from(table).update(opData).eq('id', id);
          break;
        case 'DELETE':
          // Usar `delete` para eliminaciones.
          query = supabaseAdmin.from(table).delete().eq('id', id);
          break;
        default:
          console.warn(`Tipo de operación desconocido: ${opType}`);
          continue; // Saltar operaciones desconocidas
      }

      // Ejecutar la consulta y comprobar si hay errores
      const { error } = await query;
      if (error) {
        console.error(`Error procesando: ${opType} en la tabla ${table} para el id ${id}`, error);
        // Lanzar el error para abortar el proceso y devolver un error 500.
        throw error;
      }
    }

    // 4. Si todas las operaciones fueron exitosas, devolver una respuesta de éxito.
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error('El manejador principal de errores capturó una excepción:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as Sentry from "npm:@sentry/deno";

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN') || Deno.env.get('EXPO_PUBLIC_SENTRY_DSN') || '',
  tracesSampleRate: 1.0,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Supabase URL from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is not set.');
}

/**
 * Creates a Supabase client for a given user request.
 * 
 * If the request is authenticated, it returns a client that acts on behalf of the user.
 * If not, it returns a client using the anonymous key.
 * 
 * @param {Request} req - The incoming HTTP request.
 * @returns {SupabaseClient} A Supabase client instance.
 */
const createSupabaseClientForUser = (req: Request): SupabaseClient => {
  // Extract the Authorization header
  const authHeader = req.headers.get('Authorization')!;

  // Get the anon key from environment variables
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is not set.');
  }

  // Create a client with the user's token or the anon key
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * Main request handler for PowerSync data upload.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create a Supabase client that will act on behalf of the user
    const supabase = createSupabaseClientForUser(req);

    // 2. Get operations from the request body
    const { operations } = await req.json();
    if (!operations) {
      throw new Error("No operations found in the request body.");
    }

    // 3. Process each operation in the batch
    for (const op of operations) {
      const opType = op.op;
      const table = op.table || op.type; // PowerSync envía 'type' como nombre de tabla
      const id = op.id;
      const opData = op.opData || op.data; // PowerSync envía 'data' como el payload

      // PowerSync manda booleanos de SQLite como 1 o 0
      if (opData && typeof opData.leido !== 'undefined') {
        opData.leido = opData.leido === 1 || opData.leido === true;
      }

      let query;
      switch (opType) {
        case 'PUT':
          // Use `upsert` for inserts or updates. It's ideal for PUT.
          query = supabase.from(table).upsert({ id, ...opData }).select();
          break;
        case 'PATCH':
          // Use `update` for partial updates.
          query = supabase.from(table).update(opData).eq('id', id).select();
          break;
        case 'DELETE':
          // Use `delete` for removals.
          query = supabase.from(table).delete().eq('id', id).select();
          break;
        default:
          console.warn(`Unknown operation type: ${opType}`);
          continue; // Skip unknown operations
      }

      // Execute the query and check for errors
      const { data: resData, error } = await query;
      if (error) {
        console.error(`Error processing: ${opType} on table ${table} for id ${id}`, error);
        // Throw the error to abort and return a 500 status.
        throw error;
      }
      if (!resData || resData.length === 0) {
        console.warn(`WARNING: Operation ${opType} on table ${table} for id ${id} affected 0 rows. This might be due to RLS policies or row not existing.`);
      }
    }

    // 4. If all operations succeeded, return a success response.
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    // Catch any exceptions and return a generic 500 error
    console.error('Main error handler caught an exception:', e);
    Sentry.captureException(e);
    return new Response(JSON.stringify({ error: e.message || e }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

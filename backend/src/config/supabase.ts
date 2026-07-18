import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Supabase client factory.
 *
 * Why: The backend needs two client contexts:
 *  - `anon`  : respects Row Level Security using the public anon key (safe for
 *              request-scoped work where the user's JWT is forwarded).
 *  - `admin` : uses the service-role key to bypass RLS for trusted server-side
 *              operations (migrations, admin tasks, webhooks).
 *
 * We export singletons to avoid re-creating clients on every request.
 */
export const supabaseAnon: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey,
);

export const supabaseAdmin: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

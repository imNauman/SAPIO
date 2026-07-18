import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase client for the mobile app.
 *
 * Why: The mobile client uses the public anon key. Row Level Security (RLS) in
 * Supabase enforces per-user data access once the user is authenticated. This
 * singleton is shared across the app (auth, storage, realtime).
 */
export const supabase: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

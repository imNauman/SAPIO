/**
 * Mobile environment configuration.
 *
 * Why: Expo only exposes variables prefixed with `EXPO_PUBLIC_` to client code.
 * We centralize them here and fail fast if a required value is missing, so the
 * app surfaces misconfiguration immediately instead of crashing deep in a flow.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    'EXPO_PUBLIC_SUPABASE_URL',
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  apiBaseUrl: required(
    'EXPO_PUBLIC_API_BASE_URL',
    process.env.EXPO_PUBLIC_API_BASE_URL,
  ),
} as const;

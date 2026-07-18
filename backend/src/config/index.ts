import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized, validated application configuration.
 *
 * Why: Reading process.env directly across the codebase scatters configuration
 * and makes it hard to validate. This module loads env once and exposes a typed
 * `config` object. Values are validated at boot so misconfiguration fails fast.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(raw: string | undefined, fallback: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(
      `Invalid PORT "${raw}". Must be an integer between 1 and 65535.`,
    );
  }
  return n;
}

const env = process.env.NODE_ENV ?? 'development';

export const config = {
  env,
  port: parsePort(process.env.PORT, 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:19006')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  supabase: {
    url: required('SUPABASE_URL', process.env.SUPABASE_URL),
    anonKey: required('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY),
    serviceRoleKey: required(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  },
  // Firebase Cloud Messaging (push). All three are optional — if any is missing,
  // push delivery is disabled and the app runs normally (see firebase.service).
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ?? '',
  },
} as const;

export type AppConfig = typeof config;

/**
 * Validate the full configuration at startup.
 *
 * Why: Surfaces every missing/invalid variable in one place with a clear
 * message instead of failing deep inside a request. Called from `server.ts`
 * before the HTTP server binds a port, so a misconfigured deploy never goes
 * "listening but broken".
 */
export function validateConfig(): void {
  // required() above already throws if the Supabase trio is missing.
  if (config.corsOrigin.length === 0) {
    throw new Error('CORS_ORIGIN must list at least one origin.');
  }
  if (env === 'production' && config.corsOrigin.includes('*')) {
    throw new Error(
      'CORS_ORIGIN cannot be "*" in production. List explicit origins.',
    );
  }
  const hasFirebase =
    config.firebase.projectId &&
    config.firebase.clientEmail &&
    config.firebase.privateKey;
  if (env === 'production' && !hasFirebase) {
    // Non-fatal warning only — push is optional. Logged by the server.
    // eslint-disable-next-line no-console
    console.warn(
      '[config] FIREBASE_* not set — push notifications will be disabled.',
    );
  }
}


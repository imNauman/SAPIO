import NetInfo from '@react-native-community/netinfo';

/**
 * Network resilience helpers.
 *
 * Why: Production hardening for the mobile client. Two concerns:
 *  1. Offline detection — surfaces connectivity state so the UI can disable
 *     send buttons / show a banner instead of firing doomed requests.
 *  2. Retry — transient failures (flaky radio, 5xx, timeouts) are retried with
 *     exponential backoff so a brief blip doesn't surface as a hard error.
 *
 * NetInfo is already a workspace dependency; we reuse it rather than add one.
 */

/** True when the device currently has a usable data connection. */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected && !!state.isInternetReachable;
}

/**
 * Subscribe to connectivity changes. Returns an unsubscribe function.
 * The callback receives `true` when online, `false` when offline.
 */
export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  const unsub = NetInfo.addEventListener((state) => {
    cb(!!state.isConnected && !!state.isInternetReachable);
  });
  return unsub;
}

/**
 * Run an async task with exponential backoff. Retries on network/timeout/5xx
 * errors up to `retries` times. Non-retryable errors (4xx client errors) throw
 * immediately. Reuses the existing `AppError` shape from the API client.
 */
export async function withRetry<T>(
  task: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      const retryable = isRetryable(err);
      if (!retryable || attempt === retries) break;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Decide whether an error warrants a retry. */
function isRetryable(err: unknown): boolean {
  const e = err as { code?: string; response?: { status?: number } };
  // Network-level failures (no connection, timeout, DNS).
  if (
    e?.code === 'ECONNABORTED' ||
    e?.code === 'ENOTFOUND' ||
    e?.code === 'ECONNRESET' ||
    e?.code === 'NETWORK_ERROR'
  ) {
    return true;
  }
  // 5xx server errors are transient; 4xx are client errors (don't retry).
  const status = e?.response?.status;
  if (status && status >= 500) return true;
  return false;
}

'use client';

import { useEffect } from 'react';

/**
 * Global error boundary for the admin app.
 *
 * Why: Production hardening. Next.js `error.tsx` catches render/runtime errors
 * in the route tree and shows a recoverable fallback instead of a blank crash.
 * A "Try again" button resets the segment via `reset()`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[admin] global error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] p-6 text-center">
      <h1 className="text-xl font-semibold text-white">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-gray-400">
        The admin dashboard hit an unexpected error. You can try again.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}

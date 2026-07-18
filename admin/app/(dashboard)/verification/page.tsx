'use client';

import { useVerificationQueue, useVerificationDecision } from '@/lib/hooks';

/**
 * Verification queue.
 *
 * Why: Admins review identity/photo verification submissions and approve or
 * reject them. Drives the `manage_verification` permission. The actual
 * verification state transition reuses the existing verification repository.
 */
export default function VerificationPage() {
  const { data, isLoading } = useVerificationQueue();
  const decide = useVerificationDecision();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Verification Queue</h1>

      <div className="space-y-3">
        {data?.map((v) => (
          <div
            key={v.id}
            className="rounded-lg border border-[var(--border)] p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">User: {v.userId}</p>
                <p className="text-xs text-gray-500">
                  Status: {v.status} · Submitted:{' '}
                  {new Date(v.submittedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    decide.mutate({ id: v.id, status: 'approved' })
                  }
                  className="rounded-md bg-green-600 px-3 py-1 text-xs text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    decide.mutate({ id: v.id, status: 'rejected' })
                  }
                  className="rounded-md bg-red-600 px-3 py-1 text-xs text-white"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
        {data?.length === 0 && (
          <p className="text-sm text-gray-400">Queue is empty.</p>
        )}
      </div>
    </div>
  );
}

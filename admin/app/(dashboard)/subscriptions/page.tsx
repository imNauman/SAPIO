'use client';

import { useSubscriptions } from '@/lib/hooks';

/**
 * Subscriptions overview (read-only).
 *
 * Why: Surfaces premium subscription state for the `manage_premium` permission.
 * Payments/billing actions are explicitly out of scope for this platform.
 */
export default function SubscriptionsPage() {
  const { data, isLoading } = useSubscriptions();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Subscriptions</h1>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-left text-gray-400">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Renews</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-2 text-white">{s.userId}</td>
                <td className="px-4 py-2 text-gray-300">{s.planName}</td>
                <td className="px-4 py-2 text-gray-300">{s.status}</td>
                <td className="px-4 py-2 text-gray-300">
                  {s.expiresAt
                    ? new Date(s.expiresAt).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td className="px-4 py-2 text-gray-400" colSpan={4}>
                  No subscriptions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

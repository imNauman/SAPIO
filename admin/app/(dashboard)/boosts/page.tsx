'use client';

import { useBoostSessions } from '@/lib/hooks';

/**
 * Boost sessions overview (read-only).
 *
 * Why: Lets `manage_premium`-permissioned admins monitor active/past boost
 * sessions. No billing mutations — payments are out of scope.
 */
export default function BoostsPage() {
  const { data, isLoading } = useBoostSessions();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Boost Sessions</h1>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-left text-gray-400">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Started</th>
              <th className="px-4 py-2">Ends</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((b) => (
              <tr key={b.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-2 text-white">{b.userId}</td>
                <td className="px-4 py-2 text-gray-300">
                  {new Date(b.startedAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-gray-300">
                  {new Date(b.expiresAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-gray-300">
                  {b.status === 'active' ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td className="px-4 py-2 text-gray-400" colSpan={4}>
                  No boost sessions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

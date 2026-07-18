'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchUsers } from '@/lib/hooks';

/**
 * Users page.
 *
 * Why: Search users by username/display name and open the detail view. The
 * search input drives `useSearchUsers` (debounced via enabled flag). Only
 * visible to admins with `manage_users`.
 */
export default function UsersPage() {
  const [q, setQ] = useState('');
  const { data: users, isFetching } = useSearchUsers(q);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Users</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by username or display name…"
        className="w-full max-w-md rounded-md border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />

      {q && isFetching && <p className="text-sm text-gray-400">Searching…</p>}

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-left text-gray-400">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Verified</th>
              <th className="px-4 py-2">Premium</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.userId} className="border-t border-[var(--border)]">
                <td className="px-4 py-2 text-white">
                  {u.displayName ?? u.username ?? u.userId}
                </td>
                <td className="px-4 py-2 text-gray-300">{u.email}</td>
                <td className="px-4 py-2 text-gray-300">{u.status}</td>
                <td className="px-4 py-2 text-gray-300">
                  {u.isVerified ? 'Yes' : 'No'}
                </td>
                <td className="px-4 py-2 text-gray-300">
                  {u.isPremium ? 'Yes' : 'No'}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/users/${u.userId}`}
                    className="text-brand hover:underline"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
            {q && !users?.length && !isFetching && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

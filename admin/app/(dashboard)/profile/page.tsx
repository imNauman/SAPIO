'use client';

import { useAdminProfile } from '@/lib/hooks';
import { useAdminStore } from '@/lib/store';

/**
 * Admin Profile page.
 *
 * Why: Lets the signed-in admin review their own identity, role, and the
 * resolved permission set that drives every UI gate in the app.
 */
export default function ProfilePage() {
  const { data, isLoading } = useAdminProfile();
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const permissions = useAdminStore((s) => s.permissions);

  if (isLoading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Admin Profile</h1>

      <div className="rounded-lg border border-[var(--border)] p-6">
        <p className="text-sm text-gray-400">Email</p>
        <p className="text-white">{currentAdmin?.email}</p>

        <p className="mt-4 text-sm text-gray-400">Role</p>
        <p className="text-white">{currentAdmin?.roleName}</p>

        <p className="mt-4 text-sm text-gray-400">Status</p>
        <p className="text-white">{currentAdmin?.isActive ? 'Active' : 'Inactive'}</p>

        <p className="mt-4 text-sm text-gray-400">Last Login</p>
        <p className="text-white">
          {currentAdmin?.lastLoginAt
            ? new Date(currentAdmin.lastLoginAt).toLocaleString()
            : '—'}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] p-6">
        <p className="mb-3 text-sm text-gray-400">Permissions</p>
        <div className="flex flex-wrap gap-2">
          {permissions.map((p) => (
            <span
              key={p}
              className="rounded-full bg-[var(--brand)]/15 px-3 py-1 text-xs text-[var(--brand)]"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {data && (
        <div className="rounded-lg border border-[var(--border)] p-6">
          <p className="mb-3 text-sm text-gray-400">Raw Profile</p>
          <pre className="overflow-x-auto text-xs text-gray-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

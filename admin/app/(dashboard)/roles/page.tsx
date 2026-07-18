'use client';

import { useRoles, usePermissions, useAdmins, useAssignRole } from '@/lib/hooks';
import { useAdminStore } from '@/lib/store';

/**
 * Role Management page.
 *
 * Why: Shows the RBAC matrix (roles × permissions), the list of admins, and
 * lets a `manage_admins`-permissioned admin reassign an admin&apos;s role. Role
 * and permission *definitions* are seeded server-side and immutable here.
 */
export default function RolesPage() {
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const { data: admins } = useAdmins();
  const assignRole = useAssignRole();
  const hasManageAdmins = useAdminStore((s) => s.hasPermission)('manage_admins');

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-white">Role Management</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">RBAC Matrix</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] text-left text-gray-400">
              <tr>
                <th className="px-4 py-2">Role</th>
                {permissions?.map((p) => (
                  <th key={p.key} className="px-4 py-2">
                    {p.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles?.map((role) => (
                <tr key={role.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 text-white">{role.name}</td>
                  {permissions?.map((p) => (
                    <td key={p.key} className="px-4 py-2 text-center">
                      {role.permissions.includes(p.key) ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Admins</h2>
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] text-left text-gray-400">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Active</th>
                {hasManageAdmins && <th className="px-4 py-2">Reassign</th>}
              </tr>
            </thead>
            <tbody>
              {admins?.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 text-white">{a.email}</td>
                  <td className="px-4 py-2 text-gray-300">{a.roleName}</td>
                  <td className="px-4 py-2 text-gray-300">
                    {a.isActive ? 'Yes' : 'No'}
                  </td>
                  {hasManageAdmins && (
                    <td className="px-4 py-2">
                      <select
                        defaultValue={a.roleId}
                        onChange={(e) =>
                          assignRole.mutate({ id: a.id, roleId: e.target.value })
                        }
                        className="rounded-md border border-[var(--border)] bg-black/30 px-2 py-1 text-xs text-white"
                      >
                        {roles?.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

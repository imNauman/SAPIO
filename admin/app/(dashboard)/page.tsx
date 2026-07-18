'use client';

import { useDashboardStats, useActivityLogs } from '@/lib/hooks';

/**
 * Dashboard home page.
 *
 * Why: Aggregate stats (users, reports, verifications, boosts, premium, admins)
 * plus a recent activity feed. This is operational visibility — NOT product
 * analytics (analytics is explicitly out of scope).
 */
function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-xs uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: logs } = useActivityLogs(10);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading stats…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
          <StatCard label="Active Reports" value={stats?.activeReports ?? 0} />
          <StatCard
            label="Pending Verifications"
            value={stats?.pendingVerifications ?? 0}
          />
          <StatCard label="Active Boosts" value={stats?.activeBoosts ?? 0} />
          <StatCard label="Premium Users" value={stats?.premiumUsers ?? 0} />
          <StatCard label="Admins" value={stats?.totalAdmins ?? 0} />
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-medium text-white">Recent Activity</h2>
        <ul className="space-y-2 text-sm text-gray-300">
          {logs?.map((log) => (
            <li key={log.id} className="flex justify-between border-b border-[var(--border)] pb-2">
              <span>
                <span className="text-white">{log.adminEmail}</span> · {log.action}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
          {!logs?.length && (
            <li className="text-gray-500">No recent activity.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

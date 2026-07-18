'use client';

import { useSystemHealth } from '@/lib/hooks';

/**
 * System Health page.
 *
 * Why: Gives `view_analytics`-permissioned admins a live read on database
 * connectivity/latency and key record counts. Read-only operational signal.
 */
export default function HealthPage() {
  const { data, isLoading } = useSystemHealth();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;
  if (!data) return <p className="text-gray-400">No data.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">System Health</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-xs text-gray-400">Database</p>
          <p className="text-lg text-white">{data.database}</p>
          <p className="text-xs text-gray-500">{data.latencyMs} ms</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-xs text-gray-400">Users</p>
          <p className="text-lg text-white">{data.counts.users}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-xs text-gray-400">Reports (open)</p>
          <p className="text-lg text-white">{data.counts.reports}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4">
        <p className="mb-2 text-xs text-gray-400">Raw health payload</p>
        <pre className="overflow-x-auto text-xs text-gray-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

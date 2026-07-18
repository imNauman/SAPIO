'use client';

import { useState } from 'react';
import { useReports, useUpdateReportStatus } from '@/lib/hooks';

const STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'] as const;

/**
 * Reports moderation queue.
 *
 * Why: Moderators/admins review user-generated reports and advance their
 * status. This is the read+write surface for the `manage_reports` permission.
 * (AI-assisted triage is intentionally out of scope for this platform.)
 */
export default function ReportsPage() {
  const { data, isLoading } = useReports();
  const updateStatus = useUpdateReportStatus();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Reports</h1>

      <div className="space-y-3">
        {data?.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-[var(--border)] p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">
                  {r.categoryName ?? 'report'} ·{' '}
                  <span className="text-gray-400">{r.status}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Reporter: {r.reporterUserId} → Reported: {r.reportedUserId}
                </p>
              </div>
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="text-xs text-[var(--brand)]"
              >
                {expanded === r.id ? 'Hide' : 'Details'}
              </button>
            </div>

            {expanded === r.id && (
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <p className="text-xs text-gray-400">Description</p>
                <p className="text-sm text-gray-300">{r.description || '—'}</p>

                <label className="mt-3 block text-xs text-gray-400">
                  Update status
                </label>
                <select
                  defaultValue={r.status}
                  onChange={(e) =>
                    updateStatus.mutate({
                      id: r.id,
                      status: e.target.value as (typeof STATUSES)[number],
                    })
                  }
                  className="mt-1 rounded-md border border-[var(--border)] bg-black/30 px-2 py-1 text-xs text-white"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
        {data?.length === 0 && (
          <p className="text-sm text-gray-400">No reports.</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useNotifications } from '@/lib/hooks';

/**
 * Notifications overview (read-only).
 *
 * Why: Surfaces recent system/user notifications for the `manage_notifications`
 * permission. Compose/send actions are out of scope for this view.
 */
export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Notifications</h1>

      <div className="space-y-3">
        {data?.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-[var(--border)] p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-white">{n.title}</p>
              <span className="text-xs text-gray-500">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {n.body} · Recipient: {n.userId ?? 'broadcast'}
            </p>
          </div>
        ))}
        {data?.length === 0 && (
          <p className="text-sm text-gray-400">No notifications.</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useUserDetails, useUserAction } from '@/lib/hooks';

/**
 * User Details page.
 *
 * Why: Full profile view plus lifecycle actions (suspend, ban, reactivate,
 * delete, reset verification, reset password placeholder). Each action calls
 * the corresponding mutation; the backend enforces `manage_users` and writes an
 * audit-log entry. Delete/ban are destructive and confirmed inline.
 */
export default function UserDetailsPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { data: user, isLoading } = useUserDetails(userId);
  const actions = useUserAction();

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!user)
    return <p className="text-sm text-gray-400">User not found.</p>;

  const profile = (user as { profile?: Record<string, unknown> }).profile;
  const detail = user as {
    email: string | null;
    status: string;
    createdAt: string | null;
    lastSignInAt: string | null;
  };

  const btn =
    'rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-gray-200 hover:bg-white/5';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">User Details</h1>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
        <div>
          <div className="text-gray-400">User ID</div>
          <div className="text-white">{userId}</div>
        </div>
        <div>
          <div className="text-gray-400">Email</div>
          <div className="text-white">{detail.email}</div>
        </div>
        <div>
          <div className="text-gray-400">Status</div>
          <div className="text-white">{detail.status}</div>
        </div>
        <div>
          <div className="text-gray-400">Created</div>
          <div className="text-white">{detail.createdAt ?? '—'}</div>
        </div>
        <div>
          <div className="text-gray-400">Last sign in</div>
          <div className="text-white">{detail.lastSignInAt ?? '—'}</div>
        </div>
        <div>
          <div className="text-gray-400">Username</div>
          <div className="text-white">
            {(profile as { username?: string } | undefined)?.username ?? '—'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={() => actions.suspend.mutate(userId)}>
          Suspend
        </button>
        <button className={btn} onClick={() => actions.ban.mutate(userId)}>
          Ban
        </button>
        <button
          className={btn}
          onClick={() => actions.reactivate.mutate(userId)}
        >
          Reactivate
        </button>
        <button
          className={btn}
          onClick={() => actions.resetVerification.mutate(userId)}
        >
          Reset Verification
        </button>
        <button
          className={btn}
          onClick={() => actions.resetPassword.mutate(userId)}
        >
          Reset Password
        </button>
        <button
          className={`${btn} text-red-400`}
          onClick={() => {
            if (confirm('Permanently delete this user?')) {
              actions.remove.mutate(userId);
            }
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

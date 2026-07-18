'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/store';

/**
 * TopNav.
 *
 * Why: Shows the current admin identity and a logout action. Links to the
 * Admin Profile page. Logout clears the `AdminStore` (and the persisted JWT).
 */
export function TopNav() {
  const router = useRouter();
  const { currentAdmin, logout } = useAdminStore();

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
      <div className="text-sm text-gray-400">Admin Dashboard</div>
      <div className="flex items-center gap-4">
        <Link href="/profile" className="text-sm text-gray-300 hover:text-white">
          {currentAdmin?.email ?? 'Admin'}
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs text-gray-300">
            {currentAdmin?.roleName ?? ''}
          </span>
        </Link>
        <button
          onClick={onLogout}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-gray-300 hover:text-white"
        >
          Log out
        </button>
      </div>
    </header>
  );
}

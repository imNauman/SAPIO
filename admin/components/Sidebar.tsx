'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminStore } from '@/lib/store';
import { AdminPermission } from '@/lib/types';

/**
 * Sidebar.
 *
 * Why: Primary navigation for the admin shell. Items are filtered by the
 * current admin&apos;s permissions (read from `AdminStore`) so a Read Only admin
 * never sees mutating surfaces. The active route is highlighted via the pathname.
 */
interface NavItem {
  href: string;
  label: string;
  permission?: AdminPermission;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', permission: 'view_analytics' },
  { href: '/users', label: 'Users', permission: 'manage_users' },
  { href: '/reports', label: 'Reports', permission: 'manage_reports' },
  {
    href: '/verification',
    label: 'Verification Queue',
    permission: 'manage_verification',
  },
  { href: '/subscriptions', label: 'Subscriptions', permission: 'manage_premium' },
  { href: '/boosts', label: 'Boost Sessions', permission: 'manage_premium' },
  {
    href: '/notifications',
    label: 'Notifications',
    permission: 'manage_notifications',
  },
  { href: '/health', label: 'System Health', permission: 'view_analytics' },
  { href: '/roles', label: 'Role Management', permission: 'view_analytics' },
];

export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAdminStore((s) => s.hasPermission);

  const visible = NAV.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="flex w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-6 px-2 text-lg font-semibold text-white">SAPIO</div>
      <nav className="flex flex-col gap-1">
        {visible.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition ${
                active
                  ? 'bg-brand/20 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

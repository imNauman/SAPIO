'use client';

import { Sidebar } from '@/components/Sidebar';
import { TopNav } from '@/components/TopNav';
import { AuthGuard } from '@/components/AuthGuard';

/**
 * Dashboard layout — the admin shell.
 *
 * Why: Wraps every authenticated page in the `AuthGuard` and renders the
 * persistent `Sidebar` + `TopNav`. The `(dashboard)` route group keeps this
 * shell separate from the full-screen `/login` page.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <TopNav />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}

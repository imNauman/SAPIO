'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/store';
import { useAdminProfile } from '@/lib/hooks';

/**
 * AuthGuard.
 *
 * Why: Client-side gate for the `(dashboard)` route group. It hydrates the
 * stored token, fetches the current admin profile (which also re-validates the
 * JWT server-side), and redirects to `/login` when unauthenticated. Server-side
 * `requirePermission` remains the real enforcement boundary.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, setAdmin, logout } = useAdminStore();
  const profile = useAdminProfile();

  useEffect(() => {
    useAdminStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (profile.isError) {
      logout();
      router.replace('/login');
    }
    if (profile.data) {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('sapio_admin_token')
          : null;
      if (token) setAdmin(profile.data, token);
    }
  }, [profile.data, profile.isError, setAdmin, logout, router]);

  if (!isAuthenticated || profile.isLoading || !profile.data) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Loading admin session…
      </div>
    );
  }

  return <>{children}</>;
}

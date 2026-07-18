'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/lib/hooks';
import { useAdminStore } from '@/lib/store';

/**
 * Admin Login page.
 *
 * Why: Separate admin authentication. Reuses the same Supabase credentials as
 * end users but the backend additionally verifies the account is a registered,
 * active admin (`requireAdmin`). On success we store the admin + JWT in the
 * `AdminStore` and route to the dashboard.
 */
export default function LoginPage() {
  const router = useRouter();
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await login.mutateAsync({ email, password });
      setAdmin(result.admin, result.accessToken);
      router.replace('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Login failed';
      setError(message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg"
      >
        <h1 className="mb-1 text-xl font-semibold text-white">SAPIO Admin</h1>
        <p className="mb-6 text-sm text-gray-400">
          Sign in with your admin account.
        </p>

        <label className="mb-1 block text-xs text-gray-400">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
          required
        />

        <label className="mb-1 block text-xs text-gray-400">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
          required
        />

        {error && (
          <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'SAPIO Admin',
  description: 'Internal Admin Dashboard for SAPIO',
};

/**
 * Root layout.
 *
 * Why: Wraps the whole app in the TanStack Query provider. The admin shell
 * (sidebar + top nav) lives in the `(dashboard)` route group layout so the
 * login page stays full-screen.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

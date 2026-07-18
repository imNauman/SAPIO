/**
 * Admin 404 page.
 *
 * Why: Production hardening. A friendly not-found surface for unknown admin
 * routes instead of the default Next.js error. Kept minimal — no new features.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--background)] p-6 text-center">
      <h1 className="text-2xl font-semibold text-white">404</h1>
      <p className="text-sm text-gray-400">
        The page you’re looking for doesn’t exist.
      </p>
    </div>
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle (`.next/standalone`) so the admin app
  // can be deployed with a minimal Node image / PM2 without the full
  // node_modules tree. See DEPLOYMENT.md (admin section).
  output: 'standalone',
  // The admin app talks to the existing Express backend via NEXT_PUBLIC_API_URL.
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
};

module.exports = nextConfig;

/**
 * PM2 process definition for the SAPIO backend.
 *
 * Why: PM2 keeps the Node server alive (auto-restart on crash), manages log
 * rotation, and survives reboots when wired with `pm2 startup`. Run from the
 * repo root after building:
 *
 *   npm run build:backend
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup   # follow the printed command once
 */
module.exports = {
  apps: [
    {
      name: 'sapio-backend',
      cwd: './backend',
      script: 'dist/server.js',
      instances: 1, // Supabase connection pool + in-memory chat typing state are
      // not shared across processes, so run a single instance behind Nginx.
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Load .env from the backend folder.
      env_file: './backend/.env',
      // Restart if the process uses > 700 MB or has been up 24h (defends against
      // slow leaks in long-lived connections).
      max_memory_restart: '700M',
      restart_delay: 1000,
      exp_backoff_restart_delay: 2000,
      // Merge logs so `pm2 logs sapio-backend` shows everything.
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

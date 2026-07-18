# SAPIO — Deployment Guide (Backend on Ubuntu 24.04 VPS)

This guide deploys the **Express backend** behind **Nginx** with **HTTPS**,
managed by **PM2**. It assumes a fresh Ubuntu 24.04 server with a sudo user and
a domain (e.g. `api.sapio.app`) already pointing at the server's IP.

> The mobile app and admin dashboard are deployed separately — see
> `FIRST_RELEASE.md` (Android) and the Admin section below.

---

## 1. Install Node.js 20 LTS

```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # expect v20.x
npm -v    # expect 10.x
```

## 2. Clone the repository

```bash
sudo apt install -y git
cd /var/www
sudo git clone https://github.com/your-org/sapio.git
sudo chown -R $USER:$USER /var/www/sapio
cd /var/www/sapio
```

## 3. Install dependencies & build

The repo is an npm workspace (backend + mobile). Install once at the root, then
build the backend:

```bash
npm install
npm run build:backend   # compiles TypeScript -> backend/dist
```

> The mobile workspace is NOT needed on the server. If `npm install` tries to
> build mobile Expo assets, that's fine — it only installs deps.

## 4. Configure environment

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in real values (see `.env.example` comments). **Critical for production:**

- `NODE_ENV=production`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from your
  **production** Supabase project.
- `CORS_ORIGIN=https://admin.sapio.app,https://sapio.app` (no `*` in prod).
- `FIREBASE_*` only if you want push (optional).

Validate the config loads without error:

```bash
node -e "require('./backend/dist/config').validateConfig(); console.log('config OK')"
```

## 5. Run database migrations

Migrations live in `backend/supabase/migrations/*.sql`. Apply them with the
Supabase CLI (or paste into the Supabase SQL editor in order):

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-prod-ref
supabase db push   # applies unapplied migrations
```

> Never run migrations manually out of order. `supabase db push` is idempotent
> and tracks applied state.

## 6. Start the server with PM2

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
```

Verify:

```bash
pm2 status
curl http://localhost:4000/health      # -> {"status":"ok",...}
curl http://localhost:4000/health/ready # -> {"status":"ready",...}
```

## 7. Start on reboot

```bash
pm2 startup   # prints a command — run it exactly as shown (with sudo)
pm2 save      # re-save the process list so it restores on boot
```

## 8. Nginx reverse proxy + HTTPS

Install Nginx and Certbot:

```bash
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx
```

Create the site (replace `api.sapio.app`):

```bash
sudo nano /etc/nginx/sites-available/sapio
```

```nginx
server {
    listen 80;
    server_name api.sapio.app;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 12m;   # allow 10 MB uploads + overhead
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sapio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Enable HTTPS (Certbot auto-edits the config to add 443 + redirect):

```bash
sudo certbot --nginx -d api.sapio.app
```

Confirm the health endpoint over HTTPS:

```bash
curl https://api.sapio.app/health
```

## 9. Restart procedures

```bash
# After a backend code change:
cd /var/www/sapio
git pull
npm install
npm run build:backend
pm2 restart sapio-backend

# After editing backend/.env:
pm2 restart sapio-backend   # PM2 reloads env_file on restart
```

## 10. Rollback procedures

PM2 keeps the previous in-memory bundle only until restart. For a real rollback:

```bash
cd /var/www/sapio
git log --oneline -5          # find the last-good commit
git checkout <last-good-sha>
npm install
npm run build:backend
pm2 restart sapio-backend
curl https://api.sapio.app/health/ready
```

For database rollbacks, restore the latest Supabase backup (see Supabase docs)
**before** rolling code, since migrations are forward-only.

---

## Admin dashboard deployment (Next.js)

The admin app is a separate Next.js project in `admin/`.

```bash
cd /var/www/sapio/admin
npm install
cp .env.example .env.local
nano .env.local          # set NEXT_PUBLIC_API_URL=https://api.sapio.app/api
npm run build            # emits .next/standalone
```

Run with PM2 (create `admin/ecosystem.config.js` or reuse root pattern):

```bash
pm2 start "npm run start" --name sapio-admin --cwd /var/www/sapio/admin
pm2 save
```

Serve behind Nginx on a subdomain (e.g. `admin.sapio.app`) exactly like the API
block above, proxying to `http://127.0.0.1:3000`. Enable HTTPS the same way.

> Because `next.config.js` uses `output: 'standalone'`, you can also copy
> `.next/standalone` + `.next/static` + `public` to a minimal container/image.

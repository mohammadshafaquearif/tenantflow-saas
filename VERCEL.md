# Vercel Deployment Guide

TenantFlow is configured for **Vercel Serverless** + **Vercel Postgres** (Neon).

## Step 1 — Create Vercel Project

```bash
cd tenantflow-saas
npx vercel
```

Or connect the GitHub repo from [vercel.com/new](https://vercel.com/new).

## Step 2 — Add Vercel Postgres (Database)

1. Open your project on Vercel Dashboard
2. Go to **Storage** → **Create Database** → **Postgres**
3. Vercel automatically injects these env vars — **you don't need to copy them manually**:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | Pooled connection — API runtime (serverless) |
| `POSTGRES_URL_NON_POOLING` | Direct connection — migrations (`CREATE SCHEMA`) |
| `POSTGRES_PRISMA_URL` | Fallback pooled URL |

## Step 3 — Set Required Secrets

In **Project Settings → Environment Variables**, add:

| Key | Value | Environments |
|-----|-------|--------------|
| `JWT_SECRET` | `openssl rand -base64 48` output | Production, Preview |
| `NODE_ENV` | `production` | Production |

`CORS_ORIGINS` is optional — your `*.vercel.app` URL is added automatically.

## Step 4 — Deploy

```bash
git push   # auto-deploys if GitHub connected
# or
npx vercel --prod
```

Build runs: `tsc` → `migrate` (uses `POSTGRES_URL_NON_POOLING`) → deploy API.

## Step 5 — Test Production API

Replace `your-app.vercel.app` with your deployment URL:

```bash
# Health check
curl https://your-app.vercel.app/health

# Register a company
curl -X POST https://your-app.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Acme Corp",
    "adminEmail": "admin@acme.com",
    "adminPassword": "securepass123",
    "adminFullName": "Jane Admin"
  }'

# Login
curl -X POST https://your-app.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: acme-corp" \
  -d '{"email": "admin@acme.com", "password": "securepass123"}'
```

## Environment Variable Priority

```
Runtime DB:  POSTGRES_URL → DATABASE_URL → POSTGRES_PRISMA_URL
Migrations:  POSTGRES_URL_NON_POOLING → POSTGRES_URL → DATABASE_URL
```

## Local Dev with Neon (optional)

If you want local dev against the same Neon DB as Vercel:

1. Vercel Dashboard → Storage → your Postgres → **.env.local** tab → copy vars
2. Save to `.env` in project root
3. `npm run dev`

## Notes

- **Kubernetes / Docker** configs in `k8s/` are optional — not needed for Vercel deploy
- Serverless pool is capped at **1 connection** per function instance (Neon handles external pooling)
- Migrations run at **build time** via `vercel-build` script

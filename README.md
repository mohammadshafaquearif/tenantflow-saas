# TenantFlow — Enterprise Multi-Tenant B2B SaaS

A production-grade B2B SaaS platform (lightweight Jira/Slack-style) where companies register as isolated **tenants**. Each tenant's data lives in a dedicated PostgreSQL **schema** — enforced at the database layer via `SET LOCAL search_path` inside transactions.

## Architecture

```
┌─────────────┐     X-Tenant-ID / JWT      ┌──────────────────┐
│   Client    │ ─────────────────────────► │  Express API     │
└─────────────┘                            │  + JWT + RBAC    │
                                           └────────┬─────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    ▼                               ▼                               ▼
           ┌────────────────┐            ┌─────────────────┐            ┌─────────────────┐
           │ public schema  │            │ tenant_acme     │            │ tenant_globex   │
           │ (tenant registry)│          │ users, projects │            │ users, projects │
           └────────────────┘            │ tasks           │            │ tasks           │
                                         └─────────────────┘            └─────────────────┘
```

### Key Design Decisions

| Concern | Solution |
|---------|----------|
| **Data isolation** | Schema-per-tenant + transaction-scoped `search_path` |
| **Auth** | JWT with `tenantId`, `schemaName`, `role` claims |
| **Authorization** | RBAC: `TENANT_ADMIN` → `MANAGER` → `MEMBER` → `VIEWER` |
| **Cross-tenant guard** | JWT `tenantId` must match `X-Tenant-ID` header |
| **Security** | Helmet, rate limiting, bcrypt (12 rounds), Zod validation |

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **API**: Express (Vercel Serverless)
- **Database**: Vercel Postgres / Neon (schema-per-tenant)
- **Auth**: JWT + RBAC
- **Deploy**: **Vercel** (primary) · Docker · Kubernetes (optional)

## Deploy to Vercel (Recommended)

1. Push repo to GitHub and import on [vercel.com/new](https://vercel.com/new)
2. **Storage → Create Database → Postgres** (Neon — env vars auto-injected)
3. Add env var: `JWT_SECRET` = output of `openssl rand -base64 48`
4. Deploy — migrations run automatically at build time

Full step-by-step: see **[VERCEL.md](./VERCEL.md)**

```bash
curl https://YOUR-APP.vercel.app/health
```

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (recommended)

### 1. Run with Docker Compose

```bash
cd tenantflow-saas
docker compose up --build
```

API available at `http://localhost:4000`

### 2. Local Development

```bash
# Start PostgreSQL
docker compose up postgres -d

cp .env.example .env
npm install
npm run dev
```

## API Reference

### Register a new company (tenant)

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Acme Corp",
    "adminEmail": "admin@acme.com",
    "adminPassword": "securepass123",
    "adminFullName": "Jane Admin"
  }'
```

### Login

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: acme-corp" \
  -d '{"email": "admin@acme.com", "password": "securepass123"}'
```

### Create a project (authenticated)

```bash
curl -X POST http://localhost:4000/api/v1/projects \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-ID: <TENANT_UUID>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Q2 Roadmap", "description": "Product initiatives"}'
```

### Create a task

```bash
curl -X POST http://localhost:4000/api/v1/projects/<PROJECT_ID>/tasks \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-ID: <TENANT_UUID>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Design auth flow", "priority": "high", "status": "todo"}'
```

## RBAC Permissions

| Action | VIEWER | MEMBER | MANAGER | TENANT_ADMIN |
|--------|--------|--------|---------|--------------|
| View projects/tasks | ✅ | ✅ | ✅ | ✅ |
| Create projects/tasks | ❌ | ✅ | ✅ | ✅ |
| Delete projects/tasks | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ | ✅ |
| Change roles | ❌ | ❌ | ❌ | ✅ |

## Project Structure

```
tenantflow-saas/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment config
│   │   ├── database/        # Connection manager + migrations
│   │   ├── middleware/      # Auth, tenant resolution, errors
│   │   ├── routes/          # REST API routes
│   │   ├── services/        # Business logic
│   │   └── validators/      # Zod schemas
│   ├── tests/               # Unit + integration tests
│   └── Dockerfile
├── k8s/                     # Kubernetes manifests (EKS)
├── .github/workflows/       # CI/CD pipeline
└── docker-compose.yml
```

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

1. **Test** — TypeScript check, unit tests with coverage (PostgreSQL service container)
2. **Build** — Multi-stage Docker image pushed to GHCR
3. **Deploy** — Rolling update to EKS on `main` branch

### Required GitHub Secrets (for EKS deploy)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `EKS_CLUSTER_NAME` | Your EKS cluster name |

## Kubernetes Deployment

```bash
# Update secrets in k8s/secret.yaml first
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/api-deployment.yaml
```

## Running Tests

```bash
npm test          # Run all tests
npm run test:ci   # With coverage report
```

## Interview Talking Points

1. **Why schema-per-tenant?** Strong isolation without managing N database instances; easier backups per tenant; `search_path` prevents accidental cross-tenant queries.
2. **Defense in depth**: JWT tenant claim + header validation + DB-level schema isolation.
3. **Production readiness**: Health/readiness probes, graceful shutdown, non-root containers, rate limiting, structured error codes.
4. **CI/CD**: Automated tests gate every PR; immutable Docker images; zero-downtime rolling deploys on EKS.

## License

MIT

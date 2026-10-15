# BuildFlow

BuildFlow is an **original, open-source construction project management platform** (MIT licensed). It gives builders, remodelers, and specialty contractors one place to run their jobs: projects, scheduling, to-dos, daily logs, photos and documents, budgets, estimates, change orders, selections, team messaging, and a read-mostly client portal.

It is not affiliated with any commercial construction software vendor.

## What's inside

- **Dashboard** — active projects, open to-dos, the next 7 days of scheduled work, pending selections, and recent daily logs.
- **Projects** — status tracking (lead → active → on hold → completed), key dates, budgets, and per-project tabs for everything below.
- **Schedule** — per-project and company-wide views of phases and milestones with assignees and statuses.
- **To-dos** — punch lists with priorities, due dates, and assignees.
- **Daily logs** — weather, crew size, hours, and notes from the field.
- **Files** — photos, plans, and documents stored per project (local volume).
- **Budget** — estimated vs. actual cost tracking by category.
- **Estimates** — line-item estimates with auto-numbering (EST-001…) and draft → sent → approved/declined workflow.
- **Change orders** — documented changes with amounts and approval workflow (CO-001…).
- **Selections** — finish/fixture choices routed to clients for approval.
- **Messages** — per-project team/client communication.
- **Client portal** — clients sign in and see only their projects: progress, upcoming work, selections to approve, messages, shared files, and estimates.
- **Team & clients** — user management with roles (Owner, Manager, Subcontractor, Client) and client records with optional portal logins.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 ORM · PostgreSQL 16 · Auth.js v5 (email/password, bcrypt) · Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (v2, the `docker compose` command).

That's it — the database, migrations, seed data, and app all come up together.

## Quickstart (Docker)

```bash
# 1. Copy the example environment file
cp .env.example .env

# 2. (Recommended) set a real session secret
# On macOS/Linux:
openssl rand -base64 32   # paste the output as AUTH_SECRET in .env

# 3. Build and start everything
docker compose up --build
```

Then open **http://localhost:3000**.

The app container automatically runs database migrations and loads demo data on first start. Data persists in Docker named volumes (`pgdata` for Postgres, `uploads` for project files).

### Demo logins

Password for all demo accounts: **`demo1234`**

| Email | Role | Sees |
|---|---|---|
| `owner@demo.local` | Owner | Everything |
| `manager@demo.local` | Manager | Everything except owner-only team changes |
| `sub@demo.local` | Subcontractor | Projects, schedule, to-dos, logs, files |
| `client@demo.local` | Client | Only their project, via the simplified client portal |

To start fresh (wipe demo data and start with an empty database):

```bash
docker compose down -v   # removes the pgdata and uploads volumes
docker compose up --build
```

## Running without Docker (local dev)

You'll need Node.js 20+ and a running PostgreSQL 16 instance.

```bash
npm install

# Point Prisma at your database
cp .env.example .env
# edit DATABASE_URL in .env, e.g.:
# DATABASE_URL="postgresql://buildflow:buildflow@localhost:5432/buildflow"

# Create the database schema
npx prisma migrate deploy

# Load demo data (optional; safe to run more than once)
npm run seed

# Start the dev server
npm run dev
```

Open **http://localhost:3000**.

Useful commands:

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Prisma generate + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Load demo data (idempotent) |
| `npx prisma studio` | Visual database browser |

## Project structure

```
├── app/
│   ├── page.tsx               # Public landing page
│   ├── login/page.tsx         # Sign-in
│   ├── (app)/                 # Authenticated app (route group)
│   │   ├── dashboard/         # Dashboard
│   │   ├── projects/          # Project list, detail + 10 tabs
│   │   ├── schedule/          # Company-wide schedule
│   │   ├── clients/           # Client management
│   │   └── team/              # User management
│   └── api/                   # REST route handlers (CRUD per entity)
├── components/                # Shared UI (ui.tsx kit, app shell, tabs, portal)
├── lib/                       # db client, auth helpers, upload helpers
├── prisma/
│   ├── schema.prisma          # Data model
│   ├── migrations/            # SQL migrations (applied by migrate deploy)
│   └── seed.ts                # Demo data
├── auth.config.ts / auth.ts   # Auth.js v5 configuration
├── proxy.ts                   # Route protection (redirects to /login)
├── Dockerfile                 # Multi-stage production image
├── docker-compose.yml         # db (postgres:16) + app services
└── .env.example               # Required environment variables
```

### API overview

All endpoints are under `/api` and require sign-in (401 otherwise):

- `GET/POST /api/projects` · `GET/PATCH/DELETE /api/projects/[id]`
- `GET/POST /api/projects/[id]/schedule` (+ `/[itemId]`)
- `GET/POST /api/projects/[id]/todos` (+ `/[todoId]`)
- `GET/POST /api/projects/[id]/logs` (+ `/[logId]`)
- `GET/POST /api/projects/[id]/budget` (+ `/[itemId]`)
- `GET/POST /api/projects/[id]/estimates` (+ `/[estimateId]`)
- `GET/POST /api/projects/[id]/change-orders` (+ `/[coId]`)
- `GET/POST /api/projects/[id]/files` (+ `/[fileId]`) — multipart upload
- `GET /api/files/[id]` — authenticated file download
- `GET/POST /api/projects/[id]/messages`
- `GET/POST /api/projects/[id]/selections` (+ `/[selectionId]`)
- `GET/POST /api/clients` (+ `/[id]`) · `GET/POST /api/team` (+ `/[id]`)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string for Prisma |
| `AUTH_SECRET` | Yes | Random secret for session encryption (`openssl rand -base64 32`) |
| `UPLOAD_DIR` | No | File storage directory (Docker sets `/app/uploads`; local default `./uploads`) |

## License

MIT — see [LICENSE](LICENSE).

# S-Base

Multi-app platform for personal use and development: recipes, workouts, measurements, wines, cashflow, minecraft server control, minor study tracking and system administration (Pulse).

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Frontend | [Next.js](https://nextjs.org) (App Router) + React, Tailwind CSS |
| Backend | [Elysia.js](https://elysiajs.com) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Database | SQLite (`bun:sqlite`, WAL mode) |

The repo is a Bun workspace monorepo (`backend/`, `frontend/`). The frontend proxies `/api/*` to the backend on port `3001`.

## Development

### Prerequisites

- [Bun](https://bun.sh) (latest)

### Getting started

```bash
bun install
cp .env.example .env      # optional, all development defaults work without it
bun run db:migrate        # create/upgrade the SQLite database (sbase.db in the repo root)
bun run db:seed           # sample data + default users (development only)
bun run dev               # backend + frontend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |

Run one side only with `bun run dev:backend` or `bun run dev:frontend`.

Seeded users (development only): `admin` / `admin` and `tester` / `tester`.

> `db:seed` writes sample data into `sbase.db`. Skip it if you already have a database you want to keep.

### Useful commands

| Command | What |
|---------|------|
| `bun run test` | Backend and frontend tests (backend uses in-memory SQLite) |
| `bun run test:all` | Tests + frontend ESLint |
| `bun run pre-push` | `test:all` + production build |
| `bun run db:user` | User management CLI (create, pause, edit permissions) |
| `bun run --cwd backend db:generate` | Generate a Drizzle migration after a schema change |

## Production

Production runs on a Linux server (Fedora) behind `cloudflared` (Cloudflare Access / Tunnel). The backend only listens on `127.0.0.1`; only the Next.js frontend is exposed through the tunnel.

### 1. Install and build

```bash
git pull
bun install --frozen-lockfile
bun run build
```

### 2. Configure the environment

Create a `.env` (see `.env.example` for every option) or set the variables in your service manager. Required:

| Variable | Purpose |
|----------|---------|
| `INTERNAL_AUTH_SECRET` | Shared secret for backend **and** Next.js server (used by `/api/auth/cf-login`). Generate with `openssl rand -hex 32`. The backend refuses to start without it. |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed for cross-origin API requests, e.g. `https://base.example.com`. Empty means same-origin only. |

Optional: `DB_PATH`, `PORT` (default `3001`), `HOST` (default `127.0.0.1`), `BACKUP_DIR`, `BACKUP_KEEP` (default `14`), `API_URL`, `MC_SERVERS_DIR`, `DISCORD_BOT_TOKEN`, `N8N_INVOICE_EMAIL_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`.

### 3. Prepare the database

```bash
bun run db:migrate
```

Migrations are non-destructive; run them on every deploy. **Do not run `db:seed` in production** (it refuses unless `ALLOW_PROD_SEED=1`).

The backend also refuses to start in production while `admin/admin` or `tester/tester` still work. Create a real user and remove or change the defaults:

```bash
bun run db:user create <username> <password> [email] [modules]
bun run db:user change-password <username> <new-password>
bun run db:user --help
```

`ALLOW_DEFAULT_USERS=1` overrides the check. Only use it temporarily.

### 4. Start

```bash
bun run start
```

This runs the backend (`NODE_ENV=production`, port `3001`) and the frontend (`next start`, port `3000`). Point the `cloudflared` tunnel at `http://localhost:3000`.

To run each side as its own service (for example with systemd), use:

```bash
bun run start:backend
bun run start:frontend
```

Both need the same `INTERNAL_AUTH_SECRET`, and both must be started from the repo root.

### 5. Verify

```bash
curl http://127.0.0.1:3001/api/health
# {"status":"ok","uptime":...}
```

### Operations

- **Backups**: in production the backend writes a daily SQLite snapshot (`VACUUM INTO`) to `BACKUP_DIR` (default `<db dir>/backups`) and keeps the newest `BACKUP_KEEP` files (default 14). Copy them off the machine regularly.
- **Logs**: errors are logged as JSON to stdout/stderr, so `journalctl` works when run under systemd. Clients only see generic 500 responses.
- **Login rate limiting**: login attempts are limited per IP and per username.
- **Updating**: `git pull && bun install --frozen-lockfile && bun run build && bun run db:migrate`, then restart the services.
- **CI**: `.github/workflows/ci.yml` runs `test:all` and `build` on pull requests and non-main pushes.

---
last_mapped_commit: aecd703794ff6d79330d342f131628fb05b007a2
last_mapped_at: 2026-10-12
---
# External Integrations

**Analysis Date:** 2026-10-12

## APIs & External Services

**Transactional Email:**
- Nodemailer SMTP - Invoice emailing in Cashflow module
  - Client: `nodemailer` (`backend/src/lib/mailer.ts`)
  - Auth: `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`

**Discord Integration:**
- Discord Bot - Monitoring and remote management of Minecraft instances
  - Client: `discord.js` Client (`backend/src/modules/minecraft/discord-bot.ts`)
  - Auth: `DISCORD_BOT_TOKEN`, `DISCORD_BOT_DEFAULT_SERVER`

**n8n Automation & Publishing:**
- n8n Webhook - Triggers public static site generation for `minor.stevenheijn.nl`
  - Client: Native `fetch` (`backend/src/modules/minor/publish-notifier.ts`)
  - Auth: `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`

**Google Fonts:**
- Google Web Fonts API - Font binary downloading and caching for Resume PDF exports
  - Client: Native `fetch` with caching in `backend/src/modules/resume/fonts.ts`

## Data Storage

**Databases:**
- SQLite (Local Embedded Database)
  - Connection: `bun:sqlite` (`backend/src/db/client.ts`), defaults to `sbase.db` at repo root or `DB_PATH`
  - Client: `drizzle-orm/bun-sqlite` with WAL mode enabled (`PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`, `PRAGMA busy_timeout = 5000`)
  - Schema: Split per module in `backend/src/db/schema/*.ts`

**File Storage:**
- Local Filesystem:
  - Uploaded recipe photos and minor evidence files stored in `backend/uploads/` (`backend/src/utils/uploads.ts`)
  - Backups stored in `backups/` directory relative to DB path (`backend/src/db/backup.ts`)
  - Minecraft server directories located in `MC_SERVERS_DIR` (defaults to `~/minecraft/servers`)

**Caching:**
- In-memory rate limiting and sessions in backend (`backend/src/security.ts`, `backend/src/auth/index.ts`)
- Client-side IndexedDB / localStorage for offline workouts and draft sessions (`frontend/src/lib/offline-workout.ts`, `frontend/src/lib/template-draft.ts`)

## Authentication & Identity

**Auth Provider:**
- Custom Session Cookie Authentication with Cloudflare Access Integration
  - Session Store: SQLite table `sessions` (`backend/src/db/schema/auth.ts`)
  - Cookie: `session_id` (HTTP-only, 7-day lifetime, secure flag in production)
  - Module RBAC: Table `usermodulepermissions` (`backend/src/db/schema/auth.ts`), verified via `AuthService.moduleAccessCheck()`
  - SSO / Zero Trust: Cloudflare Access tunnel forwarding `cf-access-authenticated-user-email` header, exchanged for session via `/api/auth/cf-exchange` (`frontend/src/app/api/auth/cf-exchange/route.ts`)

## Monitoring & Observability

**Error Tracking:**
- Structured console error logging in backend handlers and client notifications; no external third-party APM/Sentry

**Logs:**
- Console stdout/stderr captured by Bun process runner or systemd journal
- Minecraft server console logs captured and streamed via `backend/src/modules/minecraft/index.ts`

**Pulse Module:**
- Built-in system metrics tracking CPU, memory, uptime, active sessions, and module permissions (`backend/src/modules/pulse/index.ts`)

## CI/CD & Deployment

**Hosting:**
- Private Linux server (Fedora Linux)
- Next.js frontend standalone/server on port `:3000`
- Elysia backend on port `:3001`
- Cloudflare Tunnel (`cloudflared`) routing external traffic

**CI Pipeline:**
- Local pre-push hook: `.githooks/pre-push` running `bun run pre-push` (`test:all` + `build`)

## Environment Configuration

**Required env vars:**
- `INTERNAL_AUTH_SECRET` - Shared secret between Next.js API route and Elysia backend
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Required for sending invoices via email
- `DISCORD_BOT_TOKEN` - Required if Discord Minecraft bot is enabled
- `MINOR_SNAPSHOT_TOKEN`, `MINOR_PUBLISH_USERNAME` - Required for public minor portfolio snapshot access
- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` - Required for minor automated static site rebuilding

**Secrets location:**
- System environment variables or deployment secret manager (never committed to repository)

## Webhooks & Callbacks

**Incoming:**
- `/api/auth/cf-exchange` - Cloudflare Access authentication callback
- `/api/minor/public-snapshot` - Authenticated Bearer token endpoint queried by publishing worker / n8n

**Outgoing:**
- n8n Webhook: POST call to `process.env.N8N_WEBHOOK_URL` triggered on Minor portfolio updates (`backend/src/modules/minor/publish-notifier.ts`)

---

*Integration audit: 2026-10-12*

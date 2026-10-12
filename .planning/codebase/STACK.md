---
last_mapped_commit: aecd703794ff6d79330d342f131628fb05b007a2
last_mapped_at: 2026-10-12
---
# Technology Stack

**Analysis Date:** 2026-10-12

## Languages

**Primary:**
- TypeScript 5.x - Full-stack language used across backend (`backend/src/**/*.ts`) and frontend (`frontend/src/**/*.{ts,tsx}`)
- CSS - Styling tokens and theme definitions (`frontend/src/app/globals.css`)

**Secondary:**
- JavaScript / ESM - Configuration files (`frontend/eslint.config.mjs`, `frontend/postcss.config.mjs`)
- SQL - SQLite schema definitions and migrations (`backend/migrations/*.sql`)

## Runtime

**Environment:**
- Bun (>=1.0) - High-performance JavaScript/TypeScript runtime powering both backend HTTP services and frontend Next.js dev server
- Node.js compatibility APIs provided natively by Bun

**Package Manager:**
- Bun Workspaces - Configured in root `package.json` (`workspaces: ["backend", "frontend"]`)
- Lockfile: `bun.lock` (present at repository root)

## Frameworks

**Core:**
- Elysia.js (`elysia` ^1.2.25) - Fast, ergonomic backend web framework running on Bun (`backend/src/index.ts`)
- Next.js (`next` 16.2.7 pre-stable App Router) - Frontend framework with React Server Components and Client Components (`frontend/src/app`)
- React (`react` 19.2.4, `react-dom` 19.2.4) - Modern UI component library

**Testing:**
- Bun Test (`bun test`) - Built-in test runner for backend unit/integration tests (`DB_PATH=:memory: bun test`) and frontend helper tests (`bun test`)

**Build/Dev:**
- Drizzle ORM (`drizzle-orm` ^0.40.1) & Drizzle Kit (`drizzle-kit` ^0.30.6) - Type-safe TypeScript ORM for SQLite (`backend/drizzle.config.ts`)
- Tailwind CSS v4 (`tailwindcss` ^4, `@tailwindcss/postcss` ^4) - Utility-first styling engine
- Concurrently (`concurrently` ^9.1.0) - Root dev task orchestration (`bun run dev`)
- ESLint (`eslint` ^9, `eslint-config-next` 16.2.7) - Flat-config frontend linter

## Key Dependencies

**Critical:**
- `bun:sqlite` - Native SQLite driver with WAL journal mode and foreign key constraints enabled (`backend/src/db/client.ts`)
- `@elysiajs/cors` (^1.2.0) - Cross-Origin Resource Sharing handling (`backend/src/index.ts`)
- `@react-pdf/renderer` (^4.5.1) - PDF document generation for Invoices, Minor sprint summaries, and CVs (`frontend/src/components/*-pdf.tsx`)
- `exceljs` (^4.4.0) & `xlsx` (^0.18.5) - Excel spreadsheet parsing and generation for Minor sprint data (`frontend/src/lib/minor-excel.ts`)
- `lucide-react` (^1.17.0) - UI icon set for The Signal Panel design system
- `class-variance-authority` (^0.7.1), `clsx` (^2.1.1), `tailwind-merge` (^3.6.0) - Dynamic class name resolution

**Infrastructure:**
- `nodemailer` (^10.0.12) - Transactional SMTP client for invoice delivery (`backend/src/lib/mailer.ts`)
- `discord.js` (^14.27.0) - Discord bot integration for Minecraft server status and commands (`backend/src/modules/minecraft/discord-bot.ts`)
- `canvas-confetti` (^1.9.4) - Gamification animations upon milestone completions

## Configuration

**Environment:**
- Backend reads system environment variables in `backend/src/security.ts`, `backend/src/index.ts`, and module services:
  - `PORT`: HTTP port (default: `3001`)
  - `HOST`: HTTP interface bind (default: `0.0.0.0`)
  - `NODE_ENV`: Runtime mode (`production`, `development`, `test`)
  - `DB_PATH`: SQLite database file path (default: repo root `sbase.db`; in tests: `:memory:`)
  - `INTERNAL_AUTH_SECRET`: Secret token for validating requests forwarded by internal services/Cloudflare exchange
  - `ALLOWED_ORIGINS`: Comma-separated CORS allowed origins
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`: Mailer configuration
  - `MC_SERVERS_DIR`, `MC_TEMPLATES_DIR`, `MC_EMPTY_SHUTDOWN_MINUTES`: Minecraft server directory and timeout config
  - `DISCORD_BOT_TOKEN`, `DISCORD_BOT_DEFAULT_SERVER`: Discord bot credentials
  - `MINOR_SNAPSHOT_TOKEN`, `MINOR_PUBLISH_USERNAME`: Minor public snapshot API token and username
  - `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`: n8n publish webhook configuration
- Frontend configuration:
  - `API_URL`: Backend API endpoint (default: `http://127.0.0.1:3001/api`)
  - `NEXT_DIST_DIR`: Custom build output directory
  - `CF_DEV_EMAIL`: Local dev fallback for simulating Cloudflare Access authentication

**Build:**
- `package.json` - Workspace definition and root scripts
- `backend/tsconfig.json` & `frontend/tsconfig.json` - Compiler options and module resolution
- `backend/drizzle.config.ts` - Drizzle Kit schema and migrations directory mapping
- `frontend/next.config.ts` - Next.js proxy rewrites from `/api/*` to `http://127.0.0.1:3001/api/:path*` and strict security headers

## Platform Requirements

**Development:**
- Bun runtime on Linux, macOS, or WSL
- Local SQLite database file `sbase.db` (never wipe or overwrite)

**Production:**
- Linux (private server on Fedora Linux)
- Process supervisor (e.g. systemd) managing Bun processes
- Reverse proxy / tunnel via Cloudflare Tunnel (`cloudflared`) injecting `cf-access-authenticated-user-email`

---

*Stack analysis: 2026-10-12*

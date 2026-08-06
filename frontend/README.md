# S-Base Frontend

Next.js App Router frontend for the S-Base monorepo platform.

## Features & Stack

- **Framework**: Next.js 16.2.7 (App Router)
- **UI & Styling**: Tailwind CSS v4, Lucide icons, custom Design System tokens
- **Internationalization**: Dutch UI (`@/lib/lang`)
- **API Proxy**: Rewrites `/api/*` requests to the Elysia backend (`http://localhost:3001/api/*`) via `next.config.ts`

## Development

Run development server from the repo root:

```bash
bun run dev:frontend
```

Runs on [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
# Lint code
bun run --cwd frontend lint

# Production build
bun run --cwd frontend build
```

# S-Base

Multi-app platform for personal use and development.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Frontend | [Next.js](https://nextjs.org) (App Router) + React |
| Backend | [Elysia.js](https://elysiajs.com) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Database | SQLite (bun:sqlite) |
| UI | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com) |

## Getting Started

```bash
# Install dependencies
bun install

# Run migrations (if starting fresh)
bun run db:migrate

# Seed sample data
bun run db:seed

# Start development (both backend + frontend)
bun run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## Development

```bash
# Backend only
bun run dev:backend

# Frontend only
bun run dev:frontend
```

## Database

```bash
# Run SQL migrations
bun run db:migrate

# Seed sample data
bun run db:seed

# Reset database (drops all tables)
bun run db:reset
```

## Users

Default seeded users:
- **admin** / password: `admin`
- **tester** / password: `tester`

# LawDesk V1 Monorepo Skeleton

This project skeleton follows the frozen LawDesk V1 specifications and includes:

- pnpm workspace
- Turborepo
- Next.js frontend
- Fastify backend
- PostgreSQL + Prisma
- AI runtime service
- Shared packages
- GitHub Actions CI
- Docker + docker compose
- Environment templates

## Quick Start

1. Install pnpm (if needed):
   - `corepack enable`
   - `corepack prepare pnpm@9.12.0 --activate`
2. Install dependencies:
   - `pnpm install`
3. Start PostgreSQL via Docker:
   - `docker compose up -d postgres`
4. Copy env template:
   - `cp .env.example .env`
5. Generate Prisma client:
   - `pnpm --filter @lawdesk/database prisma:generate`
6. Run all apps in dev mode:
   - `pnpm dev`

## Service Ports

- Frontend: 3000
- Backend API: 4000
- AI Runtime: 4100

# LawDesk V1 Deployment

## Supported Runtime

| Component | Requirement |
| --- | --- |
| Node.js | Node.js 20 LTS or a release-compatible newer LTS version |
| pnpm | 9.12.0, matching `packageManager` |
| PostgreSQL | PostgreSQL with UUID and `gen_random_uuid()` support |
| Backend | TypeScript build executed as the `@lawdesk/backend` package |
| Frontend | Next.js production build executed as the `@lawdesk/frontend` package |

## Required Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string for the target environment. |
| `NODE_ENV` | Yes | Use `production` for deployed services. |
| `API_PORT` | Backend | Backend listening port; defaults to 4000. |
| `AI_PROVIDER` | Yes | Explicit provider selection: `minimax` for production or `mock` for approved non-production verification. |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Public Backend base URL. Production must not default to localhost. |
| `MINIMAX_API_KEY` | Conditional | Required when `AI_PROVIDER=minimax`. |
| `MINIMAX_BASE_URL` | Conditional | Explicit MiniMax endpoint when required by the selected authentication mode. |
| `MINIMAX_MODEL` | Conditional | MiniMax model identifier. |
| `GOLDEN_DATABASE_NAME` | Golden only | Must equal `lawdesk_rc_test`; this is a caller declaration, not Backend database verification. |

Do not enable `ENABLE_DEV_RESET` or `ENABLE_DEV_PURGE` in deployed environments.

## First Deployment Order

1. Create a PostgreSQL database and provision a least-privilege application account.
2. Set `DATABASE_URL` for the target database; never reuse the RC test database for production.
3. Install dependencies with the repository pnpm version.
4. Generate Prisma Client.
5. Deploy all committed migrations.
6. Run Backend and Frontend typechecks and production builds.
7. Start the Backend and verify `/health` and `/health/db`.
8. Start the Frontend with `NEXT_PUBLIC_API_BASE_URL` pointing to the Backend.
9. Verify Intake, Matter Workspace, Draft publication, formal Document, and DOCX export.
10. Record deployment and smoke-test results in the RC Checklist.

## Install And Build

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install --frozen-lockfile
pnpm --filter @lawdesk/database prisma:generate
pnpm --filter @lawdesk/database build
pnpm --filter @lawdesk/backend typecheck
pnpm --filter @lawdesk/backend build
pnpm --filter @lawdesk/frontend typecheck
pnpm --filter @lawdesk/frontend build
```

## Migration

```bash
DATABASE_URL='<target-postgresql-url>' \
pnpm --filter @lawdesk/database prisma:migrate:deploy
```

Run `prisma:migrate:deploy`, not development migration creation, during deployment.

## Start Services

Backend:

```bash
DATABASE_URL='<target-postgresql-url>' \
NODE_ENV=production \
AI_PROVIDER=minimax \
API_PORT=4000 \
pnpm --filter @lawdesk/backend start
```

Frontend:

```bash
NODE_ENV=production \
NEXT_PUBLIC_API_BASE_URL='https://<backend-host>' \
pnpm --filter @lawdesk/frontend start
```

The Backend `start` command requires the Backend build output to exist.

## Golden RC Verification

Golden is a pre-release verification tool and must run only against an isolated RC Backend connected to `lawdesk_rc_test`.

```bash
GOLDEN_DATABASE_NAME=lawdesk_rc_test \
pnpm golden:run case01-private-lending \
  --provider=mock \
  --base-url=http://127.0.0.1:4000
```

Golden does not call `/dev/reset`, purge, or any global deletion endpoint.

## Post-Deployment Checks

| Check | Required Result |
| --- | --- |
| Backend health | PASS |
| Database health | PASS |
| Frontend reachable | PASS |
| Production API base | PASS |
| Intake upload and analysis | PASS |
| Draft lawyer-confirmation boundary | PASS |
| Formal Document and DOCX export | PASS |
| Dev Reset and Dev Purge unavailable | PASS |

## Rollback

1. Stop traffic to the affected release.
2. Restore the previous application build.
3. Do not roll back migrations by deleting data or rewriting migration history.
4. Restore the database only from an approved backup when required.
5. Re-run health and data-integrity checks before restoring traffic.

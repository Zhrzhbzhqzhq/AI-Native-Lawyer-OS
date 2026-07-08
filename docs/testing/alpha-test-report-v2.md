# Alpha Test V2 — Rerun Results

Summary:

- Alpha end-to-end: ❌ Failed
- Frontend build (`pnpm --filter @lawdesk/frontend build`): ✅ Passed
- Project check (`./scripts/check.sh`): ❌ Failed (build phase error)

Key findings:

1. Backend /health responded 200 (backend is running locally). However many API calls in the Alpha run returned HTTP 500.
	- Root cause observed in backend error output: Prisma startup failure due to missing environment variable `DATABASE_URL` ("Environment variable not found: DATABASE_URL"). This causes server-side 500 errors when endpoints that access the database are invoked (e.g. creating materials, matters).

2. `./scripts/check.sh` failed during its build check with a Next.js error: "Failed to collect page data for /intake/analyzing" (PageNotFoundError). Note: a direct `pnpm --filter @lawdesk/frontend build` run completed successfully earlier in this session, but `./scripts/check.sh` runs additional checks and failed.

Alpha test run details (high level):

- The Alpha runner attempted to create materials and received multiple HTTP 500 responses (materials creation failed), then the runner aborted with a shell error (`material_ids[@]: unbound variable`). See /tmp/alpha_test_v2_output.txt for full output.

Conclusion / Next steps:

- Alpha V2 did not pass due to backend DB configuration missing and the `check.sh` build check failing. To fully exercise Alpha V2 end-to-end, start or configure the database (set `DATABASE_URL` / run Postgres) and re-run `./scripts/check.sh` and the Alpha runner.

Problems counted: 2 (missing `DATABASE_URL` causing 500s; `./scripts/check.sh` build error for `/intake/analyzing`).

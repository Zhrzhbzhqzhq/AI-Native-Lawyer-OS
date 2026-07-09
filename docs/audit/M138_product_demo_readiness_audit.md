# M138 Product Demo Readiness Audit

Date: 2026-07-10

Scope
- Target matter: `m-mrco9m97-dbygsz` (real sample used for earlier investigations).
- Pages checked: Matter List, Matter Overview, Evidence, Facts, Issues, Laws, Arguments, Documents.
- Constraints: no code/schema/data changes — read-only audit.

Summary (brief)
- API data shows `documents: 3`, `evidence: 8`, `facts: 13`, `issues: 6`, `laws: 13`, `arguments: 11` for matter `m-mrco9m97-dbygsz`.
- Of the front-end pages requested, `Evidence`, `Facts`, `Issues`, `Laws`, `Arguments` returned 200 OK HTML; `Matter List`, `Matter Overview`, and `Documents` returned 500 server error during this audit (Next.js server-side error). See details below.
- The `Documents` resource for this matter contains 3 draft documents with `content = null` and `content_uri = ""` (empty drafts) — historical artifacts from earlier AI intake. These are present in the DB and surfaced by the API.
- The Matter List currently contains a large number of `mock-*` matters (test/demo fixtures) which will clutter the list in demos.

Detailed Findings

1) Page openability
- Matter List (`/matters`) — HTTP 500 (server error). Could not render page during audit; API endpoint for listing matters is functional (returned 1032 matters) but the UI page responded 500 due to Next.js server error: "Cannot find module './643.js'" in server runtime.
- Matter Overview (`/matters/m-mrco9m97-dbygsz`) — HTTP 500 (server error) — same server-side issue.
- Evidence (`/matters/m-mrco9m97-dbygsz/evidence`) — HTTP 200 OK, page rendered HTML during audit.
- Facts (`/matters/m-mrco9m97-dbygsz/facts`) — HTTP 200 OK.
- Issues (`/matters/m-mrco9m97-dbygsz/issues`) — HTTP 200 OK.
- Laws (`/matters/m-mrco9m97-dbygsz/laws`) — HTTP 200 OK.
- Arguments (`/matters/m-mrco9m97-dbygsz/arguments`) — HTTP 200 OK.
- Documents (`/matters/m-mrco9m97-dbygsz/documents`) — HTTP 500 (server error), could not render documents workspace during this run.

Notes: the HTTP 500s indicate a frontend runtime issue (missing module in `.next/server` runtime) rather than missing API data. Fixing the Next runtime problem is required before reliably using UI pages for demos.

2) Quantity vs database (consistency)
- Counts from API (direct DB-backed endpoints) for `m-mrco9m97-dbygsz` during the audit:
  - documents: 3
  - evidence: 8
  - facts: 13
  - issues: 6
  - laws: 13
  - arguments: 11
- These counts reflect the authoritative DB via the backend API; for the pages that responded 200, the UI should render the same counts if server runtime is healthy. For pages that returned 500, UI rendering failed and cannot be validated visually.

3) Demo/mock copy presence
- Global matter list contains many `mock-` and `test-` matters (fixtures). These appear in the API matter list and will surface in the UI Matter List, cluttering demo selection.
- For the target matter `m-mrco9m97-dbygsz` itself, resource content (evidence/facts/issues/laws/arguments) appears to be real, not demo/mocked text.

4) Empty-state anomalies
- `Documents` API returns 3 draft documents with `content = null` and `content_uri = ""`. This is an empty-draft anomaly previously analyzed in M136.x.
- Because the Documents page returned HTTP 500 in this run, we could not confirm how these empty drafts would appear visually; historically they were rendered as a placeholder (e.g., a dash or empty box). This is a UX risk for demos.

5) Documents: presence of 3 empty drafts (explicit)
- Confirmed: the backend returns three documents for `m-mrco9m97-dbygsz` whose `content` is null and `content_uri` is empty. Document ids (examples):
  - `doc-mrcoa92p-pmhpx4` (title: 诉讼策略建议) — content null
  - `doc-mrcoa92n-ukztrc` (title: 证据清单) — content null
  - `doc-mrcoa92k-04lifh` (title: 起诉状) — content null
- These are historical empty drafts; they will appear in any API-driven listing unless filtered or archived.

6) Does this affect demo readiness?
- Yes. Primary concerns:
  - UI availability: `Matter List`, `Matter Overview`, and `Documents` pages returned 500 during this audit — the frontend runtime must be fixed before a reliable demo.
  - Matter List clutter: the presence of many `mock-` matters will make it harder to locate demo-ready matters; consider filtering or using a dedicated demo-only workspace.
  - Empty documents: the three empty drafts may confuse viewers if shown in the Documents workspace; options: hide them from demo view, soft-archive them, or choose a different matter for demo.
- Resources that rendered OK (Evidence, Facts, Issues, Laws, Arguments) appear to contain meaningful content and are demo-usable if the UI runtime is fixed.

Recommendations (short)
- Immediate (short-term) demo prep:
  1. Use a clean matter for demos (create a dedicated `demo` matter free of mock fixtures and empty docs) OR apply a UI filter to hide `mock-` matters and `content IS NULL` documents for the demo session.
  2. Fix Next.js server runtime error before scheduling any public demo — this prevents 500s on core navigation pages.
- Medium-term:
  - Follow M137.1 recommended path (soft-archive empty historical documents), then hide archived docs in UI by default; maintain an audit log for records.

Artifacts (local captures)
- API responses saved to `/tmp/m138_documents.json`, `/tmp/m138_evidence.json`, `/tmp/m138_facts.json`, `/tmp/m138_issues.json`, `/tmp/m138_laws.json`, `/tmp/m138_arguments.json`.
- Frontend page headers and HTML saved under `/tmp/m138_pages/` (includes headers and HTML snippets; 500 error pages contain server stack traces). These can be used for debugging Next runtime issues.

Suggested Demo Checklist (actionable)
- Ensure Next runtime is healthy (resolve missing module error) and verify `Matter List` and `Documents` pages render.
- Either hide mock/test matters from list or prepare a dedicated demo matter id with curated content.
- Optionally soft-archive empty documents for demo viewers (non-destructive) or exclude them via query param or a demo-mode filter.

Appendix: Commands used in audit (local)

- API queries:
  curl "http://localhost:4000/matters/m-mrco9m97-dbygsz/documents"
  curl "http://localhost:4000/matters/m-mrco9m97-dbygsz/evidence"
  curl "http://localhost:4000/matters/m-mrco9m97-dbygsz/facts"
  curl "http://localhost:4000/matters/m-mrco9m97-dbygsz/issues"
  curl "http://localhost:4000/matters/m-mrco9m97-dbygsz/laws"
  curl "http://localhost:4000/matters/m-mrco9m97-dbygsz/arguments"

- Page checks (saved to `/tmp/m138_pages/`):
  curl -I http://localhost:3000/matters
  curl http://localhost:3000/matters/m-mrco9m97-dbygsz/documents


Prepared by: automated audit run

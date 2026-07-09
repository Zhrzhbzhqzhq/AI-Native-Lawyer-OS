# Database Integrity Audit Report — M136.1

Date: 2026-07-09
Target database: postgresql://qingzhang@localhost:5432/lawdesk
Target matter: m-mrco9m97-dbygsz

**检查范围**
- Prisma schema: packages/database/prisma/schema.prisma
- Backend services/routes touching Matter/Material/Evidence/Fact/Issue/Law/Argument/Document: scanned `apps/backend/src/services/*` and `apps/backend/src/routes/matterRoutes.ts` and related repositories
- Database public schema tables in the running Postgres instance: checked all public tables and focused on `matters`, `materials`, `evidence`, `documents`, `facts`, `issues`, `laws`, `arguments`, `workspaces`, `fact_evidence`, `issue_fact`, `fact_evidence`, `ai_records`, `knowledge`, `timelines`, `tasks`, `clients`.

Important: this audit is read-only — no schema changes, no data writes, no migrations performed.

---

**执行的 SQL（只读）**

The exact SQL executed (copy of the script run against the DB):

```
-- List tables
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;

-- Tables that have matter_id column
SELECT table_name FROM information_schema.columns WHERE column_name='matter_id' AND table_schema='public' ORDER BY table_name;

-- Orphan checks: records with matter_id not in matters
SELECT count(*) FROM materials WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM evidence WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM documents WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM facts WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM issues WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM laws WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM arguments WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM tasks WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM ai_records WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM knowledge WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM workspaces WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM clients WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);
SELECT count(*) FROM timelines WHERE matter_id IS NOT NULL AND matter_id NOT IN (SELECT matter_id FROM matters);

-- Document references to material/evidence/argument
SELECT count(*) FROM documents d LEFT JOIN materials m ON d.material_id = m.material_id WHERE d.material_id IS NOT NULL AND m.material_id IS NULL;
SELECT count(*) FROM documents d LEFT JOIN evidence e ON d.evidence_id = e.evidence_id WHERE d.evidence_id IS NOT NULL AND e.evidence_id IS NULL;
SELECT count(*) FROM documents d LEFT JOIN arguments a ON d.argument_id = a.argument_id WHERE d.argument_id IS NOT NULL AND a.argument_id IS NULL;

-- FactEvidence and IssueFact referential integrity
SELECT count(*) FROM fact_evidence fe LEFT JOIN facts f ON fe.fact_id = f.fact_id LEFT JOIN evidence e ON fe.evidence_id = e.evidence_id WHERE f.fact_id IS NULL OR e.evidence_id IS NULL;
SELECT count(*) FROM issue_fact ift LEFT JOIN issues i ON ift.issue_id = i.issue_id LEFT JOIN facts f2 ON ift.fact_id = f2.fact_id WHERE i.issue_id IS NULL OR f2.fact_id IS NULL;

-- Uniqueness checks
SELECT count(*) FROM (SELECT matter_id, COUNT(*) FROM matters GROUP BY matter_id HAVING COUNT(*)>1) t;
SELECT count(*) FROM (SELECT evidence_id, COUNT(*) FROM evidence GROUP BY evidence_id HAVING COUNT(*)>1) t;
SELECT count(*) FROM (SELECT document_id, COUNT(*) FROM documents GROUP BY document_id HAVING COUNT(*)>1) t;
SELECT count(*) FROM (SELECT fact_id, COUNT(*) FROM facts GROUP BY fact_id HAVING COUNT(*)>1) t;
SELECT count(*) FROM (SELECT issue_id, COUNT(*) FROM issues GROUP BY issue_id HAVING COUNT(*)>1) t;
SELECT count(*) FROM (SELECT argument_id, COUNT(*) FROM arguments GROUP BY argument_id HAVING COUNT(*)>1) t;

-- NULL anomalies (matter_id required fields)
SELECT count(*) FROM materials WHERE matter_id IS NULL;
SELECT count(*) FROM evidence WHERE matter_id IS NULL;
SELECT count(*) FROM documents WHERE matter_id IS NULL;
SELECT count(*) FROM facts WHERE matter_id IS NULL;
SELECT count(*) FROM issues WHERE matter_id IS NULL;
SELECT count(*) FROM laws WHERE matter_id IS NULL;
SELECT count(*) FROM arguments WHERE matter_id IS NULL;
SELECT count(*) FROM workspaces WHERE matter_id IS NULL;

-- Empty documents (no content and no content_uri)
SELECT count(*) FROM documents WHERE (content IS NULL OR trim(content)='') AND (content_uri IS NULL OR trim(content_uri)='');
SELECT * FROM documents WHERE (content IS NULL OR trim(content)='') AND (content_uri IS NULL OR trim(content_uri)='') LIMIT 50;

-- Duplicate documents by matter_id + title
SELECT count(*) FROM (SELECT matter_id, title, COUNT(*) FROM documents GROUP BY matter_id, title HAVING COUNT(*)>1) t;
SELECT matter_id, title, COUNT(*) as cnt FROM documents GROUP BY matter_id, title HAVING COUNT(*)>1 ORDER BY cnt DESC LIMIT 50;

-- Workspace references
SELECT count(*) FROM workspaces w LEFT JOIN documents d ON w.document_id = d.document_id WHERE w.document_id IS NOT NULL AND d.document_id IS NULL;
SELECT count(*) FROM workspaces w LEFT JOIN materials m ON w.material_id = m.material_id WHERE w.material_id IS NOT NULL AND m.material_id IS NULL;
SELECT count(*) FROM workspaces w LEFT JOIN evidence e ON w.evidence_id = e.evidence_id WHERE w.evidence_id IS NOT NULL AND e.evidence_id IS NULL;
SELECT count(*) FROM workspaces w LEFT JOIN ai_records a ON w.ai_record_id = a.ai_record_id WHERE w.ai_record_id IS NOT NULL AND a.ai_record_id IS NULL;

-- Target matter counts
SELECT count(*) FROM materials WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM evidence WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM documents WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM facts WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM issues WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM laws WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM arguments WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM workspaces WHERE matter_id='m-mrco9m97-dbygsz';
SELECT count(*) FROM ai_records WHERE matter_id='m-mrco9m97-dbygsz';

-- Potential orphans for documents in target matter
SELECT doc.document_id, doc.title FROM documents doc LEFT JOIN materials m ON doc.material_id = m.material_id WHERE doc.matter_id='m-mrco9m97-dbygsz' AND doc.material_id IS NOT NULL AND m.material_id IS NULL LIMIT 50;
SELECT doc.document_id, doc.title FROM documents doc LEFT JOIN evidence e ON doc.evidence_id = e.evidence_id WHERE doc.matter_id='m-mrco9m97-dbygsz' AND doc.evidence_id IS NOT NULL AND e.evidence_id IS NULL LIMIT 50;
SELECT doc.document_id, doc.title FROM documents doc LEFT JOIN arguments a ON doc.argument_id = a.argument_id WHERE doc.matter_id='m-mrco9m97-dbygsz' AND doc.argument_id IS NOT NULL AND a.argument_id IS NULL LIMIT 50;
```

---

**检查结果摘要（关键项）**

- Tables scanned: (public schema) `_prisma_migrations`, `ai_records`, `arguments`, `clients`, `documents`, `evidence`, `execution_queue_item`, `fact_evidence`, `facts`, `issue_fact`, `issues`, `knowledge`, `laws`, `materials`, `matters`, `system_configurations`, `system_dictionary`, `system_enums`, `tasks`, `timelines`, `workflow_events`, `workspaces`.

- Orphan records (rows with matter_id pointing to non-existent matter): none found for these tables (materials, evidence, documents, facts, issues, laws, arguments, tasks, ai_records, knowledge, workspaces, clients, timelines) — all counts = 0.

- Document reference integrity: documents with non-null `material_id`, `evidence_id`, or `argument_id` that reference missing rows: none found (all counts = 0).

- FactEvidence / IssueFact referential integrity: no orphan rows (counts = 0).

- Uniqueness of ids: no duplicated `matter_id`, `evidence_id`, `document_id`, `fact_id`, `issue_id`, or `argument_id` (counts = 0).

- NULL anomalies: required `matter_id` columns are not NULL in the checked tables (counts = 0).

- Empty documents: 908 documents were found where both `content` and `content_uri` are empty/null.
  - Sample (first rows returned, fields: id | document_id | matter_id | material_id | evidence_id | argument_id | title | document_type | version | content_uri | content | status | created_at | updated_at):

    - 5a3bf8a8-98cb-4c2c-94c1-1e2f19aeeaaa | doc-mr62f93j-fome0p | mock-intake-1783151601099-confirm-doc | (material_id empty) | (evidence_id empty) | (argument_id empty) | (title: op.pdf) | challenge_opinion | v1 | (content_uri empty) | (content empty) | draft | 2026-07-04 07:53:21.11 | 2026-07-04 07:53:21.11

    - 53ad40c2-2b50-4396-8529-cf3e941ab178 | test-doc-1783043503030-22iy94-1783043503137 | test-matter-1783043503030-22iy94 | ... | title: Doc 1 | status draft | created 2026-07-03 01:51:43.139

    - (many similar rows — report includes the first 50 rows returned by the query)

- Duplicate documents by (matter_id, title): 4 duplicate groups found. Samples:
  - matter `m-mrcdpaea-gdj049` title `heading` — 4 records
  - matter `m-mrcdpaea-gdj049` title `paragraph` — 2 records
  - matter `m-mrcdpaea-gdj049` title `field` — 2 records
  - matter `m-mrcdpaea-gdj049` title `item` — 2 records

- Workspace references: no workspace foreign keys pointing to missing documents/materials/evidence/ai_records (all counts = 0).

- Target matter (`m-mrco9m97-dbygsz`) resource counts (current):
  - materials: 1
  - evidence: 8
  - documents: 3
  - facts: 13
  - issues: 6
  - laws: 13
  - arguments: 11
  - workspaces: 0
  - ai_records: 0

---

**是否发现异常**
- Yes: 2 categories of notable exceptions detected:
  1. Large number of empty documents (908 rows where both `content` and `content_uri` are empty/null).
  2. Duplicate documents grouped by (matter_id, title) for at least one matter (4 groups found; top example `m-mrcdpaea-gdj049`).

All other integrity checks (orphan matter references, FK existence checks for document -> material/evidence/argument, fact_evidence/issue_fact referential integrity, uniqueness of key id fields, required `matter_id` NULLs) returned no anomalies.

---

**异常记录明细（样本）**
- Empty documents: total 908. First 20 sample rows (id | document_id | matter_id | title | document_type | version | status | created_at):

(see query results captured in runtime; sample entries include document IDs such as `doc-mr62f93j-fome0p`, `test-doc-1783043503030-22iy94-1783043503137`, `doc-mr62fa88-2d2dge`, ...). Full first-50 result set was captured during the audit and is available on request.

- Duplicate document groups (matter_id | title | count):
  - m-mrcdpaea-gdj049 | heading | 4
  - m-mrcdpaea-gdj049 | paragraph | 2
  - m-mrcdpaea-gdj049 | field | 2
  - m-mrcdpaea-gdj049 | item | 2

If you want the exact row ids for these duplicate groups, I can list them next (read-only).

---

**风险分级（建议）**
- Empty documents (908 rows): Risk = High (Operational / UX & storage). Rationale: documents with neither stored content nor a `content_uri` likely represent incomplete creations or failed ingestion. They may confuse users (show empty list entries), waste index/storage, and indicate upstream input problems.

- Duplicate documents by (matter_id, title): Risk = Medium. Rationale: duplicates may be benign (intended versions) or symptomatic of repeated imports / double-creates. Investigate to determine whether duplicates are identical drafts (safe) or accidental.

- All other checks: Risk = Low — no broken foreign-key references or duplicate primary identifiers were detected.

---

**是否建议修复**
- Yes, suggested fixes (non-actionable recommendations; DO NOT APPLY CHANGES IN THIS AUDIT):
  1. Investigate the 908 empty documents: determine origin (ingest pipeline, intake UI, tests). Consider backfilling `content` from external sources if available, or marking them as `deleted`/`archived` after business verification. Add application-layer validation to avoid creating documents without content and without content_uri if that is undesired.
  2. Inspect duplicate document groups for the matter `m-mrcdpaea-gdj049`: list exact rows, compare timestamps and content to decide whether to deduplicate or keep (for versioning). If duplicates are unintended, schedule dedupe with backups.
  3. Optionally add monitoring / periodic integrity checks to detect bulk empty-document creation spikes.
  4. Consider adding stronger application-level guards for document creation (title + either content or content_uri required), and/or database constraints if appropriate after business sign-off.

---

**下一步建议（优先级排序）**
1. Triage empty documents: sample by creation time and source; identify when creation spikes happened and which service/user caused them. (High priority)
2. For duplicates, produce a detailed list and diff to determine deduplication strategy. (Medium)
3. Add a one-off export (CSV) of the 908 empty document rows for stakeholder review and archival before any deletion. (High)
4. Add alerts or a nightly job to surface empty-document counts and duplicate groups. (Low/Medium)
5. If desired, I can produce the exact lists (all 908 ids or duplicates groups) in a follow-up read-only step.

---

Audit performed by: automated read-only checks executed from the project workspace on 2026-07-09.

If you want, I can now:
- produce the full list of the 908 empty document ids (read-only), or
- produce per-duplicate-group row details, or
- start the post-audit commands (frontend/backend build + ./scripts/check.sh + git status) — I will run those next if you confirm.


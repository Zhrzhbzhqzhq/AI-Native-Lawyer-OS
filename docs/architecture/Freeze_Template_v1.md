# Freeze Template v1

Use this template for all Architecture Freeze documents. Keep entries short and factual.

## Freeze Metadata
- Status: (Draft | Frozen | Deprecated)
- Version: vX.Y
- Architecture Level: (L0 | L1 | L2 | L3 | L4)
- Workspace: (if applicable)
- Depends On: (other freeze docs or modules)
- Implements: (high level features or rules)
- Last Updated: YYYY-MM-DD

## Purpose
Concise statement of why this freeze exists and what it protects.

## Scope
High-level scope statement.

## In Scope
Bulleted list of what is included in this freeze.

## Out of Scope
Bulleted list of items explicitly excluded.

## Read-only Boundary
Describe read-only guarantees: what the frozen surface may and may not do regarding writes.

## AI Boundary
Describe allowed AI behaviors (rule-based / LLM experimental / approval required).

## Future Milestones
List planned follow-ups (e.g. M15.1.2 navigation, M15.1.3 relationships).

## Review Result
Summary verdict and any blockers for unfreezing/changing.

---

Keep freeze documents short and link to implementation notes or tests where appropriate. All freeze documents must live under `docs/architecture` and be referenced in `README.md`.

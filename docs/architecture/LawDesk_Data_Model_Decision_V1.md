# LawDesk Data Model Decision V1

## Purpose
Based on Audit Round 1, this document finalizes V1 data object boundaries for LawDesk to keep the system matter-centric, small, and resistant to ERP-style expansion.

## Decision 1: Matter
- Matter is the only business aggregate root in V1.
- All core objects must belong to a Matter.
- Do not introduce ERP roots such as firm, team, department, or approval hierarchy in V1.

## Decision 2: Material
- Material means raw source materials.
- Includes recordings, PDFs, images, WeChat chats, contracts, and scanned files.
- Material is not Evidence.
- Material only stores source, type, storage location, and status metadata.

## Decision 3: Evidence
- Evidence means legal proof objects.
- Evidence can be extracted from Material.
- Evidence must serve a proof purpose.
- Evidence does not carry raw file semantics.

## Decision 4: Document
- Document means lawyer-authored legal documents.
- Includes complaint, defense, legal memo, letter, and hearing outline.
- Document is not Knowledge.

## Decision 5: Knowledge
- Knowledge means reusable knowledge, research conclusions, and adjudication rules.
- Database naming remains Knowledge.
- Product UI may display Research.
- Documentation must explicitly state: Research UI maps to Knowledge DB.

## Decision 6: Timeline
- Timeline is lawyer-visible matter chronology.
- Timeline is for lawyer understanding of case progress.
- Timeline is a business-facing narrative layer.

## Decision 7: WorkflowEvent
- WorkflowEvent is internal system runtime/workflow event.
- It is not direct primary content for lawyer-facing main workspace.
- It serves runtime automation and state tracking.

## Decision 8: ActionProposal
- ActionProposal remains runtime/in-memory in V1.
- It does not enter Prisma in V1.
- Persist only when cross-session durability, audit, or analytics become required.

## Decision 9: Conversation
- V1 does not introduce a standalone Conversation table.
- Conversation remains under AiRecord in V1.
- Split into dedicated model later only if conversation becomes a core first-class object.

## Decision 10: Workspace
- Workspace stores UI state only.
- Workspace must not carry business logic.
- Workspace must not become a new business aggregate.

## Guardrails
- Keep Matter-centric architecture as the single business center.
- Keep boundaries strict between Material/Evidence, Document/Knowledge, Timeline/WorkflowEvent.
- Keep human-in-the-loop design for all critical legal decisions.
- Prevent ERP drift by avoiding organization-centric root entities in V1.

## Decision Summary JSON
```json
{
  "matterDecision":"PASS",
  "materialEvidenceBoundary":"PASS",
  "documentKnowledgeBoundary":"PASS",
  "timelineEventBoundary":"PASS",
  "actionProposalDecision":"PASS",
  "conversationDecision":"PASS",
  "workspaceDecision":"PASS",
  "erpRiskControlled":"PASS",
  "recommendedFixScope":"docs-only",
  "finalDataModelDecisionStatus":"PASS"
}
```

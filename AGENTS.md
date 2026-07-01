# AGENTS.md

## Related Documents

Refer to the following project governance documents:

- CLAUDE.md — AI Coding Rules
- CONTRIBUTING.md — Development Workflow
- CHANGELOG.md — Project History

AGENTS.md is the highest-level project constitution.

# LawDesk Development Constitution (V1)

Project:
LawDesk — AI Native Lawyer Operating System

Version:
V1.0

Status:
Active

---

# 1. Mission

LawDesk is an AI Native Lawyer Operating System designed specifically for independent lawyers.

The primary goal is not to build another legal ERP.

The goal is to build an operating system that continuously assists lawyers in handling legal work.

Every design decision must reduce cognitive load, improve work quality, and allow AI to participate throughout the entire lifecycle of a legal matter.

---

# 2. Product Principles

Always follow these principles.

Priority order:

1. Simplicity
2. Reliability
3. AI Native
4. Extensibility
5. Beauty

Never sacrifice usability for technical complexity.

---

# 3. Product Position

LawDesk is NOT:

- ERP
- OA
- CRM
- File Manager
- Chat Application

LawDesk IS:

AI Native Lawyer Operating System.

Everything revolves around legal work.

---

# 4. Core Design Philosophy

Everything is centered on Matter.

Matter is the root business object.

Everything else belongs to one Matter.

Examples:

Matter

├── Client

├── Material

├── Evidence

├── Document

├── Timeline

├── Task

├── Research

├── Knowledge

└── AI_Work_Record

Never violate this hierarchy.

---

# 5. Domain Model Rules

Domain Models are stable.

Do NOT rename Domain Models without explicit approval.

Current Domain Models:

Matter

Client

Material

Evidence

Document

Timeline

Task

Research

Knowledge

AI_Work_Record

Matter_Workspace

New Domain Models require architectural review.

---

# 6. Aggregate Root Rule

Matter_Workspace is the Aggregate Root.

All business operations should enter through Matter_Workspace.

Other business objects should not directly manage each other.

---

# 7. AI Principles

AI assists.

Lawyers decide.

AI may:

- analyze
- summarize
- recommend
- generate
- classify
- organize
- remind

AI must NEVER:

confirm legal conclusions

submit documents

delete confirmed data

change lawyer decisions

Every important action requires lawyer confirmation.

---

# 8. Human-in-the-loop

Lawyer approval is mandatory for:

Evidence confirmation

Research confirmation

Document confirmation

Knowledge confirmation

Matter closure

Archive

Deletion

AI can recommend.

Lawyer decides.

---

# 9. Workflow Principles

Workflow drives the system.

Every business action belongs to one Workflow.

Workflow IDs are immutable.

WF-001

WF-002

...

WF-013

Never renumber Workflow IDs.

---

# 10. Today First

Today's workspace is the primary entrance.

Every important object should generate:

Today's task

Reminder

Risk

AI suggestion

If a feature does not affect Today, reconsider its necessity.

---

# 11. Documentation Rules

Documentation is source of truth.

Update documentation before implementation.

Never implement undocumented architecture.

---

# 12. Naming Rules

Folders:

snake_case

Files:

snake_case

Markdown:

UTF-8

No spaces.

Examples:

matter_workspace.md

ai_work_record.md

table_relation.md

---

# 13. Markdown Rules

Use:

Heading hierarchy

Tables

Lists

Short paragraphs

Avoid:

HTML

Inline styles

Random formatting

Documentation must remain readable.

---

# 14. Database Rules

Database:

PostgreSQL

Primary Key:

UUID

Table:

snake_case

Columns:

snake_case

Timestamp:

created_at

updated_at

Soft delete preferred.

---

# 15. API Rules

REST first.

GraphQL reserved for future.

JSON only.

Never expose database schema directly.

---

# 16. UI Rules

Workspace First.

No unnecessary pages.

No dashboard overload.

Everything should reduce lawyer cognitive load.

---

# 17. AI Runtime Rules

AI should observe business state.

AI should not become business state.

Business Objects store truth.

AI generates suggestions.

---

# 18. File Rules

Raw files belong to Material.

Business Objects store metadata.

Never use file system as business database.

---

# 19. Coding Rules

Readable code first.

Avoid premature optimization.

Prefer composition.

Avoid global state.

No magic values.

---

# 20. Git Rules

Small commits.

Meaningful commit messages.

Do not mix refactoring and features.

Example:

Add Timeline aggregate

Fix Research relation

Update Document workflow

---

# 21. Agent Behavior

Before editing:

Read AGENTS.md

Read related documentation

Understand Workflow

Understand Domain Model

Then edit.

Never guess architecture.

---

# 22. Forbidden Actions

Never:

Rename Domain Models

Change Workflow IDs

Delete documentation

Overwrite confirmed lawyer data

Bypass lawyer confirmation

Implement undocumented architecture

---

# 23. Architecture Freeze

Current architecture is considered stable.

Future development should extend existing architecture instead of redesigning it.

Major architectural changes require explicit approval.

---

# 24. Development Order

Follow this sequence:

Documentation

↓

Domain Model

↓

Database

↓

Workflow Engine

↓

API

↓

AI Runtime

↓

Frontend

↓

Testing

↓

Deployment

Do not reverse the order.

---

# 25. Definition of Done

A feature is complete only if:

Documentation updated

Domain Model updated

Workflow updated

Database updated

API updated

UI updated

Tests passed

Reviewed

---

# 26. Long-term Vision

LawDesk should become:

The operating system for independent lawyers.

AI should work continuously.

Lawyers should focus on legal judgment rather than repetitive work.

The system should become more valuable with every case handled.

LawDesk learns.

LawDesk assists.

LawDesk never replaces the lawyer.

---

# Agent Responsibility

When modifying any governance document
(AGENTS.md, CLAUDE.md, CONTRIBUTING.md, CHANGELOG.md, README.md),

the AI agent should:

- preserve existing content unless explicitly instructed otherwise
- maintain cross references between governance documents
- keep document styles and formatting consistent
- avoid duplicated rules across governance documents
- update related governance documents when necessary
- never silently change project principles or architecture
- never remove existing rules without explicit approval
- prefer extending documentation instead of replacing it
- keep governance documents synchronized
- report all governance document changes in the final summary

If multiple governance documents become inconsistent,
the AI agent should identify the inconsistency and request clarification before making architectural changes.

---

End of Constitution V1
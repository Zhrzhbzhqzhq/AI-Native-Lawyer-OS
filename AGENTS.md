# AGENTS.md

# LawDesk Development Constitution

Project:
LawDesk — AI Native Lawyer Operating System

Version:
1.0.0

Status:
Production

Last Updated:
2026-07-01

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

# 5.1 Domain Ownership

Each business object owns its own lifecycle.

Business objects should not directly own or mutate other business objects.

All coordination happens through Matter_Workspace.

Matter_Workspace is responsible for aggregating:

- Matter
- Client
- Material
- Evidence
- Document
- Timeline
- Task
- Research
- Knowledge
- AI_Work_Record

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

# 11.1 Documentation Priority

When documents conflict, follow this priority:

1. AGENTS.md
2. docs/07_Development
3. docs/03_Data_Model
4. docs/02_Workflow
5. Source Code

Documentation is the single source of truth.

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

---

# 19. Coding Rules

Coding must be pragmatic and consistent.

Keep modules focused, maintainable, and aligned with existing architecture.

---

# 19.1 AI Coding Rules

AI Agents must:

- extend existing modules before creating new ones
- follow existing naming conventions
- keep implementations simple
- avoid unnecessary abstractions
- avoid unrelated refactoring
- never introduce new architecture without approval

---

# 20. Git Rules

Git commits should be clear, atomic, and traceable.

Use branches for features and fixes.

---

# 20.1 Commit Rules

Each commit should have:

- one feature
- one responsibility
- one clear purpose

Do not mix:

- refactor
- bug fix
- feature
- documentation

---

# 23. Architecture Freeze

Architecture decisions must be stable and reviewed before implementation.

---

# 23.1 Architecture Decision Rule

When uncertain:

- do not invent
- do not guess
- stop implementation
- ask for clarification

If architecture is unclear, implementation must pause.

---

End of Constitution V1

# CLAUDE.md

## Before Coding

Before writing or modifying any code:

1. Read AGENTS.md.
2. Follow the project architecture.
3. Follow the Domain Model.
4. Follow the Workflow documentation.

If architecture is unclear, stop and ask.

# LawDesk AI Coding Rules

Project:
LawDesk — AI Native Lawyer Operating System

Status:
Production

Version:
1.0.0

Last Updated:
2026-07-01

---

# Purpose

This document defines coding rules for all AI coding assistants, including:

- Claude Code
- Codex
- Cursor
- Gemini CLI
- Future AI Agents

Always read AGENTS.md before making architectural decisions.

---

# General Rules

Always:

- follow AGENTS.md
- follow project documentation
- understand the related Domain Model
- understand the related Workflow
- implement the simplest correct solution

Never:

- invent architecture
- bypass documentation
- rename Domain Models
- renumber Workflow IDs

---

# Coding Style

Prefer:

- TypeScript
- Functional Programming
- Composition over Inheritance
- Small functions
- Clear naming

Avoid:

- Global state
- Magic numbers
- Duplicate logic
- Deep nesting
- Over engineering

---

# Architecture Rules

Never create new architecture without approval.

Always extend existing architecture first.

Current architecture is considered stable.

If architecture is unclear:

STOP.

Ask.

---

# Domain Rules

Business Objects are immutable in meaning.

Current Domain Models:

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
- Matter_Workspace

Do not rename them.

---

# Workflow Rules

Every business action belongs to one Workflow.

Workflow IDs are immutable.

WF-001

↓

WF-013

Never renumber.

---

# Database Rules

Database:

PostgreSQL

Primary Key:

UUID

Naming:

snake_case

Timestamp:

created_at

updated_at

Prefer soft delete.

---

# API Rules

REST First.

JSON only.

Never expose database schema directly.

---

# Frontend Rules

Workspace First.

Reduce cognitive load.

No unnecessary pages.

No unnecessary dialogs.

---

# AI Rules

AI generates.

Lawyer decides.

AI may:

- summarize
- classify
- recommend
- organize
- draft

AI may NOT:

- confirm legal conclusions
- delete confirmed data
- submit legal documents

---

# Documentation Rules

Documentation is source of truth.

Update documentation before implementation.

Never implement undocumented architecture.

---

# Testing Rules

Every feature should include:

- happy path
- edge cases
- regression test

---

# Commit Rules

One feature.

One commit.

One purpose.

Avoid mixing:

- refactor
- feature
- fix
- documentation

---

# Final Rule

If uncertain:

Do not guess.

Ask.

Follow AGENTS.md.

End of CLAUDE.md
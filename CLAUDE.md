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

Documentation Style Guide

- Terminology Convention
  1. 专有术语第一次出现时采用：
     中文（English）
     例如：
     - 生命周期事件（Lifecycle Events）
     - 业务状态来源（Source of Truth）
     - 工作流（Workflow）
     - 案件（Matter）
  2. 同一文档后续再次出现时，可直接使用英文术语。
  3. 已在整个 LawDesk 中固定命名的对象保持英文：
     - Matter
     - Workflow
     - Today
     - Timeline
     - Workspace
     - AI Runtime
     - Dashboard
     - Overview
     不得混用多个英文名称。

- Freeze Conclusion Template
  所有已冻结（Frozen）规范文档统一采用以下结尾：

  该文档定义 LawDesk V1 <Module> 官方规范。

  本规范自 V1 起正式冻结。

  Database、API、Workflow、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

  任何业务规则修改必须进入 V2。

  其中 <Module> 根据实际模块自动替换。

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
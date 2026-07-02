# LawDesk

# AI Native Lawyer Operating System

> The Operating System for Independent Lawyers

---

## Project Status

Current Phase:

✅ Documentation Baseline Frozen (2026-07-01)

Next Phase:

→ Database Schema Development

## Vision

LawDesk is an AI Native Lawyer Operating System designed specifically for independent lawyers.

It is not another legal ERP.

It is not a document management system.

It is not a chat application.

LawDesk is an operating system where AI continuously assists lawyers throughout the entire lifecycle of legal work.

The lawyer remains the decision maker.

AI becomes the long-term professional assistant.

---

# Project Goals

LawDesk aims to:

- Reduce repetitive legal work
- Improve legal work quality
- Organize every legal matter
- Continuously accumulate professional knowledge
- Make AI participate in the complete legal workflow

---

# Core Principles

- AI Native
- Documentation First
- Workflow Driven
- Domain Model Driven
- Human in the Loop
- Workspace First
- Simplicity over Complexity

---

# Project Structure

```
AI-Native-Lawyer-OS/

├── AGENTS.md
├── CLAUDE.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── README.md
│
├── ai/
├── api/
├── backend/
├── database/
├── docs/
├── frontend/
├── prompts/
├── scripts/
├── tests/
└── workflows/
```

---

# Project Governance

- AGENTS.md — Project Constitution
- CLAUDE.md — AI Coding Rules
- CONTRIBUTING.md — Development Workflow
- CHANGELOG.md — Project History

# Recommended Reading Order

1. README.md
2. AGENTS.md
3. CLAUDE.md
4. CONTRIBUTING.md
5. docs/README.md
6. docs/06_Architecture
7. docs/03_Data_Model
8. docs/02_Workflow
9. docs/07_Development

# Development Roadmap

- ✅ Documentation
- ✅ Domain Model
- ✅ Workflow
- ✅ Architecture
- 🔄 Database Schema
- ⏳ API
- ⏳ AI Runtime
- ⏳ Frontend
- ⏳ Testing
- ⏳ Deployment

---

# Documentation

Project documentation is located under:

```
docs/
```

Documentation includes:

```
01_Architecture
02_Workflow
03_Data_Model
04_UI_UX
05_AI
06_Architecture
07_Development
```

Documentation is the source of truth.

---

# Domain Model

Current core business objects:

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

Matter is the core business object.

Matter_Workspace is the Aggregate Root.

---

# Workflow

Business processes are organized by Workflow.

Current workflows:

- WF-001 Consultation
- WF-002 Matter Initialization
- WF-003 Material Processing
- WF-004 Evidence Management
- WF-005 Legal Research
- WF-006 Legal Analysis
- WF-007 Document Generation
- WF-008 Trial Preparation
- WF-009 Hearing & Post-hearing
- WF-010 Matter Progress
- WF-011 Closing
- WF-012 Review
- WF-013 Knowledge

Workflow IDs are immutable.

---

# Technology Stack

Current stack:

Frontend

- React
- TypeScript

Backend

- FastAPI

Database

- PostgreSQL

AI

- OpenAI
- MiniMax
- Future Multi-model Runtime

Deployment

- Docker
- Vercel
- Local Development

---

# Development Order

The project follows this sequence:

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

---

# Project Governance

The project is governed by the following documents.

## AGENTS.md

Project Constitution.

Defines architecture, development principles and product rules.

---

## CLAUDE.md

AI Coding Rules.

Defines coding conventions for AI coding assistants.

---

## CONTRIBUTING.md

Development workflow.

Defines how contributors should work together.

---

## CHANGELOG.md

Project history.

Records notable changes and version evolution.

---

# Getting Started

Clone the repository:

```bash
git clone <repository>
```

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

(Implementation will be completed in future versions.)

---

# Roadmap

Version 1.0

- Architecture
- Workflow
- Domain Model
 
Terminology clarification:

- Domain Model = 业务领域对象模型（Business Entity Model）。
- Data Model = 数据库 / Schema 层的数据结构设计，仅在 Database 或 Schema 语境下使用。

LawDesk V1 默认使用 Domain Model 表示 Matter、Client、Evidence、Document、Task 等业务对象。

Version 1.1

- PostgreSQL Schema
- REST API

Version 1.2

- Matter Workspace
- Today Dashboard
- AI Runtime

Version 2.0

- Public Beta

---

# Philosophy

AI works continuously.

Lawyers make decisions.

Knowledge accumulates over time.

Every completed matter makes LawDesk smarter.

---

# License

Copyright © 2026

All Rights Reserved.

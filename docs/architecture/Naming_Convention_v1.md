# Naming Convention v1

This document defines common naming rules used across LawDesk architecture docs and code.

## General Guidelines
- Use `snake_case` for database identifiers, filenames, and API paths.
- Use `camelCase` for JSON payload keys and JS/TS variables.
- Use `PascalCase` for classes, runtimes, and component names.

## Workspace Naming
- Matter Workspace
- Evidence Workspace
- Document Workspace
- Timeline Workspace
- Knowledge Workspace
- Task Workspace

## Runtime Naming
- Intake Runtime
- NextStep Engine
- Evidence Analysis Engine
- Missing Evidence Engine

## Object Naming
- Matter
- Material
- Evidence
- Document
- Timeline
- Knowledge
- Task

## API Naming Examples
- `GET /matters/:id/workspace`
- `GET /matters/:id/evidence/workspace`
- `POST /intake/...`

## File and Doc Naming
- Freeze docs: `M15_Evidence_Workspace_Architecture_Freeze_v1.md`
- Feature docs: `M15_1_2_Evidence_Navigation_Freeze_v1.md`

## Consistency
- Follow these conventions to make code and docs easier to navigate and audit.
- Document exceptions in the relevant Freeze document.

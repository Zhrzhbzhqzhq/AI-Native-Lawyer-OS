# Runtime Foundation v0.1.0

Completed: 2026-07-04

Git Commit: aeb2a74

Modules included

- Runtime
  - Context Runtime
  - Prompt Runtime
  - Planner Runtime
  - Proposal Runtime
  - Executor Runtime

- Matter Runtime
  - Snapshot Runtime
  - State Engine
  - Intelligence Engine

- Director
  - Runtime Director

- Event
  - Runtime Event Engine

- Workspace
  - Runtime Dashboard
  - Workspace Runtime Summary

Completed milestones

- M7
- M8
- M9
- M10.1

Architecture overview

The Runtime Foundation v0.1.0 provides an in-memory runtime stack for Matter-centric AI assistance. Core components live in `apps/backend/src/runtime/*` and include engines for building runtime context, planning actions, proposing actions, executing proposals, and emitting runtime events. The Runtime Director consumes snapshots and events to make decisions. The frontend surface provides a Runtime Dashboard and a Workspace Runtime Summary in `apps/frontend`.

Current API surface (read-only endpoints)

- `GET /runtime` — matter runtime snapshot and status
- `GET /director` — director decision and summary
- `GET /events` — list runtime events for a matter
- `GET /action-proposals` — list proposals for a matter

Known limitations

- Event Repository is in-memory and not persisted across process restarts.
- Proposal Repository is in-memory and intended for development/testing.
- Runtime Dashboard is a developer-facing UI; design and UX not finalized.
- No persistent Event Store (e.g., Kafka / PostgreSQL-backed event log).
- No AI Chief or orchestration service managing multiple Runtimes.
- Workspace UI does not auto-refresh; clients must refresh to see new events.

Next phase: Productization

- Replace in-memory repositories with durable stores.
- Add persistent event store and event sourcing support.
- Harden director decision rules and surface audit logs.
- Implement Workspace auto-refresh and real-time event stream.
- Add authentication/authorization checks for runtime APIs.

This document defines the initial Runtime Foundation for LawDesk and is intended as a snapshot for v0.1.0.

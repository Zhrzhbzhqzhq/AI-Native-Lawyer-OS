# Architecture Pyramid v1

LawDesk architecture can be visualized as a pyramid where each level builds on the one below it.

```
L0 Principles
↓
L1 Workspace
↓
L2 Runtime
↓
L3 Legal Objects
↓
L4 UI
```

## L0 Principles
Defines project-wide rules and constraints: Workspace Growth Model, Human-in-the-loop, Read-only First, Object First.

## L1 Workspace
Workspace-level products (Matter, Evidence, Document, Timeline, Knowledge, Task). Responsibilities: dashboard, navigation, object entry points and progressive enhancement.

## L2 Runtime
Runtime components and engines that provide derived data and suggestions: Intake Runtime, NextStep Engine, AI Analysis, Missing Evidence Engine, Automation Engine (future).

## L3 Legal Objects
The canonical business objects and their stable schemas: Matter, Material, Evidence, Document, Timeline, Knowledge, Task.

## L4 UI
Presentation patterns and components: Dashboard, Navigation, Detail views, AI Panels. UIs consume Workspace + Runtime + Objects to present lawyer-facing experiences.

Each layer has clear responsibilities and well-defined boundaries. Changes flow top-down: object/schema changes require review at L2/L0; UI enhancements should not bypass Workspace Growth rules.

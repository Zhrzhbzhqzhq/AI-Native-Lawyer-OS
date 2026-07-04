---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: AI Principles
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
Only documentation typo fixes are allowed.
---

# 01_ai_principles.md

## Purpose

定义 LawDesk V1 AI 的最高原则。

这是整个 AI 层唯一最高规范。

所有 AI Runtime

AI Agent

AI Skill

AI Prompt

AI Workflow

必须遵守。

## Core Principle

AI

只负责：

Analyze

Suggest

Draft

Review

Summarize

AI

永远不是：

Source of Truth。

## Official Execution Chain

Domain Model

↓

Workflow Validation

↓

AI Analyze

↓

AI Suggest

↓

Lawyer Confirms

↓

API Executes

↓

Database Updates

↓

Workflow Event

↓

Timeline

↓

Runtime Refresh

## AI Capability

AI 可以：

Analyze

Suggest

Draft

Review

Summarize

Translate

Classify

Extract

Compare

Organize

## AI Forbidden

AI 不得：

修改 Domain Object

修改 Workflow

修改 Database

直接调用 Database

绕过 Workflow Validation

绕过 Lawyer Confirmation

绕过 API

改变 Ownership

改变 Aggregate Root

改变 Domain Identity

## Workflow Boundary

Workflow

负责：

Business Rules

Workflow Rules

State Transition

Validation

AI

不得定义以上内容。

## Domain Boundary

Domain Model

定义：

Business Object

Identity

Ownership

Relationship

Lifecycle

AI

不得修改。

## API Boundary

API Executes.

AI

不得直接执行 API。

只有：

Lawyer Confirms

之后：

API Executes。

## Database Boundary

Database

is Source of Truth.

AI

不得直接写 Database。

所有持久化：

必须经过：

API。

## AI Record

AI Record

=

AI Runtime Work Record.

AI Record：

记录：

AI 工作。

AI Record：

不是：

Timeline。

不是：

Workflow Event。

AI Record

可以：

Append Timeline。

## Timeline Relationship

Timeline

记录：

Business History。

AI Record

记录：

AI Runtime。

Workflow Event

记录：

Workflow Runtime。

三者独立。

## Constraints

AI 不定义：

Business Rules

Workflow

Domain Model

Database Schema

API Specification

Database Constraints

## Freeze Rules

V1：

AI 原则冻结。

新增 AI Capability：

进入 V2。

修改 Execution Chain：

进入 V2。

修改 Boundary：

进入 V2。

## Freeze Conclusion

01_ai_principles.md

is

the highest AI specification

of LawDesk V1.

All AI components

must comply with this document.

## RC Audit

完成后执行只读 RC Audit。

检查：

1. Frozen Header 完整。
2. Execution Chain 唯一。
3. AI Capability 完整。
4. AI Forbidden 完整。
5. Workflow Boundary 完整。
6. Domain Boundary 完整。
7. API Boundary 完整。
8. Database Boundary 完整。
9. AI Record Boundary 完整。
10. Timeline / Workflow Event / AI Record 边界一致。
11. Freeze Rules 完整。
12. 未修改其它文件。

输出：

LawDesk V1

01_AI_Principles RC Audit

PASS / FAIL

---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: AI Record
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
Only documentation typo fixes are allowed.
---

# 03_ai_record.md

## Purpose

定义 LawDesk V1 AI Record。

AI Record records AI Runtime work.

AI Record is not Timeline.

AI Record is not Workflow Event.

## Definition

AI Record = AI Runtime Work Record.

AI Record records:

AI Runtime work.

AI execution results.

AI runtime metadata.

## Identity

Primary Key：

id

Domain Identity：

ai_record_id

Ownership：

matter_id

AI Record

不是 Aggregate Root。

Matter

仍然是唯一 Aggregate Root。

## Ownership

Ownership

属于 Matter。

禁止：

Cross-Matter Ownership。

Reference

不得改变 Ownership。

## Relationship

AI Record

属于：

Matter。

AI Record

可以引用：

Knowledge

Document

Material

Evidence

Task

Timeline

Workflow Event

Workspace

Reference

不等于 Ownership。

## Persistence Path

AI Runtime

↓

API Executes

↓

Database

↓

ai_records

↓

Runtime Refresh

Database

是 Source of Truth。

## Recorded Content

AI Record 可以记录：

Prompt

Context Summary

Model

Model Version

Temperature

Tool Calls

Knowledge Retrieval

Reasoning Summary

Output Summary

Execution Time

Token Usage

Latency

Cost

Result Status

Created Time

## Timeline Relationship

Timeline

记录：

Business History。

Workflow Event

记录：

Workflow Runtime。

AI Record

records AI Runtime work.

AI Record

may append Timeline.

AI Record

does not replace Timeline.

does not replace Workflow Event.

## Workflow Boundary

AI Record

does not drive Workflow.

does not change Workflow.

does not define Workflow.

## Domain Boundary

AI Record

does not modify Domain Object.

does not modify:

Identity

Ownership

Relationship

Lifecycle

## API Boundary

AI Record is persisted through API.

AI Runtime

does not write Database directly.

## Database Boundary

Database

is Source of Truth.

AI Record

belongs to ai_records table.

## Constraints

AI Record

不得定义：

Business Rules

Workflow

Domain Model

Database Schema

API Specification

Database Constraints

## Freeze Rules

V1：

AI Record Structure

冻结。

新增字段：

进入 V2。

修改 Persistence Path：

进入 V2。

## Freeze Conclusion

AI Record

is

the official runtime work record

of LawDesk V1.

It records

AI execution only.

## RC Audit

完成后执行只读 RC Audit。

检查：

1. Frozen Header 完整。
2. AI Record 定义唯一。
3. Identity 完整。
4. Ownership 一致。
5. Relationship 一致。
6. Persistence Path 正确。
7. Timeline / Workflow Event 边界一致。
8. Workflow Boundary 完整。
9. Domain Boundary 完整。
10. API / Database Boundary 完整。
11. Freeze Rules 完整。
12. 未修改其它文件。

输出：

# LawDesk V1

03_AI_Record RC Audit

PASS / FAIL

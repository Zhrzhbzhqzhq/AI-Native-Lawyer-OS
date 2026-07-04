---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: AI Runtime
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
Only documentation typo fixes are allowed.
---

# 02_ai_runtime.md

## Purpose

定义 LawDesk V1 AI Runtime。

AI Runtime

是 AI 的运行时。

不是：

Domain Model

不是：

Workflow

不是：

API

不是：

Database。

## Definition

AI Runtime

负责：

运行 AI。

协调 Prompt。

协调 Context。

协调 Memory。

协调 Model。

协调 Tool。

协调 Output。

## Official Runtime Pipeline

User Input

↓

Context Assembly

↓

Prompt Assembly

↓

Model Execution

↓

Tool Execution（Optional）

↓

AI Output

↓

Lawyer Reviews

↓

Lawyer Confirms

↓

API Executes

↓

Database Updates

↓

AI Record

↓

Runtime Refresh

## Runtime Inputs

AI Runtime 可以读取：

Domain Model

Workflow Context

API Resource

Knowledge

Timeline

Workflow Event

AI Record

Workspace

User Prompt

System Prompt

## Runtime Outputs

AI Runtime 可以生成：

Analysis

Suggestion

Draft

Review

Summary

Extraction

Classification

Comparison

Translation

AI Record

## Runtime Context

AI Runtime

负责：

Context Loading

Prompt Composition

Memory Loading

Knowledge Retrieval

Tool Routing

Model Selection

## Runtime Tool Boundary

AI Runtime

可以调用：

Search

RAG

OCR

Document Parser

Calculator

Browser

LLM Tool

内部 Tool。

不得：

直接写 Database。

不得：

直接修改 Domain Object。

## Workflow Boundary

Workflow

负责：

Validation

Business Rules

State Transition

AI Runtime

不得：

决定 Workflow。

不得：

改变 Workflow。

## Domain Boundary

AI Runtime

读取：

Domain Model。

不得：

修改：

Identity

Ownership

Relationship

Lifecycle

## API Boundary

AI Runtime

不得直接执行 API。

流程：

Lawyer Reviews

↓

Lawyer Confirms

↓

API Executes

## Database Boundary

Database

is Source of Truth.

AI Runtime

不得直接写 Database。

所有持久化：

经过 API。

## AI Record

AI Runtime

产生：

AI Record。

AI Record

记录：

AI Runtime 工作。

AI Record

不是：

Timeline。

不是：

Workflow Event。

## Constraints

AI Runtime

不得定义：

Business Rules

Workflow

Domain Model

Database Schema

API Specification

Database Constraints

## Freeze Rules

V1：

Runtime Pipeline 冻结。

新增 Runtime Stage：

进入 V2。

修改 Pipeline：

进入 V2。

## Freeze Conclusion

AI Runtime

is

the official runtime layer

of LawDesk V1.

All AI execution

must follow this Runtime Pipeline.

## RC Audit

完成后执行只读 RC Audit。

检查：

1. Frozen Header 完整。
2. Runtime Pipeline 唯一。
3. Runtime Inputs 完整。
4. Runtime Outputs 完整。
5. Runtime Context 完整。
6. Tool Boundary 完整。
7. Workflow Boundary 完整。
8. Domain Boundary 完整。
9. API Boundary 完整。
10. Database Boundary 完整。
11. AI Record Boundary 完整。
12. Freeze Rules 完整。
13. 未修改其它文件。

输出：

LawDesk V1

02_AI_Runtime RC Audit

PASS / FAIL

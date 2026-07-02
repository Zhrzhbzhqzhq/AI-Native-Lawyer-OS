---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Domain Model Index
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 00_domain_model_index

## 1. Purpose

本文件定义 LawDesk V1 Domain Model 体系总索引。

Domain Model 是 LawDesk 业务对象和对象关系的共同语言。

本文件仅定义 Domain Model 的组织结构，不定义具体业务规则。

---

## 1.1. V1 Overview

LawDesk V1 首批核心 Domain Model 对象保留最低可运行集合，强调案件中心和 AI 可审计性。

- Matter：案件
- Client：客户
- Material：资料
- Evidence：证据
- Document：文书
- Timeline：时间轴
- Task：任务
- Knowledge：知识沉淀
- AI Record：AI 工作记录
- Workspace：案件工作区

---

## 2. Domain Model Architecture

LawDesk V1 Domain Model 由三层组成：

- Domain Model Principles
- Core Entities
- Entity Relationships

其中：

Domain Model Principles 定义统一建模原则。

Core Entities 定义具体业务对象。

Entity Relationships 定义对象之间的关联。

---

## 3. Core Entities

| Entity | File | Purpose |
|--------|------|---------|
| Matter | 02_matter.md | 案件核心对象 |
| Client | 03_client.md | 客户对象 |
| Material | 04_material.md | 案件资料 |
| Evidence | 05_evidence.md | 证据对象 |
| Document | 06_document.md | 法律文书 |
| Task | 07_task.md | 办案任务 |
| Timeline | 08_timeline.md | 时间线事件 |
| Workflow Event | 09_workflow_event.md | 事件驱动对象 |
| AI Record | 10_ai_record.md | AI 工作记录 |
| Knowledge | 11_knowledge.md | 知识沉淀 |
| Workspace | 12_workspace.md | 案件工作区 |

---

## 4. Reading Order

1. 00_domain_model_index.md
2. 01_domain_model_principles.md
3. 02_matter.md
4. 03_client.md
5. 04_material.md
6. 05_evidence.md
7. 06_document.md
8. 07_task.md
9. 08_timeline.md
10. 09_workflow_event.md
11. 10_ai_record.md
12. 11_knowledge.md
13. 12_workspace.md

---

## 5. Module Dependency

Domain Model 定义业务对象，供 Workflow、Database、API、AI Runtime、Frontend 使用。

Domain Model 不依赖于具体 Workflow 实现。

Domain Model 不直接定义业务流程。

---

## 6. Freeze Policy

- 所有 Domain Model 文件采用 `00_xxx.md`、`01_xxx.md`、`02_xxx.md` 命名。
- 旧中文命名文档保留于目录中，作为历史文档。
- Domain Model 正式规范文件不得随意重命名。
- 任何 Domain Model 结构或实体调整必须进入 V2。

---

## 7. Notes

- 本目录还保留旧中文命名文档，避免历史内容丢失。
- 新增 Domain Model 官方规范文件应遵循本目录结构。

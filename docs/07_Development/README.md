---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Development Documentation Index
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any documentation structure changes must target V2.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# Development Documentation

## 1. Purpose

本目录包含 LawDesk V1 全部开发规范。

所有开发人员、AI Agent、Frontend、Backend、Database、Runtime 均应首先阅读本目录。

本 README 仅用于导航。

README 不定义开发规范，职责为：

- Development Overview
- Documentation Navigation
- Reading Order
- Module Dependency
- Directory Structure

不定义任何业务规则。

---

## 2. Documentation Structure

00_documentation_style_guide.md

Documentation Style Guide

整个 LawDesk V1 开发文档体系的最高级规范。

定义：

- 文档结构
- 写作规范
- 命名规范
- Freeze Header
- Freeze Conclusion
- Matrix 命名
- Validation 命名
- Documentation Writing Standards

所有开发文档必须首先遵循本规范。

00_documentation_index.md

Documentation Registry。

README.md

Development Documentation Index。

01_Domain_Model/

领域模型。

02_Workflow/

Workflow 规范。

03_Database/

Database 规范。

04_API/

REST API 规范。

05_AI/

AI Runtime 与 AI Agent。

06_UI/

Frontend 与 UI 规范。

---

## Documentation Hierarchy

LawDesk V1 开发文档采用统一层级管理。

Documentation Style Guide

↓

Documentation Index

↓

README

↓

Domain

↓

Workflow

↓

Database

↓

API

↓

AI

↓

UI

↓

Implementation

所有开发规范均应首先遵循 Documentation Style Guide，再遵循对应模块规范。

---

## 3. Reading Order

建议阅读顺序：

1. 00_documentation_style_guide.md
2. README.md
3. 01_Domain/
4. 02_Workflow/
5. 03_Database/
6. 04_API/
7. 05_AI/
8. 06_UI/

若后续还有：

07_Integration/
08_Runtime/
09_Testing/

继续保持顺序。

---

## 4. Dependency

Documentation Style Guide

↓

Documentation Index

↓

README

↓

Domain Model

↓

Workflow

↓

Database

↓

API

↓

AI Runtime

↓

Frontend (UI)

说明：

- Documentation Style Guide 定义文档规范层级与写作要求。
- Documentation Index 管理规范注册表与文档状态。
- README 提供开发文档概览与导航。
- Domain Model 定义业务对象。
- Workflow 定义业务状态流转。
- Database 保存业务数据（Source of Truth）。
- API 基于 Domain、Workflow 与 Database 提供资源接口。
- AI Runtime 通过 API 与 Workflow 执行业务能力。
- Frontend 基于 API 展示与操作业务对象。

任何下层模块不得绕过上层规范。

---

## 5. Directory Structure

00_documentation_style_guide.md
00_documentation_index.md
README.md
01_Domain_Model/
02_Workflow/
03_Database/
04_API/
05_AI/
06_UI/

未来新增模块：

07_Integration/
08_Runtime/
09_Testing/

---

## 6. Documentation Status

Status = Frozen

表示：

允许：

- 错别字修正
- 排版统一
- 文档格式统一

禁止：

- 修改业务规则
- 修改 API
- 修改 Workflow
- 修改 Database Schema
- 修改 Domain Model

所有业务修改进入：

V2。

---

## 6. Freeze Conclusion

该文档定义 LawDesk V1 开发文档总索引。

本规范自 V1 起正式冻结。

所有开发文档必须遵守 Documentation Style Guide。

任何开发规范调整必须进入 V2。

---

## Documentation Hierarchy

Documentation Style Guide

↓

README

↓

Domain

↓

Workflow

↓

Database

↓

API

↓

AI

↓

UI

所有模块规范均不得违反：

Documentation Style Guide。

---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Documentation Style Guide
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any documentation structure changes must target V2.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# Documentation Style Guide

This document is the highest-level documentation standard for the LawDesk V1 development system.

All development specifications must comply with this guide before defining module-specific rules.

本文档是 LawDesk V1 开发文档体系的最高级规范（Meta Specification）。

用于统一整个开发体系的：

- 文档结构
- 写作规范
- 命名规范
- 冻结规范（Freeze）
- 文档层级（Documentation Hierarchy）

所有开发规范均应首先遵循本规范，再定义各模块的具体规则。

# 00_documentation_style_guide

## 1. Purpose

本规范定义 LawDesk V1 全部开发文档的统一编写标准。

所有 Architecture、Database、API、Workflow、Domain Model、Runtime、Frontend 文档必须遵守本规范。

本文档不定义业务规则。

本文档仅定义文档规范。

---

# 2. Documentation Principles

所有规范文档遵循：

- Single Source of Truth
- Consistency First
- Architecture Driven
- Human Readable
- AI Friendly
- Version Controlled
- Freeze Controlled

---

# 3. Freeze Header

所有冻结文档必须使用统一 Header。

格式如下：

```yaml
---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: <Module Name>
Owner: LawDesk Architecture
Last Updated: YYYY-MM-DD
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---
```

Module 根据文档填写，例如：

- Database Schema
- Table Relations
- REST Conventions
- Workflow Principles
- Matter Lifecycle
- Matter API

---

# 4. Heading Rules

统一标题编号：

```
# Document Title

## 1.

## 2.

## 3.
```

禁止：

```
### 1.1

####

#####
```

除非确有必要。

---

# 5. Terminology Convention

所有专有术语遵循统一规则。

第一次出现：

中文（English）

例如：

工作流（Workflow）

案件（Matter）

生命周期事件（Lifecycle Events）

最终业务数据来源（Source of Truth）

后续再次出现：

直接使用英文术语。

固定英文对象：

- Matter
- Workflow
- Timeline
- Today
- Workspace
- Dashboard
- Overview
- AI Runtime
- Source of Truth

不得混用多个名称。

---

# 6. Naming Convention

文件命名：

全部采用：

```
00_xxx.md

01_xxx.md

02_xxx.md
```

全部：

小写

snake_case

例如：

```
01_schema.md

03_api_resources.md

02_matter_lifecycle.md
```

---

# 7. Section Style

统一使用：

说明：

用途：

规则：

返回：

禁止：

例如：

```
说明：

Matter 是核心业务对象。
```

保持全文一致。

---

# 8. List Style

统一使用：

```
- Item A
- Item B
- Item C
```

禁止：

```
*

+

①

②
```

除非表达层级需要。

---

# 9. Code Block Style

所有代码使用：

````text
```json

```

```yaml

```

```text

```
````

---

## Documentation Writing Standards

LawDesk V1 所有规范文档必须遵循以下统一写作标准。

### 1. Section Title Convention

所有二级及以下标题统一采用：

Title Case

例如：

- Workflow Principles
- Matter Lifecycle
- Workflow Events
- Transition Validation
- Database Constraints
- API Principles
- Freeze Conclusion

禁止混用：

- workflow principles
- Workflow principles
- workflow Principles

统一使用：

Title Case。

### 2. Matrix Naming Convention

所有 Matrix 标题统一采用：

- Legal XXX Matrix
- Illegal XXX Matrix

例如：

- Legal Transition Matrix
- Illegal Transition Matrix
- Permission Matrix
- Role Matrix
- Validation Matrix

不得混用：

- Legal State Transition Matrix
- Illegal XXX Matrix

除非确有特殊语义需要。

### 3. Validation Naming Convention

所有 Validation 阶段统一采用：

- Pre-Validation
- Business Validation
- Post-Validation

不得出现：

- Pre Validation
- Post Validation

保持整个 V1 文档体系统一。

### 4. Freeze Conclusion Template

所有正式规范文档最后统一采用：

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何业务规则修改必须进入 V2。

以后所有规范文档保持一致。

## Runtime View Standard

Runtime View 表示系统运行时动态生成的数据视图。

Runtime View：

- 不保存业务状态。
- 不作为 Source of Truth。
- 根据 Runtime 数据动态生成。
- 可随时重新生成。
- Database 始终保存最终业务状态（Source of Truth）。

以下模块默认属于 Runtime View：

- Today
- Timeline
- Dashboard
- AI Workspace
- 后续所有 Runtime 模块

所有 Runtime 文档必须遵循本规范。

## Runtime Generation Sources Standard

所有 Runtime 文档统一使用：

Generation Sources

用于描述 Runtime 模块的数据来源。

统一采用：

Generation Sources

至少读取：

- Workflow
- Lifecycle
- Timeline
- Tasks
- Deadlines
- AI Runtime
- 其它 Runtime 数据

不得混用：

- Depends On
- Reads
- Inputs
- Data Sources

保持整个 LawDesk V1 Runtime 文档命名一致。

## Documentation Scope

以上规范适用于：

- Database
- Domain Model
- Workflow
- API
- AI Runtime
- UI
- Scheduler
- Integration
- Future V1 Specifications

所有新增文档默认遵循本 Style Guide。

---

## Documentation Hierarchy

LawDesk V1 开发文档采用如下层级：

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

AI Runtime

↓

UI

↓

Implementation

说明：

- Documentation Style Guide 定义统一规范。
- README 定义阅读顺序与目录导航。
- 各模块规范不得违反 Documentation Style Guide。
- Implementation 必须遵循对应模块规范。

---

## Meta Specification

Documentation Style Guide 不定义业务规则。

Documentation Style Guide 仅定义：

- Documentation Standards
- Naming Conventions
- Writing Standards
- Freeze Standards
- Documentation Hierarchy

所有业务规范由各模块文档定义。

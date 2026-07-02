---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Workflow Index
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 00_workflow_index

## 1. Purpose

本文件定义 LawDesk V1 Workflow 体系总索引。

Workflow 是 LawDesk 的业务执行核心。

所有 Matter 的业务推进、AI 协作、Today 更新、API 执行均由 Workflow 驱动。

本文件仅定义 Workflow 的组织结构，不定义具体业务规则。

---

## 2. Workflow Architecture

Workflow 体系由三层组成：

- Workflow Principles
- Matter Lifecycle
- Workflow Specifications（WF-001 ～ WF-012）

其中：

Workflow Principles 定义总体原则。

Matter Lifecycle 定义案件生命周期。

Workflow Specifications 定义具体业务流程。

---

## 3. Workflow Dependency

Workflow 之间遵循以下依赖关系：

```text
Workflow Principles
        │
        ▼
Matter Lifecycle
        │
        ▼
WF-001 ～ WF-012
        │
        ▼
API
        │
        ▼
Database
```

任何 Workflow 不得绕过 Matter Lifecycle。

任何 API 不得绕过 Workflow。

---

## 4. Workflow List

| Workflow ID | Workflow Name | Purpose | Status |
|-------------|---------------|---------|--------|
| WF-001 | Consultation | 客户咨询与案件评估 | Planned |
| WF-002 | Accept Matter | 正式接案 | Planned |
| WF-003 | Start Matter | 启动案件办理 | Planned |
| WF-004 | Material Processing | 材料整理与分类 | Planned |
| WF-005 | Evidence Confirmation | 证据确认 | Planned |
| WF-006 | Legal Research | 法律检索 | Planned |
| WF-007 | Document Generation | 法律文书生成 | Planned |
| WF-008 | Litigation Execution | 办案执行 | Planned |
| WF-009 | Trial Preparation | 庭审准备 | Planned |
| WF-010 | Matter Closing | 结案 | Planned |
| WF-011 | Case Review | 复盘与知识沉淀 | Planned |
| WF-012 | Archive Matter | 案件归档 | Planned |

---

## 5. Workflow Sequence

LawDesk V1 默认业务流程：

```text
WF-001 Consultation
        ↓
WF-002 Accept Matter
        ↓
WF-003 Start Matter
        ↓
WF-004 Material Processing
        ↓
WF-005 Evidence Confirmation
        ↓
WF-006 Legal Research
        ↓
WF-007 Document Generation
        ↓
WF-008 Litigation Execution
        ↓
WF-009 Trial Preparation
        ↓
WF-010 Matter Closing
        ↓
WF-011 Case Review
        ↓
WF-012 Archive Matter
```

实际办案过程中，部分 Workflow 可重复执行。

例如：

- WF-004 Material Processing
- WF-005 Evidence Confirmation
- WF-006 Legal Research
- WF-007 Document Generation

均可根据案件进展多次进入。

---

## 6. Workflow Execution Rules

Workflow 必须遵循：

- Workflow Principles
- Matter Lifecycle
- API Specifications

任何 Workflow：

- 不得跳过 Lifecycle。
- 不得直接修改 Database。
- 不得绕过 API。
- 不得自动完成律师确认动作。

---

## 7. AI Responsibilities

AI 可以：

- 分析案件
- 推荐下一步 Workflow
- 自动生成任务
- 自动生成文书
- 自动发现风险
- 自动更新 Today 建议

AI 不可以：

- 自动接案
- 自动确认证据
- 自动提交法院
- 自动结案
- 自动归档

所有最终业务动作必须由律师确认，并通过 API 执行。

---

## 8. Workflow Status

每个 Workflow 统一采用以下状态：

- Pending
- Running
- Waiting Confirmation
- Completed
- Cancelled

Workflow Status 不等同于 Matter Status。

---

## 9. V2 Reserved

未来可扩展：

- 可视化 Workflow Designer
- 自定义 Workflow
- 多角色 Workflow
- 团队审批 Workflow
- 外部系统事件驱动 Workflow
- Workflow Analytics

---

## 10. Freeze Conclusion

该文档定义 LawDesk V1 Workflow Index 官方规范。

本规范自 V1 起正式冻结。

Workflow、API、Database、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

任何 Workflow 结构调整必须进入 V2。

# Domain Model 文档

本目录负责描述 LawDesk 的核心业务对象、领域模型与对象关系。

## Purpose

Domain Model 负责定义 LawDesk V1 的业务对象结构。

## Reading Order

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

## Entity List

- `02_matter.md`：Matter 案件对象。
- `03_client.md`：Client 客户对象。
- `04_material.md`：Material 资料对象。
- `05_evidence.md`：Evidence 证据对象。
- `06_document.md`：Document 文书对象。
- `07_task.md`：Task 任务对象。
- `08_timeline.md`：Timeline 时间轴对象。
- `09_workflow_event.md`：Workflow Event 事件对象。
- `10_ai_record.md`：AI Record AI 工作记录。
- `11_knowledge.md`：Knowledge 知识沉淀。
- `12_workspace.md`：Workspace 案件工作区。

## Relationship

- Domain Model 为 Workflow、Database、API、AI Runtime 提供统一对象定义。
- Matter 为核心聚合根。
- 其他对象围绕 Matter 建立关系。

## Development Status

- Domain Model 规范已迁移至正式文件命名。
- 旧中文文档保留在目录中作为历史内容。

## Freeze Policy

- 所有正式 Domain Model 文档采用 `00_xxx.md`、`01_xxx.md`、`02_xxx.md` 命名。
- 旧中文命名文档保留，不作为正式规范引用。
- 任何 Domain Model 结构调整必须进入 V2。

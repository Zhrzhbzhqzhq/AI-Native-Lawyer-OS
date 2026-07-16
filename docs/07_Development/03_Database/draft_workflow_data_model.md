# LawDesk V1 Draft Workflow 数据模型规范

## 1. 文档目的

本文档定义 LawDesk V1 草稿工作流（Draft Workflow）的数据模型边界、持久化规则和发布约束。

Draft Workflow 用于保存 AI 生成但尚未经过律师确认的工作结果，并确保 AI 输出不会直接成为正式业务状态。

## 2. 模型定位

以下模型是工作流持久化模型（Workflow Persistence Models）：

- FactDraft
- IssueDraft
- LawDraft
- ArgumentDraft
- DocumentDraft

这些模型不是新的正式 Domain Model，不改变 LawDesk V1 已冻结 Domain Model 的名称、含义或层级。

所有 Draft 必须属于一个 Matter。Draft 仅保存工作流中的候选结果，不得替代正式 Fact、Issue、Law、Argument 或 Document。

## 3. AI 与律师确认边界

AI 只能生成 Draft。

AI 不得将 Draft 直接确认为正式业务对象，也不得绕过律师确认修改正式业务状态。

Draft 只有在律师明确确认后，才能发布为对应的正式对象：

| Draft | 正式对象 |
| --- | --- |
| FactDraft | Fact |
| IssueDraft | Issue |
| LawDraft | Law |
| ArgumentDraft | Argument |
| DocumentDraft | Document |

## 4. 生成上下文快照

`source_*_ids` 字段用于保存 AI 生成 Draft 时使用的上下文快照，例如：

- `source_evidence_ids`
- `source_fact_ids`
- `source_issue_ids`
- `source_law_ids`
- `source_argument_ids`

这些字段是生成上下文快照，不是数据库关系的业务状态来源（Source of Truth）。

`source_*_ids` 不替代正式关系表，也不授权 Draft 直接管理正式对象之间的关系。

## 5. 发布审计字段

`published_*_id` 是非关系审计字段，用于记录 Draft 发布成功后生成的正式业务对象 ID，并支持发布结果追踪和幂等检查。

包括：

- `published_fact_id`
- `published_issue_id`
- `published_law_id`
- `published_argument_id`
- `published_document_id`

V1 对 `published_*_id` 采用以下规则：

- 不建立 Foreign Key。
- 不建立 Unique Constraint。
- 不建立 Prisma Relation。
- 不作为正式业务对象之间的关系依据。
- 不作为业务状态的 Source of Truth。

正式 Fact、Issue、Law、Argument、Document 及其正式关系表才是业务状态的 Source of Truth。

## 6. 发布事务

Draft 发布流程必须在数据库事务中完成。

事务应至少包含：

1. 校验 Draft 属于目标 Matter。
2. 校验 Draft 已满足律师确认要求。
3. 创建对应的正式业务对象。
4. 创建必要的正式关系记录。
5. 写入 `published_at` 和对应的 `published_*_id`。

`published_at` 与 `published_*_id` 只能在正式对象及必要关系成功创建后写入。

事务失败时，不得留下部分发布状态，也不得将 Draft 标记为已经发布。

## 7. Draft 接口标识

FactDraft 使用 `draft_id` 作为接口标识。

IssueDraft、LawDraft、ArgumentDraft 和 DocumentDraft 使用 `id` 作为接口标识。

这是 LawDesk V1 的既有兼容设计。V1 不统一或重命名这些字段，以避免破坏现有 API、Service 和测试契约。

## 8. 初始状态

DocumentDraft 的初始 `review_status` 为 `generated`。

FactDraft、IssueDraft、LawDraft 和 ArgumentDraft 的初始 `review_status` 为 `pending`。

这是 LawDesk V1 的工作流差异：DocumentDraft 先表示文书内容已经生成，其他 Draft 直接进入待律师审核状态。两类 Draft 均不得在律师确认前发布为正式业务对象。

## 9. UUID 策略

所有 Draft 及正式关系表使用 UUID 作为数据库主键。

本次新增 Migration 中的 UUID 主键应提供 `gen_random_uuid()` 默认值，以保证 Prisma Client 和必要的数据库写入路径具有一致的主键生成行为。

## 10. V1 数据完整性边界

V1 通过以下方式保证 Draft Workflow 的数据完整性：

- Draft 通过 `matter_id` 归属于 Matter。
- Draft 到 Matter 使用 Foreign Key，并采用 `ON DELETE RESTRICT`。
- 正式对象之间的关系由正式关系表及其 Foreign Key、Unique Constraint 维护。
- Draft 的来源 ID 和发布 ID 仅承担快照与审计职责。
- 发布操作通过事务保证正式对象、正式关系和发布审计字段的一致写入。
- 已确认的正式业务数据不得由 AI 删除或覆盖。

## 11. V1 冻结规则

以下规则自 V1 起冻结：

- Draft 是 Workflow 持久化模型，不是新的正式 Domain Model。
- AI 只能生成 Draft，律师确认后才能发布。
- `source_*_ids` 是生成上下文快照。
- `published_*_id` 是非关系审计字段。
- 正式对象和正式关系表是业务状态的 Source of Truth。
- Draft 发布必须通过事务完成。
- FactDraft 与其他 Draft 的接口标识差异保持兼容。
- DocumentDraft 与其他 Draft 的初始状态差异保持不变。

该文档定义 LawDesk V1 Draft Workflow Data Model 官方规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

任何业务规则修改必须进入 V2。

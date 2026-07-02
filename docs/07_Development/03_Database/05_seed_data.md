---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Seed Data
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 05_seed_data

## 1. Seed Principles

- Seed Data 是系统默认数据。
- Seed Data 不是业务数据，不属于具体 Matter、Client 等业务对象。
- Seed Data 不是测试数据，不应与测试用例数据混淆。
- 用户删除案件或业务对象后，不会删除 Seed Data。
- Seed Data should be deterministic. The same Seed Data must produce the same initial system state.

## 2. Matter Default Values

- 默认 `status`: `consultation`
- 默认 `stage`: `intake`
- 默认 `priority`: `medium`
- 默认 `risk_level`: `medium`

说明：

- 这些默认值用于 Matter 初始化时的基础状态和优先级。
- 业务创建时，律师可以根据实际情况调整这些字段。

## 3. Matter Workspace Defaults

- 默认 `status`: `initializing`
- 默认 `current_module`: `overview`
- 默认 `health_score`: `100`
- 默认 `today_focus`: 空

说明：

- Matter_Workspace 初始化时进入工作区准备阶段。
- `today_focus` 保持空，后续由 Today 或 AI 生成内容填充。

## 4. Default Workflow Definitions

初始化 Workflow 定义：

- `WF-001`
- `WF-002`
- `WF-003`
- `WF-004`
- `WF-005`
- `WF-006`
- `WF-007`
- `WF-008`
- `WF-009`
- `WF-010`
- `WF-011`
- `WF-012`
- `WF-013`

说明：

- Workflow ID 永远固定。
- 不可修改编号。
- 这些定义构成 V1 业务流程骨架。

## 5. Default AI Roles

初始化默认角色：

- `Chief AI`
- `Matter AI`
- `Evidence AI`
- `Research AI`
- `Document AI`
- `Timeline AI`
- `Knowledge AI`
- `Today AI`
- `Workspace AI`

说明：

- 这里只定义角色名称。
- Prompt 内容不放在 Seed Data 文档中。

## 6. Default Prompt References

仅保存 Prompt Reference：

- `Chief_AI`
- `Matter_AI`
- `Evidence_AI`
- `Research_AI`
- `Document_AI`
- `Timeline_AI`
- `Knowledge_AI`
- `Today_AI`
- `Workspace_AI`

说明：

- 这些是 Prompt 的元数据引用。
- 真正 Prompt 存储在 Prompt System，不在 V1 Seed Data 直接初始化内容。

## 7. Default Status Values

说明：

- 所有状态值来自 Schema Enum。
- V1 不建立独立的 status 表。
- Seed Data 不用于复制 Enum 内容，而是依赖 Schema 中定义的状态域。

## 8. Default System Configuration

初始化系统默认配置：

- Default Timezone: `Asia/Shanghai`
- Default Language: `zh-CN`
- Default Document Format: `Markdown`
- Default AI Provider: `Configurable`
- Default AI Model: `Configurable`
- Default Workspace Layout: `Standard`
- Default Reminder Enabled: `true`
- Default Auto Save: `true`
- Default Today View: `Enabled`

说明：

- 这些属于系统默认配置。
- 不是业务数据。
- 允许用户修改。
- 配置保存在 System Configuration 中，不属于 Matter。

## 9. Reserved Seed

未来 V2 可考虑 Seed 初始化：

- `Users`
- `Teams`
- `Permissions`
- `Templates`
- `Prompt Packs`
- `Model Routing`
- `Agent Marketplace`
- `Default Notification Rules`
- `Default AI Policies`
- `Default Dashboard Widgets`

说明：

- V1 不初始化这些内容。
- 这些属于未来扩展，当前保持最小可运行。

## 10. Freeze Conclusion

- Seed Data 只负责初始化系统能力。
- 业务数据全部由律师创建。
- 该设计满足 V1 最小可运行要求，同时为后续系统功能留出扩展空间。

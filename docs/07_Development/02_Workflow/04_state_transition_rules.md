---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: State Transition Rules
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 04_state_transition_rules

## 1. Purpose

State Transition Rules 定义 LawDesk Workflow 的状态转换规则。

所有 Matter 生命周期状态转换必须遵循本规范。

本规范用于统一：

- Workflow
- API
- Database
- AI Runtime
- Today
- Frontend

所有状态转换均以本规范为唯一依据。

State Transition Rules 是 Workflow 状态机的唯一执行规范。

---

## 2. Transition Principles

State Transition 必须遵循以下原则：

- Workflow Driven
- Matter Centered
- Forward Only
- Human Confirmation Required
- API Executes
- Database Records Truth
- Today Reflects Workflow

Workflow 定义状态转换。

API 执行状态转换。

Database 保存最终业务状态（Source of Truth）。

---

## 3. Legal Transition Matrix

允许状态转换：

| Current State | Next State |
|---------------|------------|
| consultation | accepted |
| accepted | active |
| active | closing |
| closing | closed |
| closed | archived |

任何未列出的状态转换均视为非法。

所有合法状态转换均应通过 Workflow Validation 后，由 API 执行。

---

## 4. Illegal Transition Matrix

禁止：

- consultation → active
- consultation → closing
- consultation → closed
- consultation → archived

- accepted → closing
- accepted → closed
- accepted → archived

- active → consultation
- active → accepted
- active → closed
- active → archived

- closing → consultation
- closing → accepted
- closing → active
- closing → archived（未满足结案条件）

- closed → consultation
- closed → accepted
- closed → active
- closed → closing

- archived → 任意状态

非法状态转换必须拒绝执行。

---

## 5. Workflow Gates

每一次状态转换都必须经过 Workflow Gate。

Workflow Gate 至少检查：

- Workflow Rules
- Matter State
- Required Fields
- Required Resources
- Permission
- Business Constraints

任何校验失败：

不得执行状态转换。

---

## 6. Transition Validation

状态转换至少包括：

Pre-Validation：

- Workflow
- Matter
- Client
- Required Data

Business Validation：

- Deadline
- Constraint
- Permission

Post-Validation：

- Timeline
- Today
- AI Runtime
- Database

全部通过后：

状态转换成功。

Validation 不直接修改业务状态，仅决定状态转换是否允许执行。

---

## 7. Transition Execution Order

统一执行顺序：

Workflow

↓

Validation

↓

API

↓

Database

↓

Workflow Event

↓

Timeline

↓

Today

↓

AI Runtime

不得改变执行顺序。

Database 始终保存最终业务状态（Source of Truth）。

---

## 8. Rollback Rules

发生异常时：

Database 回滚。

Workflow 保持原状态。

Timeline 不写入。

Today 不刷新。

AI Runtime 不消费失败事件。

不得出现部分成功。

Database 回滚后仍保持原有业务状态（Source of Truth）。

---

## 9. Concurrency Rules

同一 Matter：

任意时刻仅允许一个状态转换事务。

禁止：

- 双重提交
- 重复确认
- 并发修改
- 状态覆盖

重复请求应保证幂等。

状态转换事务应保证串行执行。

---

## 10. Error Behavior

非法状态转换返回：

BUSINESS_RULE_VIOLATION

Workflow 校验失败返回：

WORKFLOW_VALIDATION_FAILED

权限不足返回：

PERMISSION_DENIED

数据缺失返回：

REQUIRED_FIELD_MISSING

资源不存在返回：

RESOURCE_NOT_FOUND

所有错误返回应遵循统一 API Error Response 规范。

---

## 11. State Transition Constraints

State Transition：

不得：

- 跳阶段
- 回退
- 绕过 Workflow
- 绕过 API
- 绕过 Validation

Database 始终保存最终业务状态（Source of Truth）。

---

## 12. Freeze Rules

V1 State Transition Rules 已冻结。

State Transition 顺序不得修改。

Workflow Gate 不得绕过。

已发布 Transition 不得删除。

已发布 Transition 语义不得修改。

新增 Transition 属于 V2。

---

## 13. V2 Reserved

未来可考虑：

- Parallel Workflow
- Conditional Transition
- Custom Workflow
- Workflow Builder
- Rollback Recovery
- Distributed Workflow

---

## 14. Freeze Conclusion

该文档定义 LawDesk V1 State Transition Rules 官方规范。

State Transition Rules 是 Workflow 状态机的统一执行规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何状态转换规则修改必须进入 V2。

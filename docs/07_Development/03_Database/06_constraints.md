---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Business Constraints
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 06_constraints

## 1. Constraint Principles

- Constraints 描述业务约束。
- Business Rules 高于数据库实现。
- API、AI Runtime、Frontend 必须遵守。
- 不允许违反已冻结 Domain Model。

## 2. Matter Constraints

说明：

一个 Matter：

- 必须有唯一 `matter_no`。
- 只能对应一个 Matter_Workspace。
- 可以关联多个 Client。
- 可以关联多个 Material。
- 可以关联多个 Evidence。
- 可以关联多个 Document。
- 可以关联多个 Timeline。
- 可以关联多个 Task。
- 可以关联多个 Research。
- 可以关联多个 Knowledge。
- 可以关联多个 AI_Work_Record。

Matter 删除：

- 默认禁止物理删除。
- 优先 Archive。

Matter Archive：

- Workspace 同步进入 Archive。
- Today 不再显示。
- AI 不再自动生成任务。

## 3. Matter Workspace Constraints

说明：

每个 Matter：

- 只能拥有一个 Workspace。

Workspace：

- 不能脱离 Matter。
- 关闭后进入只读。
- 不能引用其他 Matter。

## 4. Client Constraints

说明：

Client：

- 允许参与多个 Matter。

Matter：

- 必须至少存在一个 Client。

`primary_client_id`：

- 必须存在于 `matter_clients` 中。

## 5. Material Constraints

说明：

Material：

- 必须属于一个 Matter。
- 允许关联多个 Evidence。
- 允许不是 Evidence。

律师确认之前：

- AI 只能建议分类。
- 不能自动确认。

## 6. Evidence Constraints

说明：

Evidence：

- 必须属于一个 Matter。
- 允许多个 Material 支撑。

未确认前：

- AI 可分析。

律师确认后：

- AI 不允许修改。

## 7. Document Constraints

说明：

Document：

- 必须属于 Matter。
- 必须有版本号。
- 允许引用多个 Evidence。
- 允许引用多个 Research。

正式确认后：

- AI 不允许覆盖正文。

## 8. Timeline Constraints

说明：

Timeline：

- 必须属于 Matter。
- 事件时间不可为空。
- 允许关联：Document、Evidence、Task。

Today：

- 按 Timeline 自动排序。

## 9. Task Constraints

说明：

Task：

- 必须属于 Matter。
- 允许 AI 创建建议。

正式任务：

- 律师确认。

完成任务：

- 记录 `completed_at`。

Archive Matter：

- Task 自动进入 Archive。

## 10. Research Constraints

说明：

Research：

- 必须属于 Matter。
- 可以生成多个 Document。

Research：

- 律师确认后：进入 Knowledge。

## 11. Knowledge Constraints

说明：

Knowledge：

- 可以来源于 Matter。
- 可以来源于多个 Matter。

Knowledge：

- 不得自动覆盖。
- 只允许新增版本。

## 12. AI Work Record Constraints

说明：

AI_Work_Record：

- 不是聊天记录。
- 不是业务真相。
- 只能记录：分析、总结、建议、生成、Review。
- 不能代替：Matter、Document、Evidence、Knowledge。

## 13. Delete Rules

说明：

默认：

- Archive。

禁止：

- AI 自动删除。

删除：

- 必须律师确认。

删除 Matter：

- 必须确认：Workspace、Task、Timeline、Document、Evidence、Research、Knowledge 均已处理。

## 14. V2 Reserved

以后：

- Users
- Permissions
- Audit Log
- Document Version History
- Multi-Tenant
- Team Collaboration
- Approval Flow

不属于 V1。

## 15. Freeze Conclusion

说明：

- 本 Constraints 文档定义 LawDesk V1 全部业务约束。
- Database、API、AI Runtime、Frontend 必须遵守。

---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: API Resources
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 03_api_resources

## 1. Resource Principles

API Resource must come from Domain Object.

API Resource does not define Domain Object.

API Resource does not define business rules.

API Resource does not define Workflow.

API Resource does not define Database Schema.

API Resource is an execution boundary only.

API 执行链统一引用：

Domain Model

↓

API Resource

↓

Workflow Validation

↓

API Executes

↓

Database Updates

↓

Workflow Event

↓

Runtime Refresh

说明：

- Business Rule belongs to Workflow / Domain Model.
- Validation belongs to Workflow Validation.
- Persistence belongs to Database.
- Runtime view belongs to Runtime.

## 2. Resource List

V1 官方 API Resources：

- matters
- clients
- materials
- evidence
- documents
- tasks
- timelines
- workflow-events
- ai-records
- knowledge
- workspaces

说明：

- evidence 保持集合名，不加 s。
- knowledge 保持集合名，不加 s。
- workflow_events 数据库表，对应 API resource 为 workflow-events。
- ai_records 数据库表，对应 API resource 为 ai-records。
- workspaces 对应 Workspace。

## 3. Official Mapping

Domain Object -> API Resource -> Database Table

- Matter -> matters -> matters
- Client -> clients -> clients
- Material -> materials -> materials
- Evidence -> evidence -> evidence
- Document -> documents -> documents
- Task -> tasks -> tasks
- Timeline -> timelines -> timelines
- Workflow Event -> workflow-events -> workflow_events
- AI Record -> ai-records -> ai_records
- Knowledge -> knowledge -> knowledge
- Workspace -> workspaces -> workspaces

## 4. Standard Resource Operations

统一基础操作：

GET /api/v1/{resource}

GET /api/v1/{resource}/{id}

POST /api/v1/{resource}

PATCH /api/v1/{resource}/{id}

DELETE /api/v1/{resource}/{id}

说明：

DELETE 默认 Archive。

## 5. Matter Resource Boundary

说明：

- Matter Resource 只代表 Matter。
- Matter API 不得直接定义子资源业务规则。
- 子资源应由各自 Resource 文档定义。
- Matter 可通过 reference 或 query 关联子资源，但不替代子资源 API。

基础接口：

GET /api/v1/matters

GET /api/v1/matters/{id}

POST /api/v1/matters

PATCH /api/v1/matters/{id}

DELETE /api/v1/matters/{id}

特殊接口：

GET /api/v1/matters/{id}/workspace

GET /api/v1/matters/{id}/tasks

GET /api/v1/matters/{id}/timeline

GET /api/v1/matters/{id}/documents

GET /api/v1/matters/{id}/evidence

GET /api/v1/matters/{id}/materials

## 6. Client Resource

基础接口：

GET /api/v1/clients

GET /api/v1/clients/{id}

POST /api/v1/clients

PATCH /api/v1/clients/{id}

DELETE /api/v1/clients/{id}

关系接口：

GET /api/v1/matters/{id}/clients

POST /api/v1/matters/{id}/clients

DELETE /api/v1/matters/{id}/clients/{client_id}

## 7. Material Resource

基础接口：

GET /api/v1/materials

GET /api/v1/materials/{id}

POST /api/v1/materials

PATCH /api/v1/materials/{id}

DELETE /api/v1/materials/{id}

特殊接口：

POST /api/v1/materials/{id}/mark-candidate-evidence

POST /api/v1/materials/{id}/confirm

## 8. Evidence Resource

基础接口：

GET /api/v1/evidence

GET /api/v1/evidence/{id}

POST /api/v1/evidence

PATCH /api/v1/evidence/{id}

DELETE /api/v1/evidence/{id}

特殊接口：

POST /api/v1/evidence/{id}/confirm

POST /api/v1/evidence/{id}/reject

## 9. Document Resource

基础接口：

GET /api/v1/documents

GET /api/v1/documents/{id}

POST /api/v1/documents

PATCH /api/v1/documents/{id}

DELETE /api/v1/documents/{id}

特殊接口：

POST /api/v1/documents/{id}/confirm

POST /api/v1/documents/{id}/archive

## 10. Task Resource

基础接口：

GET /api/v1/tasks

GET /api/v1/tasks/{id}

POST /api/v1/tasks

PATCH /api/v1/tasks/{id}

DELETE /api/v1/tasks/{id}

特殊接口：

POST /api/v1/tasks/{id}/complete

POST /api/v1/tasks/{id}/cancel

## 11. Timeline Resource

基础接口：

GET /api/v1/timelines

GET /api/v1/timelines/{id}

POST /api/v1/timelines

PATCH /api/v1/timelines/{id}

DELETE /api/v1/timelines/{id}

## 12. Workflow Event Resource

基础接口：

GET /api/v1/workflow-events

GET /api/v1/workflow-events/{id}

POST /api/v1/workflow-events

PATCH /api/v1/workflow-events/{id}

DELETE /api/v1/workflow-events/{id}

## 13. AI Record Resource

基础接口：

GET /api/v1/ai-records

GET /api/v1/ai-records/{id}

POST /api/v1/ai-records

PATCH /api/v1/ai-records/{id}

DELETE /api/v1/ai-records/{id}

特殊接口：

POST /api/v1/ai-records/{id}/confirm

## 14. Knowledge Resource

基础接口：

GET /api/v1/knowledge

GET /api/v1/knowledge/{id}

POST /api/v1/knowledge

PATCH /api/v1/knowledge/{id}

DELETE /api/v1/knowledge/{id}

特殊接口：

POST /api/v1/knowledge/{id}/confirm

## 15. Workspace Resource

基础接口：

GET /api/v1/workspaces

GET /api/v1/workspaces/{id}

PATCH /api/v1/workspaces/{id}

特殊接口：

GET /api/v1/workspaces/{id}/overview

GET /api/v1/workspaces/{id}/today

GET /api/v1/workspaces/{id}/ai-summary

## 16. Resource Boundary

每个 Resource 仅代表对应 Domain Object。

## 17. Error Boundary

Error Response 可以引用统一错误格式。

但本文件不定义业务错误规则。

业务错误规则由 Workflow Validation / Domain Model 决定。

## 18. Freeze Rules

V1 API Resources 已冻结。

新增 Resource 属于 V2。

删除 Resource 必须进入 V2。

重命名 Resource 必须进入 V2。

## 19. Freeze Conclusion

该文档定义 LawDesk V1 API Resources 官方规范。

API Resource 来源于 Domain Object。

API Resource 不定义 Domain Object。

API Resource 不定义业务规则。

API Resource 不定义 Workflow。

本规范自 V1 起正式冻结。

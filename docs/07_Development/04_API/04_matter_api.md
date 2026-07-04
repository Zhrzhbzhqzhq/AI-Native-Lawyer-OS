---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Matter API
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 04_matter_api

## 1. Purpose

Matter API is Matter Resource API.

Matter API only serves Matter.

Matter API does not define any other Domain Object API.

## 2. API Boundary

Allowed operations:

GET /api/v1/matters

GET /api/v1/matters/{id}

POST /api/v1/matters

PATCH /api/v1/matters/{id}

DELETE /api/v1/matters/{id}

说明：

- DELETE only means logical delete / archive when V1 supports it.
- Matter API may return Matter Representation.
- Matter API may return Matter Reference.

## 3. Execution Chain

统一采用：

Domain Model

↓

Matter Resource

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

- Workflow Validation decides whether the request is allowed.
- API Executes after validation passes.
- Matter API does not define Workflow Rules.
- Matter API does not define Business Rules.
- Matter API does not define Validation Rules.

## 4. Representation

Matter Representation only contains Matter own fields.

子对象仅允许以下表达方式：

- Reference
- Link
- URI
- Count
- Summary

禁止内嵌完整业务对象。

Matter API may expose Matter Reference for related data.

Matter API does not expose full child objects.

## 5. Error Boundary

Matter API uses the unified Error Response.

Matter API must not define business error types such as:

- BUSINESS_RULE_VIOLATION
- PRIMARY_CLIENT_REQUIRED
- Workflow Gate

Business error sources belong to Workflow Validation.

## 6. Freeze Rules

Matter API is frozen in V1.

New subresource APIs belong to V2.

Matter API must not expand into an aggregate API.

## 7. Freeze Conclusion

This document defines the official LawDesk V1 Matter Resource API specification.

Matter API only serves Matter.

Matter API does not define other Domain Object APIs.

Matter API does not define business rules.

Matter API does not define Workflow.

This specification is frozen from V1 onward.

---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Tool Call
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
Only documentation typo fixes are allowed.
---

# 07_tool_call.md

## 1. Purpose

Tool Call defines:

- Tool Registration
- Tool Invocation
- Tool Execution
- Tool Result
- Tool Audit

Tool Call never defines:

- Workflow
- Domain
- API
- Database
- AI Decision

State clearly:

Tool Call executes capabilities.

Tool Call never makes business decisions.

## 2. Tool Registry

Official Tool Registry includes:

- Filesystem
- Search
- Knowledge Retrieval
- OCR
- Document Parser
- Calendar
- Email
- Browser
- Python
- External API

State clearly:

Only registered tools may be invoked.

New tools belong to V2.

## 3. Tool Invocation

Official invocation chain:

AI Runtime

↓

Tool Selection

↓

Permission Check

↓

Tool Execution

↓

Tool Result

↓

AI Runtime

State clearly:

Tool Invocation is deterministic.

Tool Invocation is auditable.

## 4. Permission Boundary

Before every Tool Call:

Workflow Validation

↓

Lawyer Confirmation

↓

Permission Check

↓

Tool Execution

State clearly:

Tool Call never bypasses Workflow Validation.

Tool Call never bypasses Lawyer Confirmation.

## 5. Tool Boundary

Tool does not:

- modify Domain Object
- modify Workflow
- modify Matter Status
- modify Timeline
- modify Workflow Event
- write Database directly
- execute API directly

Tool only performs its own capability.

## 6. Tool Result

Tool Result may contain:

- Text
- JSON
- File
- Image
- Table
- Structured Data

Tool Result becomes:

AI Context

↓

AI Output

↓

AI Record

State clearly:

Tool Result is read-only input for AI reasoning.

## 7. Tool Retry

Retry Rules:

- Timeout
- Temporary Failure
- Network Failure

Never retry:

- destructive operations
- confirmed operations
- side-effect operations

Retry must be idempotent.

## 8. Timeout

Every Tool defines:

- timeout
- max execution time
- cancellation

State clearly:

Timeout never changes business state.

## 9. Tool Audit

Each Tool Call records:

- tool_call_id
- tool_name
- tool_version
- matter_id
- ai_record_id
- start_time
- end_time
- duration
- result_status

State clearly:

Every Tool Call is auditable.

## 10. Tool Security

Tool must never:

- access unauthorized Matter
- access another Lawyer's data
- bypass Authentication
- bypass Authorization
- bypass Validation

Least Privilege Principle applies.

## 11. Tool Failure

Tool Failure returns only:

- Error Code
- Error Message
- Retryable
- Failure Reason

Tool Failure never modifies Domain Objects.

## 12. Official Tool Execution Chain

Use ONE official chain only.

AI Runtime

↓

Tool Selection

↓

Permission Check

↓

Tool Execution

↓

Tool Result

↓

AI Runtime

↓

AI Record

↓

Runtime Refresh

## 13. Constraints

Tool Call must remain:

- Deterministic
- Auditable
- Secure
- Idempotent
- Version Controlled

Tool Call never:

- create Domain Objects
- modify Domain Objects
- bypass Validation
- bypass Lawyer Confirmation
- write Database
- execute Workflow

## 14. Freeze Rules

LawDesk V1 freezes Tool Call.

The following belong to V2:

- Autonomous Tool Planning
- Parallel Tool Execution
- Tool Marketplace
- Dynamic Tool Discovery
- Multi-Agent Tool Sharing
- Background Tool Execution

## 15. Freeze Conclusion

Use exactly:

Tool Call Specification

Officially Frozen.

LawDesk V1 Tool Call follows:

AI selects tools.

Permissions are verified.

Tools execute.

Results return.

AI continues reasoning.

## RC Audit

After completion perform a read-only RC Audit.

Check:

1. Golden Template
2. Tool Registry
3. Tool Invocation
4. Permission Boundary
5. Tool Boundary
6. Tool Result
7. Retry Rules
8. Timeout Rules
9. Tool Audit
10. Tool Security
11. Tool Failure
12. Official Tool Execution Chain uniqueness
13. Constraints
14. Freeze Header
15. Cross-reference completeness

Output only:

07_Tool_Call RC Audit

PASS / FAIL

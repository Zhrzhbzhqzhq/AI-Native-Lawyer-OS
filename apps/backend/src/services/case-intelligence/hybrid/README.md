# Hybrid Case Intelligence Prototype

## 目标

Hybrid Case Intelligence Prototype 用于验证 Initial MiniMax Understanding + LawDesk Governance。

## 执行链

```text
CaseInput
↓
InitialReader
↓
InitialUnderstanding
↓
GovernanceService
↓
CaseModel
```

InitialReader 只执行一次 MiniMax 调用。GovernanceService 不调用 AI，只将原始 CaseInput 和 InitialUnderstanding 投影为标准 CaseModel。

Prototype 不经过 CaseChiefService，不进入 V1 业务流程。

# Case Intelligence Benchmark

## 目标

该基准用于比较以下两种案件理解方式：

1. LawDesk Case Chief：通过 Case Intelligence Pipeline 分阶段生成 CaseModel。
2. 直接 MiniMax：在不经过 Case Chief Pipeline 的情况下直接生成案件理解结果。

比较重点包括：

- 案件身份识别
- 案件叙事完整性
- 主体识别
- 时间线组织
- 冲突识别
- 决策因素识别
- 风险与未知事项披露
- 自我审查能力
- 输出结构稳定性

## 案例目录

```text
case-intelligence-benchmark/
├── case-001/
├── case-002/
└── case-006/
```

每个案例目录后续可以分别保存相同输入下的 Case Chief 输出、直接 MiniMax 输出及评测结果。

## Direct MiniMax V2

Direct MiniMax Benchmark 使用单次模型调用直接生成 CaseModel，不经过 CaseChiefService 或 Case Intelligence Pipeline。

V2 Prompt 向模型提供完整 JSON Schema，并明确枚举、数组、数值范围、必填字段和禁止额外字段。模型输出在进入 Schema 验证前只经过轻量 Normalizer 兜底。

执行顺序：

```text
单次 Direct MiniMax 调用
↓
JSON 解析
↓
轻量 Normalizer
↓
CaseModel Schema 验证
↓
Benchmark Evaluation
```

# LawDesk V1 Reasoning Freeze Checklist

## Git

- [x] 当前分支为 `release/v1.x`
- [x] 无产品 V2 功能修改
- [x] 无 API Key 或密钥文件进入 Git 状态
- [x] 无真实案件敏感资料进入 Git 状态
- [x] 无数据库文件进入 Git 状态
- [x] 无运行日志进入 Git 状态
- [x] `git diff --check` 通过

说明：FormalSemanticCodec 的 V2 标记是 V1 内部语义编码版本，不是产品 V2 功能。

## Build

- [x] Backend build 通过：`tsc -p tsconfig.json`

## Unit Tests

- [x] Fact
- [x] Issue
- [x] Law
- [x] Argument
- [x] FormalSemanticCodec
- [x] Document Context
- [x] Document Generation
- [x] Document Pipeline

冻结测试结果：14 个测试文件、84 项测试全部通过。测试使用 mock/依赖注入，不调用真实外部 AI。

## Integration Tests

- [ ] BLOCKED — Argument workflow：需要 `DATABASE_URL` 明确指向隔离的 `lawdesk_rc_test`。
- [ ] BLOCKED — Law workflow：需要 `DATABASE_URL` 明确指向隔离的 `lawdesk_rc_test`。
- [ ] BLOCKED — Document workflow：需要 `DATABASE_URL` 明确指向隔离的 `lawdesk_rc_test`。
- [ ] BLOCKED — PostgreSQL test database verified：当前环境尚未确认正确测试库。

后续补跑命令见 `LAW_DESK_V1_REASONING_REGRESSION_TESTS.md`。不得在开发库或生产库运行清理型 workflow 测试。

## Baseline Invariants

- [x] Evidence 来源于真实 Material。
- [x] Fact 来源于 Formal Evidence。
- [x] Fact Boundary Guard 拒绝明确法律评价。
- [x] Issue 来源于 Fact 并保持开放争点。
- [x] Law 对应 Issue。
- [x] Argument 对应唯一 Issue。
- [x] Argument Fact/Law 不跨 Scope。
- [x] Formal Law/Argument 使用 FormalSemanticCodec。
- [x] Document 只消费有效 Formal Argument Scope。
- [x] Document 不重新生成 Fact、Issue、Law 或 Argument。
- [x] Document AI 失败执行 retry，再进入安全 fallback。
- [x] fallback 不包含固定民间借贷模板。
- [x] Formal Document 发布需要律师审核。
- [x] Matter isolation 和来源事务校验保持有效。

## Real Validation

- [x] M150 推理链完成真实非借贷案件验证。
- [x] Document AI 被真实调用。
- [ ] AI Sections 通过 Validator — 未通过，Evidence–Fact 错配被拒绝。
- [x] Document retry 已执行。
- [x] deterministic fallback 通过。
- [x] 未发布 Formal Document。
- [x] 未发现民间借贷污染。
- [x] fallback 达到律师可审核一稿最低标准。

该文档定义 LawDesk V1 Reasoning Freeze Checklist 官方规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

任何业务规则修改必须进入 V2。

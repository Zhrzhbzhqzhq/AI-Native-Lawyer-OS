# LawDesk V1 Reasoning Regression Tests

## 1. 测试安全要求

- 无数据库单元测试不得调用真实外部 AI。
- PostgreSQL workflow 测试只能使用隔离数据库 `lawdesk_rc_test`。
- 不得在开发数据库或生产数据库运行包含清理、发布和关系重建的 workflow 测试。
- 测试失败不得通过放宽来源闭环、启用伪数据或案件类型硬编码解决。

## 2. 无数据库单元测试

在仓库根目录执行：

```bash
pnpm --filter @lawdesk/backend exec vitest run \
  tests/evidence_intelligence.test.ts \
  tests/factQualityGuard.test.ts \
  tests/factGenerationReliability.test.ts \
  tests/issueIntelligence.test.ts \
  tests/issueReasoningRecall.test.ts \
  tests/lawIntelligence.test.ts \
  tests/argumentIntelligence.test.ts \
  tests/argumentGenerationReliability.test.ts \
  tests/argumentSourceIntegrity.test.ts \
  tests/formalSemanticCodec.test.ts \
  tests/documentContextIntegrity.test.ts \
  tests/documentGenerationService.test.ts \
  tests/documentReasoningIntegration.test.ts \
  tests/document_pipeline.test.ts
```

## 3. PostgreSQL workflow 集成测试

先显式确认 URL 的数据库名是 `lawdesk_rc_test`，再执行：

```bash
DATABASE_URL='postgresql://<test-user>@localhost:5432/lawdesk_rc_test' \
pnpm --filter @lawdesk/backend exec vitest run \
  tests/factDraftWorkflow.test.ts \
  tests/issueDraftWorkflow.test.ts \
  tests/lawDraftWorkflow.test.ts \
  tests/argumentDraftWorkflow.test.ts \
  tests/document_draft_workflow.test.ts
```

不得将 `<test-user>` 示例原样用于执行；必须使用本机已配置的隔离测试账户。

## 4. Backend Build

```bash
pnpm --filter @lawdesk/backend build
```

## 5. Git 差异检查

```bash
git diff --check
```

## 6. 冻结通过标准

- 无数据库单元测试全部通过。
- Backend build 通过。
- `git diff --check` 通过。
- PostgreSQL workflow 无正确测试库时必须记录为 BLOCKED，不得登记 PASS。
- Document AI 真实验证与 deterministic fallback 状态必须如实记录。

## 7. 本轮冻结结果

- 无数据库单元测试：PASS，14 个测试文件、84 项测试通过。
- Backend build：PASS。
- `git diff --check`：PASS。
- PostgreSQL workflow：BLOCKED，当前未确认 `DATABASE_URL` 指向 `lawdesk_rc_test`。
- 测试过程可能写入 `apps/backend/logs/ai_validation_runtime.jsonl`；该运行日志必须从冻结 Commit 排除，不得读取或提交正文。

该文档定义 LawDesk V1 Reasoning Regression Tests 官方规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

任何业务规则修改必须进入 V2。

# LawDesk V1 Legal Reasoning Baseline

## 1. Baseline 定义

本 Baseline 冻结 LawDesk V1 的正式法律推理主链：

```text
Material
→ Evidence
→ Fact
→ Issue
→ Law
→ Argument
→ DocumentDraft
→ Lawyer Review
→ Formal Document
```

AI 负责分析、建议和表达。业务对象保存事实，律师拥有确认、修改、发布和最终法律判断权。

## 2. 冻结模块

| 模块 | 已冻结能力 |
| --- | --- |
| M150.1 Fact Context Injection | Fact AI 接收 Matter、Material、Evidence 的受控案件上下文。 |
| M150.2 Evidence Integrity Repair | Evidence Draft 由真实 Material 中性生成，不使用固定民间借贷模板。 |
| M150.3 Fact Quality Guard | Fact 保持事实边界、Evidence 来源和律师确认流程，拒绝明确法律评价。 |
| M150.3.1 Fact Generation Reliability | Fact 使用独立 token 预算，对截断、JSON 和 Validator 失败进行一次紧凑 retry。 |
| M150.4 Issue Intelligence | Issue 保持开放争点表达及 Issue → Fact → Evidence 闭环。 |
| M150.4.1 Issue Reasoning Recall | 通用 Issue 不再被旧案件概念推断误杀，同时保留来源安全。 |
| M150.5 Law Intelligence | Law 分离 rule、application、limitations，并绑定唯一有效 Issue 范围。 |
| M150.6 Argument Intelligence | Argument 分离 position、reasoning、counter、response、risk，并对应唯一 Issue。 |
| M150.6.1 Argument Generation Reliability | Argument 使用独立 token 预算，对截断、解析和 Validator 失败进行一次 retry。 |
| M150.6.2 Argument Source Integrity | Argument Fact/Law 必须属于当前 Issue Scope，不允许跨 Scope 引用。 |
| M155 Formal Semantic Preservation | Formal Law/Argument 通过 FormalSemanticCodec 在不修改 Schema 的情况下保存结构语义并兼容旧数据。 |
| M160.2 Document Context Integrity | Document Context 只接收来源闭环完整的 Formal Argument Scope。 |
| M160.3 Document Reasoning Integration | Document AI 只组织有效 Formal Argument Scope；Sections 失败时 retry，再安全 fallback。 |

## 3. 核心不变量

- Evidence 必须来源于真实 Material。
- Fact 必须来源于 Formal Evidence。
- Fact 不得包含法律评价。
- Issue 必须来源于 Fact，并保持开放式争点。
- Law 必须对应 Issue。
- Argument 必须对应唯一 Issue。
- Argument Fact/Law 不得跨 Scope。
- Formal Law/Argument 结构语义必须通过 FormalSemanticCodec 保存和解析。
- Document 只能消费有效 Formal Argument Scope。
- Document 不得重新创造 Fact、Issue、Law 或 Argument。
- AI Document 失败必须安全 retry，再进入 deterministic fallback。
- fallback 不得恢复固定民间借贷模板。
- Formal Document 发布必须经过律师审核。
- 律师拥有最终决定权。

## 4. 当前可靠性机制

- Fact 专用输出预算与最多一次 compact retry。
- Argument 专用输出预算与最多一次 compact retry。
- Document 专用 6000 token 预算与最多一次 compact retry。
- `finish_reason=length` 与 `stop_reason=max_tokens` 触发 retry。
- JSON parse failure 与 Validator failure 触发 retry。
- Document retry 复用完全相同的 DocumentReasoningScope。
- 两次 Document AI 失败后丢弃全部 AI Sections，并进入 deterministic fallback。
- 不保存空输出、半截 Fact、半截 Argument 或半截 Document Sections。
- 未发布 DocumentDraft 按 Matter 和 document type 保持幂等。
- Formal 发布使用数据库 transaction，并重新校验来源。
- 所有来源查询及发布校验保持 Matter isolation。

## 5. 当前来源闭环

```text
Argument
→ Issue
→ Fact
→ Evidence

Argument
→ Law
→ Issue

Document
→ Argument
→ Issue / Fact / Law / Evidence
```

DocumentDraft 保存实际使用的 Argument、Issue、Fact、Law ID；Formal Document 发布时重新校验来源并建立 DocumentArgument、DocumentIssue、DocumentFact、DocumentLaw 关系。

## 6. 当前真实验证

瑞峰设备采购案件仅作为回归验证记录，不构成生产规则。

| 项目 | 结果 |
| --- | --- |
| Matter ID | `m150-rf-mrror8pu-269hdm` |
| Material | 9 |
| Evidence | 9 |
| Fact | 7 |
| Issue | 4 |
| Law | 4 |
| Argument | 3 |
| DocumentDraft | 1 |
| Document AI | 两次调用均正常结束，但 Evidence–Fact 错配被 Sections Validator 拒绝。 |
| Retry | 已执行，仍未通过 Validator。 |
| Fallback | deterministic fallback 成功生成来源安全的 Draft。 |
| Formal Document | 未生成。 |
| 案件类型污染 | 未出现民间借贷污染。 |
| 可用性 | 达到律师可继续审核修改的一稿最低标准，不可直接提交。 |

## 7. 当前已知限制

- Document AI 本次真实验证未通过 Sections Validator。
- deterministic fallback 文风仍偏内部分析。
- 当事人、法院、案号和程序信息缺少可靠结构化来源。
- 诉讼请求仍必须由律师确认。
- 法条真实性仍需律师核验。
- Argument 正文可能偶发辅助引用未声明事实。
- Material 长文本利用仍有限。
- 当前 Document 主链仅支持 complaint。
- 旧 Intake 文书旁路和直接 Formal CRUD 尚未完全统一。
- PostgreSQL workflow 测试尚未在正确的 `lawdesk_rc_test` 测试库完成本轮冻结验证。
- DOCX 仍为简单文本导出。

## 8. 主链与旧路径审计

- `DocumentDraftService.generateDraft()` 和 `regenerateDraft()` 使用 Document Context、DocumentReasoningScope、DocumentGenerationService、Sections Validator、Renderer 与 deterministic fallback。
- `DocumentPipeline.run()` 委托 `DocumentDraftService.generateDraft()`。
- `POST /matters/:matter_id/documents/analyze` 委托 `DocumentDraftService.generateDraft()`，不创建 Formal Document。
- 主 DocumentDraft 路径不调用旧 `buildDocumentPrompt()`、`AIService.generateDocuments()` 或 `validateDocuments()`。
- 旧方法暂时保留为 legacy compatibility code，不属于冻结后的 DocumentDraft 生产主链。
- 主链不存在固定民间借贷 complaint builder。

## 9. FormalSemanticCodec 消费审计

- Argument 发布通过 `serializeFormalArgumentV2()` 保存语义。
- Law 发布通过 `serializeFormalLawV2()` 保存语义。
- Document Context 通过 `parseFormalArgument()` 和 `parseFormalLaw()` 恢复语义。
- Argument AI 通过 `parseFormalLaw()` 读取 Formal Law。
- LawService、ArgumentService 及 Draft 发布响应通过 display formatter 返回人类可读内容。
- V2 marker 不进入 Argument Prompt、Document Prompt、DocumentDraft 正文或 DOCX。
- Frontend 不需要理解或解析 Codec。

## 10. 后续开发规则

后续 M160.4 及 V2 开发必须：

- 以本 Baseline 为上游。
- 不绕过 Formal Chain。
- 不通过案件类型硬编码修复输出。
- 不以放宽来源闭环换取召回率。
- 不删除 retry 或 deterministic fallback。
- 不允许旧模板重新进入主链。
- 修改 Baseline 行为时必须新增回归测试并更新本 Baseline 文档。

该文档定义 LawDesk V1 Legal Reasoning Baseline 官方规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

任何业务规则修改必须进入 V2。

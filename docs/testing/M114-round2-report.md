# M114 第二轮回归测试

Evidence：
评分：7/10
问题：
- 推荐了身份证、聊天记录、银行转账记录、借条等合理证据类型；未见重复推荐。
- 问题：推荐文本较为泛化（reason 字段均为“材料可能包含有力证据”），缺少针对本案的具体说明与优先级理由；无法确认是否全部为“真正缺失”的证据（部分可能已存在）。

Fact：
评分：3/10
问题：
- 输出未包含 `category`（confirmed / to_prove / disputed）及 `evidence_titles` 字段，无法验证 confirmed 是否引用了证据。
- 输出为简短条目，缺少对“待证明事实”应说明缺失证据的具体描述。
- 建议：必须在事实中保留并填充 `evidence_titles`，并为 to_prove 明确列出缺失证据项。

Issue：
评分：6/10
问题：
- 生成了争议焦点项（示例：需确认：借款事实），但是由于事实缺少类别与证据映射，无法确信焦点是否严格来源于 confirmed/disputed。
- 建议：在 Issue 生成前，Facts 必须包含明确的 `category` 与 `evidence_titles`，以便验证 Issue 是否引用了 to_prove（应被禁止）。

Law：
评分：2/10
问题：
- 返回项 `citation` 为空，未提供具体法条引用；`description` 未按【适用原因】【证明作用】【支持结论】三段结构给出。
- 违反了新的引用约束（必须绑定 `issue_title`、具体 citation、结构化说明）。
- 建议：Law AI 必须返回具体 citation 且按三段式说明其适用性与证明作用，且最多 2 条/争议焦点。

Argument：
评分：3/10
问题：
- 论证条目描述泛化，缺少 `fact_titles` 与 `law_citations` 字段，结论为占位性文字（"可主张..."），未体现固定推理顺序中的各环节明确衔接。
- 如果存在 disputed facts，应在论证中标注“该事实存在争议，需要结合证据进一步证明。”
- 建议：Argument 必须列出 `fact_titles`（只允许 confirmed），`law_citations`，并在 `description` 中按 Issue→Facts→Laws→Reasoning 顺序组织论证。

Document：
评分：0/10
问题：
- 未生成文书草稿（返回空数组）。
- 建议：Document AI 必须基于已确认的 facts、issues、laws、arguments 生成可直接交律师编辑的中文文书初稿。

---

最终：

Average：3.5/10
是否达到 Beta：NO

P0（必须修复）：
- Facts：必须输出 `category` 与 `evidence_titles`，confirmed 必含 evidence_titles；to_prove 必说明缺失证据项。
- Law：`citation` 必须具体且非空；`description` 必包含【适用原因】【证明作用】【支持结论】三部分；每条 law 必绑定 `issue_title`。
- Argument：必须包含 `fact_titles`（仅 confirmed）、`law_citations`，并按照固定顺序组织论证，结论可直接用于文书。
- Document：必须生成至少一份可编辑的起诉状或代理词初稿。

P1（可改进）：
- Evidence：提高推荐的针对性和具体性，reason 中说明为何该证据对当前案件关键以及优先级排序理由。
- Issues：在 facts 完整后，确保 Issue 只来自 confirmed/disputed，避免引用 to_prove。
- System UX：在输出中保留原始证据 id/title 映射以便前端快速关联。


执行记录：
- ./scripts/check.sh — 通过（frontend build + backend typecheck）。
- bash scripts/alpha-test-v2.sh — 通过（AI workflow 执行并在 /tmp/m114 生成 outputs）。


生成时间：自动化回归（本地）

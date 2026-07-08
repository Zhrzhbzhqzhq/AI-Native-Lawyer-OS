# M112 完成报告

## 1. 本阶段完成内容
- AIContextBuilder：构建并标准化传入 AI 的上下文。
- AIPromptTemplates：引入并版本化 prompt 模板（PROMPT_VERSION=v1）。
- AIService：将 `user_prompt` 纳入 promptPack，统一调用并使用 `parseAIJson` 解析模型输出；修复 `analyzeEvidence` 的 DTO 映射。
- MiniMax Provider：`minimaxAdapter` 支持 prompt_version、超时（默认 45s）、重试（针对 429/502/503/504）、并将调用埋点到 `aiRuntimeLogger`。
- Mock Fallback：保留并改进 `MockLlmAdapter` 作为无 API Key 或不可用时的回退实现。
- 六个 Workspace AI：将相同调用模式扩展到 Evidence、Facts、Issues、Laws、Arguments、Documents（服务端实现）。
- DTO Mapping 修复：`analyzeEvidence` 中优先使用 `reason`，若缺失则回退使用 `description`，并去除多余空白。

## 2. 验证结果
- `./scripts/check.sh`：构建与类型检查通过（frontend build + backend tsc）。
- `bash scripts/alpha-test-v2.sh`：端到端脚本执行通过，报告输出为 `docs/testing/alpha-test-report-v2.md`（Evidence/Fact/Issue/Law/Argument/Document 均标记通过，Evidence AI 映射通过）。
- Provider Runtime：引入 `aiRuntimeLogger`（JSONL + 简短报告行），记录请求/响应时间、重试与超时状况；MiniMax 调用实现重试与超时保护。
- MiniMax：在设置 `AI_PROVIDER=minimax` 且提供 `MINIMAX_API_KEY` 的情况下，后端实际调用 MiniMax 慧答接口，`choices[0].message.content` 使用 `parseAIJson` 提取并解析为 JSON 对象。

## 3. 最终 Commit
6bba479

## 4. 输出
M112 Status：COMPLETE

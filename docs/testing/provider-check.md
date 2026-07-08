# Provider Check

## Provider

- MiniMax: Stub (adapter implemented, requires `MINIMAX_API_KEY` to be callable)
- OpenAI: Stub (no adapter implemented in `apps/backend/src/ai`)
- Mock: ✅ (implemented and used as fallback)

## 配置检查

- `.env` contains `AI_MODEL_PROVIDER`, `AI_MODEL_NAME`, `AI_API_KEY` but NOT `AI_PROVIDER`.
- `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_REGION`, `MINIMAX_AUTH_MODE` are not set in `.env`.
- `TIMEOUT` not present.

Required env vars for providers observed in code:

- `AI_PROVIDER` (used by `ProviderManager`)
- `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_REGION`, `MINIMAX_AUTH_MODE`, `MINIMAX_MODEL`

## 调用结果

The minimal test `scripts/test-provider.ts` ran `AIService.analyzeEvidence('test-matter-0001')` with a mocked Prisma client.

Output (summary):

- adapter: `MockLlmAdapter`
- provider (response): `mock`
- model (response): `mock-lawdesk-v1`
- request: includes `task: analyze_evidence`, `matter_id`, `materials`, and a `context_pack` with matter/materials/evidence/facts/issues/laws/arguments/documents
- response: deterministic mock response with `summary` and `next_steps` array

Full request/response logged to console when running the test script.

## 是否可替换 Mock

NO — Not in current environment. To replace Mock with MiniMax, set:

- `AI_PROVIDER=minimax`
- `MINIMAX_API_KEY=...` (valid key)
- optionally `MINIMAX_BASE_URL` / `MINIMAX_REGION` / `MINIMAX_AUTH_MODE`

Once those are set, `ProviderManager` will instantiate `MiniMaxAdapter` (or `MiniMaxAnthropicAdapter` when `MINIMAX_AUTH_MODE=token_plan`) and real requests will be issued.

## 存在问题

- Environment variable names in `.env` use `AI_MODEL_PROVIDER` / `AI_MODEL_NAME` / `AI_API_KEY`, while code expects `AI_PROVIDER` and provider-specific vars (`MINIMAX_*`). This can cause confusion and fallback to mock.
- No OpenAI adapter exists in `apps/backend/src/ai` despite `.env` defaulting to `openai` in the template.
- `scripts/test-provider.ts` uses a mocked Prisma — for a full integration test a real DB connection and real matter_id are required.

## Provider 配置说明（建议添加到 `.env`）

- `AI_PROVIDER=mock|minimax`

- `MINIMAX_API_KEY=` (required to use MiniMax)
- `MINIMAX_BASE_URL=` (optional override)
- `MINIMAX_MODEL=` (optional model name, default `MiniMax-M3`)

说明：

1. 默认：`AI_PROVIDER=mock`。系统在没有额外配置时使用 Mock adapter。
2. 如果未配置 `MINIMAX_API_KEY`，必须继续使用 `mock`，并且不得关闭 fallback。不要更改 `AIService`。
3. 只有当 `AI_PROVIDER=minimax` 且 `MINIMAX_API_KEY` 存在时，`ProviderManager` 才允许切换到 MiniMax（或 token_plan 模式下的 Anthropic 兼容适配器）。

请将上述示例变量添加到 `.env.example` 并在部署环境中设置真实凭据以启用 MiniMax。

## MiniMax CN 订阅说明

- 如果你购买了 MiniMax 的中国区（CN）订阅，请在本地 `.env` 中设置：

	```
	AI_PROVIDER=minimax
	MINIMAX_BASE_URL=https://api.minimax.chat/v1
	MINIMAX_MODEL=MiniMax-M3
	MINIMAX_API_KEY=sk-cp-***  # 请仅在本地设置真实 Key，勿提交到仓库
	```

- 规则：
	1. CN 订阅必须配置 `MINIMAX_BASE_URL=https://api.minimax.chat/v1` 才能正确路由到国内 endpoint。
	2. 未配置 `MINIMAX_API_KEY` 时，系统应继续使用 `mock` 回退，不得关闭 fallback。
	3. 不要在任何提交中包含真实 API Key；将真实 Key 存放在 `.env` 或安全的秘钥存储中。

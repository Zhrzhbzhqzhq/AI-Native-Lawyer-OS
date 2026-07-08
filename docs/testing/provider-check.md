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

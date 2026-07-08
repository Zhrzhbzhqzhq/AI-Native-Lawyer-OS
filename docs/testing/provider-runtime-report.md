# Provider Runtime Report

Date: 2026-07-08T20:02:00+08:00

Matter: alpha-1783512087

- Provider used by runtime: mock (no MiniMax API key detected)
- HTTP: all analyze/generate endpoints returned 200
- Returned real AI (MiniMax): no — responses were produced by deterministic fallback/mock
- JSON parse: not applicable for mock/fallback responses (arrays returned directly)
- Fallback triggered: yes (Evidence, Facts, Issues, Laws, Arguments, Documents)
- Accept / Create operations: all created successfully (HTTP 201 as noted by alpha test)
- Data written to DB: yes (created matter/materials/evidence/fact/issue/law/argument/document)

Statistics (measured via direct endpoint calls):
- Average response time: 0.0093s
- Slowest response: 0.0117s (laws.analyze)
- Fallback count: 6
- Retry count: 0 (no provider retries observed)
- Prompt Version: v1 (default; not applied because MiniMax was not used)

Notes:
- The runtime in this environment did not have `MINIMAX_API_KEY`/configured provider, so the system used the mock adapter and fallback behaviors. To validate MiniMax end-to-end, ensure `AI_PROVIDER=minimax` and `MINIMAX_API_KEY` are set in the backend process environment and re-run the alpha test.
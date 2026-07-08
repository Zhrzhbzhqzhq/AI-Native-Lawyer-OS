# M115 Runtime Validation Report

This document records the runtime validation outputs for M115.

Log file location (updated):

- `apps/backend/logs/ai_validation_runtime.jsonl`

Please use the above absolute workspace-relative path to locate the JSONL runtime validation logs.

Summary:

- Validation logs are written as JSONL, one entry per line.
- Each entry includes: `timestamp`, `module` (Facts|Laws|Arguments|Documents), `provider`, `model`, `validation` (PASS|FAIL), `retry` (0|1), `fallback` (boolean), `missing_fields` (array), `latency_ms` (number|null).

How to inspect:

```bash
# find the runtime log
ls -la apps/backend/logs/ai_validation_runtime.jsonl
# tail recent lines
tail -n 50 apps/backend/logs/ai_validation_runtime.jsonl
```

If you previously looked for `logs/ai_validation_runtime.jsonl`, please update scripts and documentation to use `apps/backend/logs/ai_validation_runtime.jsonl` instead.

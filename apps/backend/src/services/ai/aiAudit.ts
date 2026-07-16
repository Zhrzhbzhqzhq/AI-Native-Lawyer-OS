export type AIAudit = {
  provider: string
  model: string
  prompt_version: string
  fallback_used: boolean
}

export type StageAIAudit = AIAudit & {
  stage: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isAIAudit(value: unknown): value is AIAudit {
  if (!isRecord(value)) return false

  return (
    typeof value.provider === 'string' && value.provider.trim().length > 0
    && typeof value.model === 'string' && value.model.trim().length > 0
    && typeof value.prompt_version === 'string' && value.prompt_version.trim().length > 0
    && typeof value.fallback_used === 'boolean'
  )
}

export function readAIAudit(value: unknown): AIAudit | null {
  if (!isRecord(value) || !isAIAudit(value.ai_audit)) return null
  return { ...value.ai_audit }
}

export function createAIAudit(
  provider: string,
  model: string,
  promptVersion: string,
  fallbackUsed = false,
): AIAudit {
  return {
    provider,
    model,
    prompt_version: promptVersion,
    fallback_used: fallbackUsed,
  }
}

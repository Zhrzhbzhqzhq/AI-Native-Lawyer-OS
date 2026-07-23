import { existsSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnvironment } from 'dotenv'
import ProviderManager from '../apps/backend/src/ai/providerManager'
import { parseAIJson } from '../apps/backend/src/services/ai/parseAIJson'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backendEnvironmentPath = path.join(repositoryRoot, 'apps/backend/.env')
const environment = loadEnvironment({ path: backendEnvironmentPath, override: true })

if (environment.error) throw environment.error
if (!process.env.MINIMAX_API_KEY) throw new Error('experiment_minimax_api_key_missing:apps/backend/.env')

process.env.AI_PROVIDER = 'minimax'
process.env.MINIMAX_AUTH_MODE = 'api_key'
process.env.MINIMAX_REGION = 'cn'
process.env.MINIMAX_MODEL = 'MiniMax-M3'
delete process.env.MINIMAX_BASE_URL
delete process.env.MINIMAX_TOKEN_BASE_URL

type CaseMaterial = {
  id: string
  title: string
  content: string
}

type ExperimentCaseInput = {
  case_id: string
  title: string
  context: unknown
  lawyer_goal?: unknown
  lawyerGoal?: unknown
  objective?: unknown
  instructions?: unknown
}

const benchmarkRoot = path.resolve(
  repositoryRoot,
  'test-data/case-intelligence-benchmark/cases',
)

const experimentRuntime = {
  provider: 'minimax',
  adapter: 'MiniMaxAdapter',
  endpoint: 'https://api.minimaxi.com/v1/chat/completions',
  authSource: 'MINIMAX_API_KEY from apps/backend/.env',
  model: 'MiniMax-M3',
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value === undefined || value === null) return ''
  return JSON.stringify(value, null, 2)
}

function contextMaterials(context: unknown): CaseMaterial[] {
  if (!Array.isArray(context)) {
    const content = asText(context)
    return content ? [{ id: 'case-context', title: '案件上下文', content }] : []
  }

  return context.flatMap((item, index) => {
    if (typeof item === 'string') {
      return [{ id: `material-${index + 1}`, title: `材料 ${index + 1}`, content: item }]
    }
    if (!item || typeof item !== 'object') return []
    const material = item as Record<string, unknown>
    const content = asText(
      material.content
      ?? material.text
      ?? material.extracted_text
      ?? material.ocr_text
      ?? material.transcript,
    )
    if (!content) return []
    return [{
      id: asText(material.id || material.material_id) || `material-${index + 1}`,
      title: asText(material.title || material.name) || `材料 ${index + 1}`,
      content,
    }]
  })
}

async function additionalMaterialFiles(caseDirectory: string): Promise<CaseMaterial[]> {
  const materialsDirectory = path.join(caseDirectory, 'materials')
  if (!existsSync(materialsDirectory)) return []

  const entries = await readdir(materialsDirectory, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile() && /\.(md|txt|json)$/i.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))

  return Promise.all(files.map(async (entry, index) => ({
    id: `file-material-${index + 1}`,
    title: entry.name,
    content: await readFile(path.join(materialsDirectory, entry.name), 'utf8'),
  })))
}

function lawyerGoal(input: ExperimentCaseInput): string {
  return asText(
    input.lawyer_goal
    ?? input.lawyerGoal
    ?? input.objective
    ?? input.instructions,
  )
}

function buildRecoveryPrompt(
  input: ExperimentCaseInput,
  materials: CaseMaterial[],
): string {
  const materialBlock = materials.map((material, index) => [
    `材料 ${index + 1}`,
    `材料 ID：${material.id}`,
    `标题：${material.title}`,
    '正文：',
    material.content,
  ].join('\n')).join('\n\n---\n\n')
  const goal = lawyerGoal(input)

  return [
    '任务：模拟用户把完整案件材料直接提交给 LawDesk AI，请仅根据下方内容形成案件理解摘要。',
    '不得使用任何外部案件信息，不得把示例、常识或其他案件内容写入结果。',
    '请识别案件类型、当事人角色、核心经过、双方分歧、当前状态和仍需确认的信息。',
    '材料中的陈述、主张和争议必须保持其原有性质，不得改写为已确认结论。',
    '只输出一个合法 JSON 对象，不得输出 Markdown、代码块、前言或解释。',
    '输出结构：',
    JSON.stringify({
      caseTitle: '',
      caseType: '',
      summary: '',
      parties: [{ name: '', role: '', position: '' }],
      keyEvents: [''],
      disputes: [''],
      currentStatus: '',
      uncertainties: [''],
    }, null, 2),
    `案件标题：${input.title}`,
    goal ? `律师目标：${goal}` : '律师目标：未提供',
    `完整案件材料：\n${materialBlock}`,
  ].join('\n\n')
}

function responseContent(response: any): string {
  const body = response?.response !== undefined ? response.response : response
  return body?.choices?.[0]?.message?.content
    ?? body?.data?.choices?.[0]?.message?.content
    ?? (Array.isArray(body?.content)
      ? body.content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join('\n')
      : typeof body === 'string' ? body : '')
}

async function resolveCaseDirectory(argument: string): Promise<string> {
  const direct = path.resolve(process.cwd(), argument)
  if (existsSync(path.join(direct, 'case-input.json'))) return direct

  const byId = path.join(benchmarkRoot, argument)
  if (existsSync(path.join(byId, 'case-input.json'))) return byId

  throw new Error(`experiment_case_directory_invalid:${argument}`)
}

async function runCase(caseDirectory: string) {
  const inputPath = path.join(caseDirectory, 'case-input.json')
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as ExperimentCaseInput
  if (!input.case_id || !input.title) throw new Error(`experiment_case_input_invalid:${inputPath}`)

  const embeddedMaterials = contextMaterials(input.context)
  const fileMaterials = await additionalMaterialFiles(caseDirectory)
  const materials = [...embeddedMaterials, ...fileMaterials]
  if (materials.length === 0) throw new Error(`experiment_materials_missing:${input.case_id}`)

  const prompt = buildRecoveryPrompt(input, materials)
  const adapter = ProviderManager.getAdapter()
  let output: {
    caseId: string
    model: string
    promptLength: number
    rawResponse: unknown
    parsedSummary: unknown
  }
  try {
    const response = await adapter.generate({
      prompt_version: 'context-recovery-experiment-v1',
      task: 'context_recovery_experiment',
      matter_id: input.case_id,
      max_completion_tokens: 3000,
      system_prompt: '你是 LawDesk 案件理解实验助手。仅依据用户提供的完整材料输出指定 JSON。',
      user_prompt: prompt,
    })
    const content = responseContent(response)
    const parsed = content ? parseAIJson(content) : { ok: false, data: null, error: 'empty_response' }
    output = {
      caseId: input.case_id,
      model: String(response?.model || process.env.MINIMAX_MODEL || process.env.AI_MODEL || ''),
      promptLength: prompt.length,
      rawResponse: response,
      parsedSummary: parsed.ok ? parsed.data : {
        parseError: parsed.error || 'response_not_json',
        rawText: content,
      },
    }
  } catch (error) {
    output = {
      caseId: input.case_id,
      model: String(process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'),
      promptLength: prompt.length,
      rawResponse: {
        error: error instanceof Error ? error.message : String(error),
        provider: 'minimax',
      },
      parsedSummary: null,
    }
  }
  const outputPath = path.join(caseDirectory, 'case-understanding-recovery.json')
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  return { caseId: input.case_id, outputPath, promptLength: prompt.length, parsedSummary: output.parsedSummary }
}

async function main() {
  const requested = process.argv.slice(2).filter((argument) => argument !== '--')
  const cases = requested.length > 0 ? requested : ['case-003', 'case-004']
  const results = []
  for (const argument of cases) {
    results.push(await runCase(await resolveCaseDirectory(argument)))
  }
  process.stdout.write(`${JSON.stringify({
    experiment: 'context-recovery',
    runtime: experimentRuntime,
    results,
  }, null, 2)}\n`)
}

main().catch((error) => {
  process.stderr.write(`Context recovery experiment failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

import type { PrismaClient } from '@lawdesk/database'
import MatterContextBuilder from './context/MatterContextBuilder'
import { buildEvidencePrompt, buildFactPrompt, buildDocumentPrompt } from './AIPromptTemplates'
import AIService from './AIService'

export type PromptRunnerInput = {
    matterId: string
    promptType: 'evidence' | 'research' | 'document'
    systemPrompt?: string
}

export type PromptRunnerOutput = {
    text: string
    provider?: string
    model?: string
}

export class PromptRunner {
    prisma: PrismaClient
    contextBuilder: MatterContextBuilder
    aiService: AIService

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.contextBuilder = new MatterContextBuilder(prisma)
        this.aiService = new AIService(prisma)
    }

    async run(input: PromptRunnerInput): Promise<PromptRunnerOutput> {
        const { matterId, promptType, systemPrompt } = input

        // build matter context (read-only)
        const context = await this.contextBuilder.build(matterId)
        if (!context || !context.matter) {
            throw new Error('matter_not_found')
        }

        // select prompt template
        let promptText: string
        if (promptType === 'evidence') {
            promptText = buildEvidencePrompt(context)
        } else if (promptType === 'research') {
            promptText = buildFactPrompt(context)
        } else if (promptType === 'document') {
            promptText = buildDocumentPrompt(context)
        } else {
            throw new Error('unsupported_prompt_type')
        }

        if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.length) {
            // allow caller to override or prepend system prompt
            promptText = `${systemPrompt}\n\n${promptText}`
        }

        // build a generic prompt pack and delegate to AIService adapter via service instance
        const promptPack: any = {
            task: `prompt_runner_${promptType}`,
            matter_id: matterId,
            context_pack: context,
            user_prompt: promptText,
            created_at: new Date().toISOString(),
        }

        try {
            // Use aiService.adapter to generate so we reuse configured adapter
            const adapter = (this.aiService as any).adapter
            if (!adapter || typeof adapter.generate !== 'function') {
                throw new Error('ai_service_error')
            }
            const resp = await adapter.generate(promptPack)

            // extract text in common shapes
            let text = ''
            if (resp) {
                if (resp.response && typeof resp.response === 'string') text = resp.response
                else if (resp.response && resp.response.choices && Array.isArray(resp.response.choices) && resp.response.choices[0] && resp.response.choices[0].message && typeof resp.response.choices[0].message.content === 'string') {
                    text = resp.response.choices[0].message.content
                } else if (resp.response && typeof resp.response === 'object') text = JSON.stringify(resp.response)
                else if (typeof resp === 'string') text = resp
            }

            return { text: String(text || ''), provider: resp && resp.provider ? resp.provider : undefined, model: resp && resp.model ? resp.model : undefined }
        } catch (e: any) {
            // surface a safe business error while preserving original message
            const err = new Error(`ai_service_error${e && e.message ? `: ${e.message}` : ''}`)
            throw err
        }
    }
}

export default PromptRunner

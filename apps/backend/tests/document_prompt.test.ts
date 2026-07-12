import { test, expect } from 'vitest'
import { buildDocumentPrompt } from '../src/services/ai/AIPromptTemplates'

test('Document prompt uses matter title names and detected amounts and forbids bad placeholders', async () => {
    const fakeContext = {
        matter: { matter_id: 'm-test', title: '民事案件：原告 张三 VS 被告 李四' },
        client: null,
        materials: [{ title: '借款合同-人民币100,000元' }],
        evidence: [{ title: '借款合同扫描件' }],
        research: [],
        documents: []
    }

    const p = buildDocumentPrompt(fakeContext)

    // must include plaintiff and defendant names extracted from title
    expect(p).toContain('张三')
    expect(p).toContain('李四')

    // must point to detected amount (100000)
    expect(p).toMatch(/1000+00|100000/)

    // must not contain forbidden placeholders inside the prompt template
    expect(p).not.toContain('[XXXX]')
    expect(p).not.toContain('[X]')
    expect(p).not.toContain('[XXXXXXXX]')

    // must allow or mention [待补充] as the standardized placeholder
    expect(p).toContain('[待补充]')
})

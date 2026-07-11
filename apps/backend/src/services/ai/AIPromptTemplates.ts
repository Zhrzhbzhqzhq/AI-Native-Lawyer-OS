import EVIDENCE_PROMPT from '../../prompts/evidence/prompt'
import FACT_PROMPT from '../../prompts/research/fact_prompt'
import ISSUE_PROMPT from '../../prompts/research/issue_prompt'
import LAW_PROMPT from '../../prompts/research/law_prompt'

// Simple prompt template exporters
// Each function returns the task identifier / short description
// used by AIService when building the promptPack.

export function buildEvidencePrompt(_context: any) {
    return EVIDENCE_PROMPT
}

export function buildFactPrompt(_context: any) {
    return FACT_PROMPT
}

export function buildIssuePrompt(_context: any) {
    return ISSUE_PROMPT
}

export function buildLawPrompt(_context: any) {
    return LAW_PROMPT
}

export function buildArgumentPrompt(_context: any) {
    const facts = Array.isArray(_context && _context.facts) ? _context.facts : []
    const issues = Array.isArray(_context && _context.issues) ? _context.issues : []
    const laws = Array.isArray(_context && _context.laws) ? _context.laws : []
    return `你是一名中国资深民商事诉讼律师。

下面是已确认的案件事实：
${JSON.stringify(facts, null, 2)}

下面是争议焦点：
${JSON.stringify(issues, null, 2)}

下面是可适用的法律依据：
${JSON.stringify(laws, null, 2)}

任务：请围绕每一个重要争议焦点，组织可直接进入代理词、起诉状理由或庭审陈述的法律论证。

任务：请围绕每一个重要争议焦点，组织可直接进入代理词、起诉状理由或庭审陈述的法律论证。

严格推理与格式要求（必须遵守）：
1) 每条 Argument 必须对应一个 'issue_title'（在返回项中以 'issue_title' 字段标明对应争议焦点）。
2) 每条 Argument 必须至少引用一条已确认的事实（confirmed Fact）；在返回项中以 'fact_titles' 字段列出所引用的已确认事实标题数组。
3) 不允许引用 'to_prove'（待证明）事实；若输入上下文包含 'to_prove' 事实，禁止在 'fact_titles' 中列出它们。
4) 如引用 'disputed'（存在争议）事实，必须在对应论证中明确写明："该事实存在争议，需要结合证据进一步证明。"
5) 每条 Argument 必须至少引用一条法律依据（'law_citations' 数组）。
6) 推理必须遵循固定顺序且不得跳步：
     ① Issue
     ↓
     ② Confirmed Facts
     ↓
     ③ Applicable Laws
     ↓
     ④ Legal Reasoning
     ↓
     ⑤ Conclusion
     说明：不要在缺少事实或法律支持的情况下直接得出结论。
7) 'conclusion' 必须能直接用于起诉状、代理词或庭审陈述（语言应简洁、结论性强）。
8) 严禁编造事实或法条；不得输出 AI 风格的叙述或泛泛作文；不得跳过事实直接得出结论。

返回 JSON（严格）格式：
[
    {
        "title": "",
        "issue_title": "",
        "fact_titles": [],
        "law_citations": [],
        "description": "",  // 按顺序包含：Issue -> Confirmed Facts -> Applicable Laws -> Legal Reasoning
        "conclusion": ""
    }
]

字段说明：
 - 'fact_titles'：引用的 confirmed Fact 标题数组（不得包含 to_prove）。
 - 'law_citations'：引用的法律依据 citation 数组。

严格要求：
- 只返回合法的 JSON 数组；
- 不输出 Markdown、解释或正文外的任何内容；
 - 不引用 to_prove Facts；
 - 每条 Argument 必须引用至少一条 confirmed Fact 和至少一条 law_citation；
- 不得编造事实或法条；
- 论证必须遵循规定的推理顺序。

只返回 JSON。`
}

export function buildDocumentPrompt(_context: any) {
    const facts = Array.isArray(_context && _context.facts) ? _context.facts : []
    const issues = Array.isArray(_context && _context.issues) ? _context.issues : []
    const laws = Array.isArray(_context && _context.laws) ? _context.laws : []
    const argumentsList = Array.isArray(_context && _context.arguments) ? _context.arguments : []
    return `你是一名中国资深民商事诉讼律师。

下面提供：

案件事实：
${JSON.stringify(facts, null, 2)}

争议焦点：
${JSON.stringify(issues, null, 2)}

法律依据：
${JSON.stringify(laws, null, 2)}

法律论证：
${JSON.stringify(argumentsList, null, 2)}

任务：请基于以上案件事实、争议焦点、法律依据与法律论证，生成可编辑的法律文书初稿，必须至少包含：
1. 起诉状（诉状） — 必选
2. 证据目录（清单） — 必选
可选：代理词、庭审提纲（如信息足够可生成）

严格内容要求（必须遵守）：
1) 返回至少 2 份文书，且必须包含“起诉状”和“证据目录”；
2) 每份文书的 "content" 必须为中文完整正文，长度不少于 300 字；
3) "content" 中必须包含关键段落：诉讼请求、事实与理由、证据清单或证明目的；
4) 严禁使用占位词或模板标记（如“……”、“待补充”、“某某”、“此处填写”、“模板”、“占位”等）；
5) 起诉状应包含：当事人信息（能写多少写多少）、诉讼请求、事实与理由、证据清单；若部分信息缺失，请使用“根据现有材料可初步表述为：”并以此为前缀给出初稿；
6) 证据目录应按证据项列明证据标题与证明目的，每项至少一句说明其证明目的；
7) 不要编造新的事实或不存在的法条；当信息不足时以“根据现有材料可初步表述为：”开头并完整写出正文，而非空缺或占位；
8) 最多返回 4 份文书，按律师使用优先级排序（起诉状第一，证据目录第二）；

返回格式（严格 JSON 数组，元素示例如下）：
[
    {
        "title": "起诉状（针对某某案）",
        "document_type": "起诉状",
        "content": "...中文完整正文，不少于300字，包含诉讼请求、事实与理由、证据清单或证明目的..."
    },
    {
        "title": "证据目录",
        "document_type": "证据目录",
        "content": "...中文完整证据清单正文，不少于300字，每项说明证明目的..."
    }
]

严格要求：
- 只返回合法 JSON 数组；
- 不输出 Markdown、额外注释或非 JSON 内容；
- content 必须可直接复制到文书编辑器进行修改。

只返回 JSON.`
}

export default {
    buildEvidencePrompt,
    buildFactPrompt,
    buildIssuePrompt,
    buildLawPrompt,
    buildArgumentPrompt,
    buildDocumentPrompt,
}

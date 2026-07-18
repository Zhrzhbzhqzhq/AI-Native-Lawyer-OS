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
    const facts = Array.isArray(_context && _context.facts) ? _context.facts : []

    return `${ISSUE_PROMPT}

以下是本案已有事实（Facts）：
${JSON.stringify(facts, null, 2)}

每个争议焦点（Issue）必须建立在上述已有案件事实基础上，并至少引用一个 Fact。

严格要求：
1. 每个 Issue 必须输出非空的 fact_titles 数组。
2. fact_titles 中的每个标题必须与输入 Facts 的 title 完全一致。
3. 不允许输出空 fact_titles。
4. 不允许编造、改写或概括 Fact 标题。
5. 不允许生成没有现有 Fact 支持的 Issue。

只返回合法 JSON 数组，不要输出 Markdown、代码块、解释或其他内容：
[
  {
    "title": "",
    "description": "",
    "fact_titles": [
      ""
    ],
    "ai_reasoning": "",
    "confidence": 0.9
  }
]`
}

export function buildLawPrompt(_context: any) {
    const matter = _context && _context.matter ? _context.matter : {}
    const facts = Array.isArray(_context && _context.facts) ? _context.facts : []
    const issues = Array.isArray(_context && _context.issues) ? _context.issues : []
    const evidence = Array.isArray(_context && _context.evidence) ? _context.evidence : []
    const materials = Array.isArray(_context && _context.materials) ? _context.materials : []

    return `${LAW_PROMPT}

案件（Matter）：
${JSON.stringify(matter, null, 2)}

已确认事实（Facts）：
${JSON.stringify(facts, null, 2)}

争议焦点（Issues）：
${JSON.stringify(issues, null, 2)}

证据（Evidence）：
${JSON.stringify(evidence, null, 2)}

原始材料（Materials）：
${JSON.stringify(materials, null, 2)}

请仅依据上述案件上下文生成法律依据草稿，不得编造案件事实或法律依据。

覆盖与数量要求（必须遵守）：
1. 必须覆盖输入的每一个争议焦点（Issue）。
2. 每个争议焦点至少返回一条法律依据，不允许只回答其中一个争议焦点。
3. 返回的法律依据数量不得少于输入的争议焦点数量。
4. 每条法律依据必须包含非空的 title、citation、description、issue_title。
5. issue_title 必须明确对应输入中的争议焦点标题。

只返回合法 JSON 数组，不要输出 Markdown、代码块、解释或其他内容：
[
  {
    "title": "",
    "citation": "",
    "description": "【适用原因】\n【证明作用】\n【支持结论】",
    "issue_title": ""
  }
]

每条 description 必须完整包含：【适用原因】、【证明作用】、【支持结论】。`
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

    const matter = _context && _context.matter ? _context.matter : {}
    const materials = Array.isArray(_context && _context.materials) ? _context.materials : []
    const evidence = Array.isArray(_context && _context.evidence) ? _context.evidence : []

    const matterTitle = matter.title || ''
    const court = (matter && (matter.court || matter.court_name || matter.courtName)) || ''

    const evidenceTitles = evidence.map((e: any) => e && e.title ? e.title : null).filter(Boolean)
    const materialTitles = materials.map((m: any) => m && m.title ? m.title : null).filter(Boolean)

    // detect simple RMB amount patterns in material/evidence titles (e.g. 100000, ￥100000, 人民币100000元)
    const amountCandidates: string[] = []
        ;[...evidenceTitles, ...materialTitles].forEach((t: string) => {
            if (!t) return
            const m = t.match(/(?:人民币|RMB|￥)?\s?([0-9,]+)(?:元)?/i)
            if (m && m[1]) amountCandidates.push(m[1].replace(/,/g, ''))
        })
    const detectedAmount = amountCandidates.length ? amountCandidates[0] : ''

    return `你是一名中国资深民商事诉讼律师。

任务目标：使用 Matter / Material / Evidence / Research / Documents 中已有的真实信息，尽可能在起诉状初稿中填入真实当事人、案由、金额、时间、诉讼请求与已有证据名称；仅当信息确实缺失时允许使用统一占位符：[待补充]。

优先信息（若存在请务必直接使用，不要替换为占位符）：
- Matter 标题: ${JSON.stringify(matterTitle)}
- 法院（如存在）: ${JSON.stringify(court)}
- 已有材料标题: ${JSON.stringify(materialTitles)}
- 已有证据标题: ${JSON.stringify(evidenceTitles)}
- 检测到的金额（若任何材料或证据标题含金额，请务必使用该真实金额）: ${JSON.stringify(detectedAmount)}

严格要求（必须遵守）：
1) 优先使用上下文中已有的信息；任何已在上下文或 Matter 标题中出现的当事人/金额/时间/证据名称必须原样使用，禁止以占位符替代。
2) 仅在确实缺失的字段使用占位符，且统一使用 "[待补充]"（包括当事人、金额、地址等）。
3) 明确禁止输出或使用其他方括号占位符或由字母 X 连续组成的占位标记；禁止使用类似的无意义占位符。
4) 禁止编造身份证号、住址、电话、法院名称或其他个人敏感信息；若无，则写为 "[待补充]"。
5) 优先提取并在文中使用以下字段（若存在）：原告姓名、被告姓名、案由、借款/合同金额、关键时间节点、诉讼请求、已有证据名称、法院名称。
6) 文书不得包含未经上下文支持的事实或金额；若需要估计或推断须标注为基于现有材料的初步表述，并避免具体敏感信息的编造。

具体输出格式与约束（必须逐字遵守）：
- 输出为单一合法的 JSON 数组，数组中每个对象包含："title","document_type","content"。
- content 必须为 JSON 字符串（内部换行使用 \\n，所有双引号需转义为 \\\"）。
- content 最少 300 字中文完整正文，且必须包含：当事人信息（能写多少写多少）、诉讼请求、事实与理由、证据清单（每项写明证明目的）。
- 当信息缺失时，使用统一占位符 "[待补充]"；不要使用其他占位符或模板标记。
- 严禁输出 Markdown、代码块、注释或额外解释；只输出可直接 JSON.parse 的数组文本。

示例（示例仅为格式示例，勿在最终文本中出现任何示例或注释）：
[ { "title":"民事起诉状","document_type":"起诉状","content":"第一段\\n\\n第二段" } ]

注意：不要在 content 或其他字段中重复将已知信息替换为占位符；若 Matter 标题内已包含原告或被告姓名，必须在起诉状中使用这些真实姓名。` }

export default {
    buildEvidencePrompt,
    buildFactPrompt,
    buildIssuePrompt,
    buildLawPrompt,
    buildArgumentPrompt,
    buildDocumentPrompt,
}

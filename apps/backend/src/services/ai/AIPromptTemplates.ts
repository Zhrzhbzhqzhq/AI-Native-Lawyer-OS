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

export function buildFactPrompt(context: any) {
    const materialTextLimit = 4000
    const truncateText = (value: unknown) => {
        const text = typeof value === 'string' ? value : ''
        return text.length > materialTextLimit
            ? `${text.slice(0, materialTextLimit)}\n[材料内容已截断]`
            : text
    }
    const mapMaterial = (material: any) => ({
        material_id: String(material?.material_id || ''),
        title: String(material?.title || material?.name || ''),
        material_type: String(material?.material_type || material?.type || ''),
        filename: String(material?.filename || material?.file_name || ''),
        content: truncateText(material?.content || material?.extracted_text || material?.text),
    })

    const matter = context?.matter
        ? {
            matter_id: String(context.matter.matter_id || ''),
            title: String(context.matter.title || ''),
            matter_type: String(context.matter.matter_type || context.matter.type || ''),
            description: String(context.matter.description || ''),
        }
        : {}
    const materials = Array.isArray(context?.materials)
        ? context.materials.map(mapMaterial)
        : []
    const evidence = Array.isArray(context?.evidence)
        ? context.evidence.map((item: any) => ({
            evidence_id: String(item?.evidence_id || ''),
            title: String(item?.title || item?.name || ''),
            description: String(item?.description || ''),
            evidence_type: String(item?.evidence_type || item?.type || ''),
            status: String(item?.status || ''),
            material: item?.material ? mapMaterial(item.material) : null,
        }))
        : []

    return `${FACT_PROMPT}

案件信息（Matter，仅作为背景，不得单独作为事实依据）：
${JSON.stringify(matter, null, 2)}

案件材料（Materials）：
${JSON.stringify(materials, null, 2)}

证据（Evidence）：
${JSON.stringify(evidence, null, 2)}

事实提炼补充要求：
1. 每条事实应尽可能明确表达时间、主体、行为、对象、结果和证据来源；输入未提供的要素不得猜测或补写。
2. 只能依据上述 Materials 与 Evidence 提炼事实。Matter 信息仅用于理解案件背景，不能单独证明任何事实。
3. 不得仅根据 Matter 标题或案件类型推断、补充或确认合同、借贷、劳动、侵权、代理等法律关系。
4. 不得编造当事人、金额、日期、行为、结果、证据或法律关系。
5. evidence_titles 必须使用上述 Evidence 中真实存在且标题完全一致的值。`
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

安全与数量要求（必须遵守）：
1. 每条法律依据必须且只能对应一个输入 Issue。
2. 不要求覆盖每一个 Issue；没有能够可靠确认的依据时可以不返回该 Issue 的 Law。
3. 同一 Issue 最多返回两条 citation 不重复的法律依据。
4. 每条必须包含非空的 title、citation、rule_content、application、limitations、issue_title。
5. issue_title 必须与输入 Issues 中的某个 title 完全一致。
6. 不得把本案最终责任、胜负或请求应否支持写入 Law。

只返回合法 JSON 数组，不要输出 Markdown、代码块、解释或其他内容：
[
  {
    "title": "",
    "citation": "",
    "rule_content": "",
    "application": "",
    "limitations": "",
    "source_reference": "",
    "issue_title": "",
    "confidence": 0.9
  }
]`
}

export function buildArgumentPrompt(_context: any, options: { compactRetry?: boolean } = {}) {
    const argumentScopes = Array.isArray(_context && _context.argumentScopes) ? _context.argumentScopes : []
    const compactRetryRequirements = options.compactRetry
        ? `
本次为紧凑重试，必须额外遵守：
1. 最多返回 4 条 Argument，按重要性排序；宁可减少数量，也不得截断 JSON。
2. 每条 Argument 必须且只能对应一个 Issue，issue_title 必须精确匹配。
3. fact_titles 只能引用该 Issue 直接关联的 Fact，不得引用同一 Matter 下其他 Fact。
4. law_citations 只能引用该 Issue 直接关联的 Law，不得引用其他 Issue 的 Law。
5. position、counter_argument、response、risk、conclusion 各不超过 120 个中文字符，reasoning 不超过 300 个中文字符。
6. 保留反方观点、回应和风险提示，但使用简洁句子，不展开重复背景。
7. 只返回完整、合法、闭合的 JSON 数组，不输出 Markdown、代码块、前言、注释或结语。`
        : ''
    return `你是一名中国资深民商事诉讼律师。

下面是按争议焦点划分的 Argument Scopes：
${JSON.stringify(argumentScopes, null, 2)}

每个 Scope 中：
- issue_title 是该 Scope 唯一允许回答的 Issue；
- allowed_facts 是该 Issue 唯一允许引用的 Facts；
- allowed_laws 是该 Issue 唯一允许引用的 Laws。

任务：请围绕每一个重要争议焦点，形成供律师审核的阶段性法律论证。

严格推理与格式要求（必须遵守）：
1) 每条 Argument 必须且只能包含以下十个字段：'title'、'issue_title'、'fact_titles'、'law_citations'、'position'、'reasoning'、'counter_argument'、'response'、'risk'、'conclusion'。十个字段一个也不能省略，不得增加其他字段。
2) 一条 Argument 只能回答一个 Scope 中的一个 Issue，不得合并、比较或混用不同 Scope；'issue_title' 必须与该 Scope 的 issue_title 完全一致，不得改写或编造。
3) 每条 Argument 必须至少引用一条已确认的事实（confirmed Fact）；'fact_titles' 必须是非空数组，其中每个值必须与当前 Scope 的 allowed_facts 中某个 title 完全一致，不得引用其他 Scope 的 Fact，不得改写或编造。
4) 不允许引用 'to_prove'（待证明）事实；若输入上下文包含 'to_prove' 事实，禁止在 'fact_titles' 中列出它们。
5) 如引用 'disputed'（存在争议）事实，必须在对应论证中明确写明："该事实存在争议，需要结合证据进一步证明。"
6) 每条 Argument 必须至少引用一条法律依据；'law_citations' 必须是非空数组，其中每个值必须与当前 Scope 的 allowed_laws 中某个 citation 完全一致，不得引用其他 Scope 的 Law，不得改写或编造。
7) 'title'、'position'、'reasoning'、'counter_argument'、'response'、'risk'、'conclusion' 都必须是非空字符串；'reasoning' 必须包含完整论证过程，不能只返回结论。
8) 推理必须遵循固定顺序且不得跳步：
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
9) 'position' 应当表达基于当前来源可主张的阶段性法律观点；'counter_argument' 应列明可能的相反观点；'response' 应说明基于现有来源的回应；'risk' 应披露事实、证据或法律适用上的限制。
10) 'conclusion' 只能表达基于当前已确认事实和法律依据形成、仍待律师审核的阶段性结论。禁止宣称必然胜诉或败诉，禁止预测法院必然支持或驳回，禁止作出无保留的绝对责任认定。
11) 严禁编造事实或法条；不得输出 AI 风格的叙述或泛泛作文；不得跳过事实直接得出结论。

返回 JSON（严格）Schema 示例：
[
    {
        "title": "",
        "issue_title": "",
        "fact_titles": [],
        "law_citations": [],
        "position": "",
        "reasoning": "",
        "counter_argument": "",
        "response": "",
        "risk": "",
        "conclusion": ""
    }
]

上面空字符串和空数组仅用于展示字段结构。实际输出时：
- title、issue_title、position、reasoning、counter_argument、response、risk、conclusion 必须填写非空内容；
- fact_titles、law_citations 必须各包含至少一个来自输入数据的精确值；
- 禁止省略任何字段，禁止增加 Schema 之外的字段。

字段说明：
 - 'fact_titles'：引用的 confirmed Fact 标题数组（不得包含 to_prove）。
 - 'law_citations'：引用的法律依据 citation 数组。

严格要求：
- 只返回合法的 JSON 数组；
- 不输出 Markdown、解释或正文外的任何内容；
- 不引用 to_prove Facts；
- 每条 Argument 必须引用至少一条 confirmed Fact 和至少一条 law_citation；
- 不得跨 Scope 引用、合并或推导 Fact、Issue、Law；
- 不得编造事实或法条；
- 论证必须遵循规定的推理顺序；
- 不得输出最终裁判预测、胜诉保证或绝对责任结论。

只返回 JSON。${compactRetryRequirements}`
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

export function buildComplaintSectionsPrompt(scope: any, options: { compactRetry?: boolean } = {}) {
    const compact = options.compactRetry
        ? '\n这是一次紧凑重试：缩短各段表达，但不得省略必需 Section，不得改变或扩大来源。'
        : ''
    return `你是法律文书表达助手，不是案件分析者。你只能把给定的、已经确认的 Formal Argument Scope 组织成一份民事起诉状结构，禁止重新生成或推断 Fact、Issue、Law、Argument。

DOCUMENT_REASONING_SCOPE:
${JSON.stringify(scope)}

强制规则：
1. 只能使用 argument_sections 中的 usable_facts、usable_laws 和 evidences；不得跨 Scope 拼接不一致来源。
2. 事实、主体、金额、日期、合同条款不得新增；法律 citation 必须逐字来自 usable_laws；证据名称必须逐字来自 evidences。
3. counter_argument 仅用于避免把对方观点写成本方承认；risk 仅用于降低措辞确定性；limitations 仅用于限制法律适用措辞。三者不得作为独立对外段落或案件事实。
4. source IDs 仅用于返回引用字段，严禁写入任何正文 text。
5. 缺失信息只使用这些占位符：【待律师补充】、【待律师补充：受理法院】、【待律师根据已确认 Argument 和案件目标补充】。
6. 诉讼请求来源不足时必须使用待律师补充文本；即使生成候选，requires_lawyer_confirmation 必须为 true。
7. 不得输出必然胜诉、法院一定支持、绝对责任结论，不得输出 confidence、AI reasoning、Scope、内部诊断或 LAWDESK 编码。
8. 当前 document_type 只能是 complaint。不得输出 Markdown、代码块、解释或额外文本，只输出一个合法 JSON 对象。
9. 使用法院起诉状式自然叙述：facts 统一组织案件经过，reasoning 不重复 facts 全文，position 与 reasoning 应共同形成自然法律论证。
10. 不得使用“争议焦点”“本方主张”“论证”“回应”“阶段性结论”“现有来源”“正式来源”“已确认来源”等分析报告式标题。
11. response 仅在确有必要时自然吸收；counter_argument、risk 和 law limitations 只作为内部约束，不得直接进入对外文字。
12. conclusion 必须位于事实与理由结束处；court、signature、date 之后不得出现正文或结论。
13. Evidence 说明应简洁，不得输出运行期核验说明；不得重新生成任何案件分析或直接输出最终纯文本。
14. material_sources 仅用于核验 Formal Fact 的表达，不得作为新增文书事实或 source_fact_ids 的来源。
15. Formal Fact（argument_sections[].usable_facts）是文书事实的唯一来源；Material 中未进入 Formal Fact 的内容不得写入文书。
16. Material 与 Formal Fact 存在冲突、歧义或无法相互印证时，必须采用保守表达，不得用 Material 覆盖、扩张或修改 Formal Fact。
17. claims 已由运行期 Claim Builder 根据 Formal Issue、Fact、Law、Argument 生成，必须逐项原样返回，不得新增、删除、改写请求或来源关系。
18. 不得自行生成利息、违约金、律师费或其他未由 claims 明确提供的费用请求，也不得自行计算或补充金额。

JSON 顶级字段必须且只能为：document_type,title,parties,claims,facts,reasoning,legal_basis,evidence_reference,conclusion,court,signature,date。
字段结构：
{"document_type":"complaint","title":"民事起诉状","parties":{"plaintiff":"【待律师补充】","defendant":"【待律师补充】"},"claims":[{"text":"","source_issue_ids":[""],"source_fact_ids":[""],"source_law_ids":[""],"source_argument_ids":[""],"requires_lawyer_confirmation":true}],"facts":[{"text":"","source_fact_ids":[],"source_evidence_ids":[]}],"reasoning":[{"issue_id":"","argument_id":"","position":"","analysis":"","source_fact_ids":[],"source_law_ids":[]}],"legal_basis":[{"citation":"","text":"","source_law_id":""}],"evidence_reference":[{"evidence_id":"","title":"","purpose":""}],"conclusion":"","court":"【待律师补充：受理法院】","signature":"【待律师补充】","date":"【待律师补充】"}${compact}`
}

export default {
    buildEvidencePrompt,
    buildFactPrompt,
    buildIssuePrompt,
    buildLawPrompt,
    buildArgumentPrompt,
    buildDocumentPrompt,
    buildComplaintSectionsPrompt,
}

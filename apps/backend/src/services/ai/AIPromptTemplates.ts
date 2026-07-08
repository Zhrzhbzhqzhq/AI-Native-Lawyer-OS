// Simple prompt template exporters
// Each function returns the task identifier / short description
// used by AIService when building the promptPack.

export function buildEvidencePrompt(_context: any) {
    return `你是一名中国资深诉讼律师。

下面是当前案件的已知内容，请务必仅基于当前案件：
- 已有的 Material（案件资料）
- 已有的 Evidence（正式证据）
- 已有的 Facts（如有）

目标：请分析并推荐律师下一步真正应当补充的、尚未存在于本案中的证据（用于支持主张或弥补证明缺口）。

要求（严格遵守）：
1) 仅针对当前案件，不要列举证据类型大全或所有可能的证据。
2) 不要重复推荐已经存在的证据。
3) 优先推荐最缺失、最重要的证据，按重要性排序；最多返回 8 条。
4) 每条推荐必须为对象，格式如下：
{
    "title": "...",
    "reason": "...说明为什么需要该证据、它如何弥补现有证明缺口...",
    "evidence_type": "..."
}
5) 如果系统判断已有证据已经充分，请返回以下单一对象：
{
    "completed": true,
    "message": "目前证据基本完整，仅建议补充辅助证明材料。"
}

返回规则：
- 仅返回合法的 JSON（数组或单一对象如上），不要返回任何解释、注释或 Markdown。
- 不要包含无关或泛泛的说明——每条推荐应具有针对性且可执行。

只返回 JSON。`
}

export function buildFactPrompt(_context: any) {
    return `你是一名中国资深民商事诉讼律师。

下面是当前案件中已经整理的 Evidence（证据列表）。

请根据这些证据提炼案件事实，并将事实分为三类：

1. 已确认事实（confirmed）
- 有明确证据支持，可直接用于起诉状、代理词或庭审陈述。

2. 待证明事实（to_prove）
- 对案件重要，但目前证据不足，需要律师补充证据以证明该事实。

3. 存在争议事实（disputed）
- 对方可能否认或存在实质性争议，需要重点准备证明或反驳材料。

返回 JSON：

[
    {
        "title": "",
        "description": "",
        "category": "confirmed | to_prove | disputed"
    }
]

严格要求：
- 只输出事实，不要输出法律评价或争议焦点。
- 每条事实必须至少能对应到已给出的至少一项 Evidence（在 description 可简要指明对应证据或证据要点）。
- 最多返回 12 条，按重要性排序（最重要在前）。
- 仅返回合法 JSON 数组，不要返回任何解释、注释或 Markdown。
    - 不要修改前端或 API，前端目前只显示 title 与 description，但请在返回对象中保留 category 供后续使用。

只返回 JSON。`
}

export function buildIssuePrompt(_context: any) {
    return `你是一名中国资深民商事诉讼律师。

下面提供：

- 已确认事实
- 待证明事实
- 存在争议事实

请据此提炼案件争议焦点。

要求：
1) 每个争议焦点必须能够决定案件裁判结果；
2) 必须来源于案件事实；
3) 不要生成程序性问题；
4) 不要生成法律依据或律师意见；
5) 一个焦点对应一个需要解决的问题；
6) 同类问题不要重复；
7) 最多返回 6 个；
8) 按重要程度排序（数字越小越重要）。

返回格式（仅 JSON 数组）：
[
    {
        "title": "",
        "description": "",
        "importance": 1
    }
]

说明：
- title 示例：是否存在借贷关系；合同是否已经成立；是否已经完成履行；违约责任应如何承担
- description：说明为什么这是案件争议焦点（基于事实）
- importance：整数，1 为最重要

严格要求：
- 只返回合法 JSON 数组；
- 不输出法律分析、法条、律师意见、建议、Markdown、解释或其他额外字段；
- 不要包含与事实无关的内容。

只返回 JSON。`
}

export function buildLawPrompt(_context: any) {
    return `你是一名中国资深民商事诉讼律师。

下面提供：

- 案件事实
- 争议焦点

请根据每一个重要争议焦点，推荐可直接用于论证的法律依据（包括法律条文、司法解释、指导案例或最高人民法院裁判规则）。

要求：
1) 每条法律依据必须对应至少一个争议焦点（在 issue_title 字段中标明对应焦点标题）；
2) 不要泛泛推荐常识性法律或与案件无关的法条；
3) citation 尽量具体（例如：民法典 第667条、最高人民法院关于XX的司法解释第X条、指导案例 XX号）；
4) description 必须说明：该法律依据解决哪个争议焦点、为什么适用、以及在本案论证中的作用；
5) 最多返回 8 条；按重要程度排序（最重要在前）。

返回 JSON：

[
    {
        "title": "",
        "citation": "",
        "description": "",
        "issue_title": ""
    }
]

严格要求：
- 仅返回合法的 JSON 数组；
- 不输出 Markdown、解释或正文外的任何内容；
- 不要包含法律分析段落、法条原文之外的评论或律师意见；
- 每条应直接可用于写案由、论证或法庭陈述。

只返回 JSON。`
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

格式要求（严格）：
1) 输出为 JSON 数组，元素最多 6 条，按重要性排序（最重要在前）。
2) 每个论证对象必须包含字段：
   {
     "title": "",               // 论证标题
     "description": "",         // 完整论证内容（可分点），必须引用具体事实要点并指出引用的法律依据
     "conclusion": "",          // 法律结论
     "issue_title": "",         // 对应争议焦点标题
     "law_citations": []          // 引用的法律依据 citation 数组（例如：民法典 第667条）
   }
3) 每个论证必须对应一个争议焦点（use issue_title），必须引用至少一项法律依据（law_citations）并至少一条事实要点。
4) 论证风格应接近律师代理词或庭审发言，结构清晰、要点分明，可直接用于起草文书或陈述。
5) 严格禁止编造不存在的事实或法条；如引用法律请尽量使用具体 citation。
6) 不要写成泛泛的 AI 文章，不要输出法律评价、建议、程序性内容、Markdown 或任何解释性文本。仅返回 JSON 数组。

只返回 JSON。`
}

export function buildDocumentPrompt(_context: any) {
    const facts = Array.isArray(_context && _context.facts) ? _context.facts : []
    const issues = Array.isArray(_context && _context.issues) ? _context.issues : []
    const laws = Array.isArray(_context && _context.laws) ? _context.laws : []
    const argumentsList = Array.isArray(_context && _context.arguments) ? _context.arguments : []

    return `你是一名中国资深民商事诉讼律师。

下面提供：

案件事实：\n${JSON.stringify(facts, null, 2)}

争议焦点：\n${JSON.stringify(issues, null, 2)}

法律依据：\n${JSON.stringify(laws, null, 2)}

法律论证：\n${JSON.stringify(argumentsList, null, 2)}

请生成适合当前案件的法律文书建议。例如：起诉状、答辩状、代理词、庭审提纲、执行申请书等。

返回 JSON：

[
    {
        "title":"",
        "document_type":"",
        "content":""
    }
]

要求：

不要 Markdown。
不要解释。
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

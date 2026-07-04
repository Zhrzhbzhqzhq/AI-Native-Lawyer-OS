# M15 Evidence Workspace Architecture — Freeze v1.0

## 1. Evidence Workspace 定位
- 目标：为律师围绕 `Evidence` 业务对象提供专用的法律工作区（Workspace）。
- 不是文件管理器：不会替代通用文件浏览/存储系统。
- 不是上传页：上传是支持流程的子步，但 Workspace 本身不以上传为主旨。
- 不是 OCR 页：不承担或替代 OCR 解析功能。
- 本质：围绕 Evidence 对象的法律工作区，聚合证据、关联材料与事实/要点，辅助律师判断证据链完整性并给出建议。

## 2. 核心问题（Workspace 要回答）
- 我有哪些证据？（列表与汇总）
- 这些证据证明什么？（目的、相关事实与要点）
- 还缺什么证据？（缺失建议 / next actions）

## 3. 页面结构（首屏与次级视图）
- Header：案件基本信息、快速导航（只读信息+跳转链接）。
- Evidence Summary：关键统计（total / accepted / pending / weak / missing）。
- Evidence List：按时间/相关性排序的证据项列表（可筛选、只读）
- Evidence Detail：选中证据的详情视图（只读 + 建议）
- AI Analysis：基于规则的建议与注意项（边界严格限制，见第7）
- Missing Evidence：基于事实与要点的缺失证据建议（只读建议）

## 4. Evidence Summary 字段
- `total`：证据总数（与当前筛选/视图一致的计数）。
- `accepted`：被律师或系统标记为“可采/已确认”的证据数。
- `pending`：待确认或需补充信息的证据数。
- `weak`：初步评估为薄弱或需增强的证据数。
- `missing`：缺失建议项的数量（由 Missing Evidence 引擎输出）。

## 5. Evidence List 字段（每项）
- `evidence_id`
- `title`
- `evidence_type`（例如：截图/合同/书证/证人陈述）
- `source`（材料来源/渠道）
- `status`（accepted | pending | rejected | weak 等）
- `relevance`（与核心事实或要点的关联程度，枚举或数值）
- `updated_at`（最近更新时间 ISO timestamp）

> 说明：列表项为只读视图，任何修改须进入律师确认的编辑工作流（不是本 Workspace 的即时行为）。

## 6. Evidence Detail 字段
- `title`
- `description`（文字描述、摘录）
- `proof_purpose`（该证据用于证明的事实/法律要点）
- `related_material`（关联的 Material 对象 id 列表或引用）
- `related_fact`（关联事实或案件要点标识）
- `related_issue`（关联法律问题或要点）
- `ai_analysis`（规则或模型生成的建议摘要；仅建议，不执行）

## 7. AI Analysis 边界（硬性规则）
- Rule-based first：初版以可解释的规则引擎为主（如匹配缺失字段、时间线断点、证据重复性检测）。
- 不直接调用 LLM：不得在默认路径中调用外部 LLM；任何 LLM 调用需显式审批并标注为实验功能。
- 不直接修改证据：AI 只能输出建议、评分、理由；不对证据对象做写入/变更。
- 只给建议：所有 AI 建议必须带上 `reason` 与 `confidence`（可选），并由律师决定后续动作。

## 8. Missing Evidence 边界
- 只返回缺失建议：基于现有事实/要点输出“建议补充”的证据类型或方向。
- 不自动创建 Material：不在系统中自动建档任何 Material。
- 不自动创建 Evidence：不创建证据记录；所有创建动作需律师确认并通过明确的创建 API/页面执行。
- 律师确认后才进入后续流程：确认后，进入显式的创建/上传或任务分派工作流（不在 M15 Alpha 内自动执行）。

## 9. 禁止内容（本 Workspace 不承担）
- 不做 Timeline（时间线功能不在本页内实现）。
- 不做 Document Editor（非文书编辑场所）。
- 不做 Chat（非会话界面或客服对话）。
- 不做 Knowledge（不承担知识库构建或持久化策略）。
- 不做 Calendar（不提供日历/日程功能）。
- 不做 Workflow（不自动化工作流或触发器，除非经律师确认的显式操作）。

## 10. M15.1 拆分路线（开发与交付切片）
- M15.1.1 Evidence Workspace Dashboard
  - 实现 Summary、Recent Activity（只读）、Evidence List 快速概览。
- M15.1.2 Evidence Object Navigation
  - 证据对象页、筛选、排序与快速跳转（只读优先）。
- M15.1.3 Evidence Relationships
  - 关联 Material、Fact、Issue 的可视化与引用（只读链接与建议）。
- M15.1.4 AI Evidence Analysis
  - 引入规则引擎并展示可解释的分析与建议；LLM 为可选实验项且需明确标注。
- M15.1.5 Missing Evidence Engine
  - 基于事实/要点，输出缺失证据建议列表（律师确认后进入创建流程）。

## 11. 最终 JSON
```
{
  "evidenceWorkspaceArchitecture":"PASS",
  "singleObjectBoundary":"PASS",
  "readOnlyFirst":"PASS",
  "aiBoundary":"PASS",
  "missingEvidenceBoundary":"PASS",
  "readyForM1511":"PASS"
}
```

---

文档说明：本冻结文档仅定义 M15 Evidence Workspace v1.0 的定位、界限与交付路线。任何超出此范围的实现（写入、自动化、外部 LLM 调用、Timeline/Editor 等）需进入下一个版本评审并获得批准。

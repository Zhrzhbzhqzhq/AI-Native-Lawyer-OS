# Workspace Growth Model v1

## 1. 总定位
- Workspace 是律师工作的驾驶舱（Workspace = Lawyer's cockpit）。
- Workspace 不是功能集合页：它不应把所有功能堆在同一页面，而应以清晰工作流与决策点呈现状态。
- Workspace 不直接承担复杂编辑：编辑、批量操作等应通过明确的编辑工作流或子页面进行，并需律师确认。
- Workspace 负责展示状态、导航对象、提示下一步（状态感知、对象导航、建议/下一步）。

## 2. Workspace Growth Rule
所有 Workspace 必须按以下顺序成长（线性且可验证）：

Dashboard
↓
Navigation
↓
Object
↓
Relationship
↓
AI
↓
Automation

### 各层含义
- Dashboard：展示当前状态（关键统计、最近活动、关键提醒、快速摘要）。
- Navigation：帮助律师理解对象结构并提供直观入口（按类型/状态/维度的导航卡片）。
- Object：进入并查看具体法律对象（只读优先；编辑为可选确认流程）。
- Relationship：展示对象间的关联（引用、因果、证明链）。
- AI：提供分析、判断与建议（以可解释、可追溯的建议为主，LLM/模型调用为可控扩展）。
- Automation：在律师确认后执行动作（仅在明确确认与审计路径后开启）。

## 3. 禁止跳级原则
- 不得在 Dashboard 阶段直接做 Automation（避免未证实的自动修改或触发）。
- 不得在 Navigation 阶段加入复杂编辑器（Navigation 应保持轻量且指向对象）。
- 不得在 Object 阶段引入全局 AI 自动执行（AI 建议先于自动化）。
- AI 永远先 suggestion，后 confirmation（AI 输出建议，律师确认后才能进入 Automation）。

## 4. 各 Workspace 适用示例

### Matter Workspace
- Dashboard：summary / recent activity / AI next step
- Navigation：workspace objects（Materials / Evidence / Documents）
- Object：进入 Materials / Evidence / Documents
- AI：Next Step Engine（规则优先，建议型）

### Evidence Workspace
- Dashboard：summary / evidence list
- Navigation：type / status / strength
- Object：evidence detail
- Relationship：evidence → fact → issue
- AI：evidence analysis / missing evidence
- Automation：律师确认后生成证据目录或文书更新建议

### Document Workspace
- Dashboard：document summary
- Navigation：document type / version / status
- Object：document detail
- Relationship：document → evidence → issue
- AI：revision suggestions / risk review
- Automation：律师确认后生成新版本

### Timeline Workspace
- Dashboard：case chronology summary
- Navigation：event type / phase / source
- Object：timeline event
- Relationship：event → evidence → document
- AI：gap detection / sequence analysis
- Automation：律师确认后补充事件或生成庭审时间线

### Knowledge Workspace
- Dashboard：knowledge summary
- Navigation：law / case / rule / note
- Object：knowledge item
- Relationship：knowledge → issue → document
- AI：rule extraction / precedent matching
- Automation：律师确认后写入知识沉淀

### Task Workspace
- Dashboard：task summary
- Navigation：priority / deadline / matter phase
- Object：task item
- Relationship：task → matter object
- AI：next action / deadline risk
- Automation：律师确认后创建任务或提醒

## 5. 与现有 M13 / M14 / M15 的关系
- M13：证明对象生命周期（Materials / Evidence / Documents 的生成与管理）。
- M14：Matter Workspace 已完成 Dashboard + Navigation + AI Next Step（遵循 Growth Model 的 Dashboard → Navigation → AI 路径）。
- M15：开始 Legal Object Workspace（Evidence/Document/Timeline 等），所有 M15 功能必须服从本 Growth Model。
- M15.1 Evidence Workspace 必须遵守本模型（先 Dashboard，再 Navigation，再 Object，逐步引入 Relationship/AI/Automation）。

## 6. 最终 JSON
```
{
  "workspaceGrowthModel":"PASS",
  "unifiedWorkspaceRule":"PASS",
  "noJumpingLevels":"PASS",
  "aiSuggestionBeforeAutomation":"PASS",
  "readyForM1512":"PASS"
}
```

---

说明：本模型旨在为 LawDesk 各类 Workspace 提供统一成长路径与边界，避免过早引入复杂编辑、自动化或未经确认的 AI 执行，确保律师始终掌控裁量权与审计链路。
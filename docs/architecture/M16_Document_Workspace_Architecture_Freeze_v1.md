# M16 Document Workspace Architecture Freeze v1.0

Version:
v1.0

Status:
Frozen

Purpose

定义 Document Workspace 的定位、界限、页面结构与实现原则，保证与 Workspace Pattern 保持一致并满足律师工作产出（Work Product）要求。

适用范围

- Document Workspace（文书工作区）

1. Document Workspace 定位

- Document 不是普通文件。
- Document 是律师的工作成果（Work Product）。
- Document 包括但不限于：起诉状、答辩状、代理词、证据目录、质证意见、庭审提纲、执行申请、保全申请等正式或半正式法律文书。

2. 核心问题（必须解答）

- 当前案件有哪些文书？
- 哪些文书是草稿？
- 哪些文书需要更新？
- 哪些关键文书还缺失？
- 下一步应处理哪份文书？

3. 页面结构（必须遵守 Workspace Pattern）

Summary
↓
Navigation
↓
Document List
↓
Document Detail
↓
AI Analysis
↓
Missing Documents
↓
Document Next Step

- 不得更改顺序。

4. Summary 字段

Summary 区显示整体统计，字段如下：

- `total`：文书总数（包括草稿和已完成）。
- `completed`：已完成（可提交/归档）的文书数量。
- `draft`：草稿数量。
- `need_review`：需要复核的文书数量。
- `missing`：建议缺失的关键文书数量。

- Summary 区为只读，禁止在该区提供编辑/生成按钮或直接调用 AI 写入。

5. Navigation 维度

Navigation 提供多维度导航视角，至少包含：

- By Document Type:
  - `complaint`
  - `defense`
  - `representation`
  - `evidence_catalog`
  - `challenge_opinion`
  - `hearing_outline`
  - `enforcement`
  - `preservation`
  - `other`

- By Status:
  - `draft`
  - `completed`
  - `need_review`
  - `archived`

- By Version:
  - `v1`
  - `v2`
  - `latest`
  - `outdated`

- Navigation 只作概览与跳转。禁止在该区支持 Search/Filter/Sort/Pagination（这些可在 Object List 内部实现并受限于可读性原则）。

6. Document List 字段

Document List 显示文书条目摘要，字段如下：

- `document_id`
- `title`
- `document_type`
- `status`
- `version`
- `updated_at`

- Document List 为只读列表示；不允许直接在列表中打开在线编辑器或触发写操作。

7. Document Detail 字段

Document Detail 面板提供文书完整元数据与只读视图，字段如下：

- `document_id`
- `title`
- `document_type`
- `status`
- `version`
- `content_uri`（指向存储/查看位置的只读引用）
- `updated_at`
- `ai_summary`（placeholder，规则化输出，见 AI Analysis 边界）
- `related_evidence`（placeholder，指向相关 Evidence 的列表）
- `version_history`（placeholder，展示历史版本元数据）

- Detail 面板禁止提供在线编辑器、自动保存、或将 AI 结果直接写回文书的功能。

8. AI Analysis 边界

- 第一版为 rule-based（规则引擎）提示：给出风险提示、缺失项与更新建议。
- 严禁调用真实 LLM 在后台生成或修改文书内容。
- AI Analysis 只能给出建议，不得自动修改文书或创建新版本。
- 后续阶段可分层推进：
  - Phase 1：规则引擎（placeholder -> rule-based）
  - Phase 2：受控半自动化（由律师触发的草稿生成）
  - Phase 3：LLM 辅助（需单独审批与合规审查）

9. Missing Documents 边界

- 仅提示缺失的关键文书和优先级；提供理由和建议动作词（建议由律师核实并执行）。
- 不自动创建 Document，不自动生成文书内容。
- 律师确认后，进入后续明确的工作流程（由 Workflow/Task 系统触发，属于后续模块）。

10. Document Next Step 边界

- 提供下一步可供律师执行的建议（例如：补充证据、完善合同条款、生成初稿、发起复核）。
- 建议为只读项，不触发任何自动执行或 Workflow。

11. 禁止内容（明确列举）

- 不做在线协作编辑器（no online editor）。
- 不做 Word/WYSIWYG 编辑集成直接写入。
- 不做 Chat/聊天式交互作为核心编辑手段。
- 不把 Timeline、Knowledge、或自动化作为文书自动化入口。
- 不自动提交或自动生成可用于法院的正式文书。

12. M16 拆分路线（建议实施阶段）

- M16.1 Document Workspace Dashboard
- M16.2 Document Navigation
- M16.3 Document Detail Panel
- M16.4 Rule-based Document Analysis
- M16.5 Missing Documents
- M16.6 Document Next Step
- M16 Freeze Review

- 每一子任务需独立评审并保持与 Workspace Pattern 的一致性。

13. 最终 JSON 验证（作为文档自检）

{
  "documentWorkspaceArchitecture":"PASS",
  "workProductBoundary":"PASS",
  "workspacePattern":"PASS",
  "readOnlyFirst":"PASS",
  "aiBoundary":"PASS",
  "readyForM161":"PASS"
}

--

该文档定义 M16 Document Workspace v1.0 的官方冻结规范。实现任何 M16 子任务前必须遵守本规范并在 Freeze Review 中通过审查。
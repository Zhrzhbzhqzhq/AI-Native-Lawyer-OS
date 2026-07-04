# M15.1.2 Evidence Navigation — Freeze v1.0

## 1. Navigation 定位
- 目标：在 Evidence Workspace 内提供“对象导航层”（Object Navigation），帮助律师以结构化、可理解的方式浏览证据集合。
- 不是普通 filter：Navigation 旨在提供引导式入口，而非复杂筛选表达式的替代。
- 不是搜索：不做全文或元数据搜索功能。
- 不是标签系统：不提供用户自定义标签或分类机制。
- 本质：Evidence Workspace 的对象导航层 — 给出基于维度的视图入口（按类型 / 状态 / 强度）。

## 2. Navigation 解决的问题
- 律师如何快速理解证据结构：以维度化卡片展示概览与计数。
- 律师如何按证据类型查看：提供按证据类型的入口卡片（电子、合同、聊天等）。
- 律师如何按证据状态查看：提供按状态（accepted、pending 等）视图入口。
- 律师如何按证明强度查看：按 strong/medium/weak 分组帮助判断证据质量分布。

## 3. 第一版 Navigation 维度

A. By Evidence Type（首版维度示例）
- electronic
- physical
- recording
- photo
- video
- contract
- transfer
- chat
- witness
- other

B. By Evidence Status
- active
- pending
- accepted
- weak
- rejected

C. By Evidence Strength
- strong
- medium
- weak
- unknown

## 4. Navigation 返回结构建议

```
{
  "navigation": {
    "by_type": [],
    "by_status": [],
    "by_strength": []
  }
}
```

每个 item 建议字段：
```
{
  "key": "...",
  "label": "...",
  "count": 0,
  "description": "..."
}
```
- `key`: 唯一标识（用于前端路由或数据映射）。
- `label`: 展示文字。
- `count`: 该维度下证据数量（只读计数）。
- `description`: 简短说明（可选）。

## 5. 前端展示原则
- 放置位置：位于 Summary 下方、Evidence List 上方的显著位置。
- 仅展示导航卡片：每个维度以卡片或小块展示计数与标签。
- 不新增复杂筛选器：不提供多条件组合、复杂布尔筛选或高级筛选 UI。
- 不做搜索、不做多选、不做高级筛选：保持界面简洁、低认知成本。

## 6. Read-only 边界
- 不创建 Evidence。
- 不修改 Evidence。
- 不删除 Evidence。
- 不触发 AI。
- 不写数据库。

导航仅读取计数与元数据，任何后续操作（如批量编辑、移动到其它分类）需进入明确的工作流并经律师确认。

## 7. 与后续版本关系
- M15.1.2 只做 Navigation 展示（本冻结范围）。
- M15.1.3 将实现 Evidence Relationships（关联视图与可视化）。
- M15.1.4 将实现 AI Evidence Analysis（规则/模型辅助分析，LLM 需审批）。
- M15.1.5 将实现 Missing Evidence Engine（缺失证据建议与工作流）。

## 8. 禁止内容（本版本不包含）
- 不做 Evidence 编辑。
- 不做 Evidence 搜索。
- 不做 Timeline。
- 不做 Document 编辑或创建。
- 不做 Knowledge 或知识库构建。
- 不做 Chat 或对话界面。
- 不做 Workflow 自动化触发。

## 9. 最终 JSON
```
{
  "evidenceNavigationArchitecture":"PASS",
  "notFilterSystem":"PASS",
  "readOnlyNavigation":"PASS",
  "singleObjectBoundary":"PASS",
  "readyForM1512Implementation":"PASS"
}
```

---

说明：本文档为 M15.1.2 Evidence Navigation 的冻结规范（v1.0）。目标是提供清晰、只读、低风险的导航层，以便在 M15 系列中逐步引入更复杂的关系与 AI 功能。任何超出本规范的实现需提交变更申请并在下一个版本中评审通过。

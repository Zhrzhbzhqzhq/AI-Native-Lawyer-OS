# LawDesk Design Language V1

## 1. 产品定位（Product Positioning）

LawDesk 是 AI Native Lawyer OS。

LawDesk 不是：
- 传统后台系统
- 项目管理工具
- 文件管理器

LawDesk 的界面设计必须围绕律师办案工作，降低认知负担，突出 AI 持续协作。

## 2. 页面结构（Page Structure）

Matter 子页面统一结构：
- 案件列表入口（Matter List）
- 案件导航（Matter Navigation）
- 案件信息（Workspace Header）
- 当前工作区标题（Workspace Title）
- 当前工作区内容（Workspace Content）

该结构为 Matter 子页面默认骨架，后续页面改造应保持一致。

## 3. 标题层级（Title Hierarchy）

一级页面标题：
- 中文主标题 + 英文辅助标题

二级模块标题：
- 中文模块名 + 英文辅助标题

三级内容标题：
- 只保留中文

说明：英文为辅助信息，不是主标题翻译替代；中文始终为视觉主导。

## 4. 导航命名（Navigation Naming）

统一命名如下：
- 案件概览（Matter Overview）
- 证据工作区（Evidence Workspace）
- 法律检索（Legal Research）
- 文书工作区（Document Workspace）
- 执行工作区（Execution Workspace）
- AI 工作中心（AI Runtime）

不使用同义词混用，不随页面自行改名。

## 5. 状态词（Status Vocabulary）

只允许使用以下状态词：
- 待启动
- 处理中
- 等待律师
- 已完成
- 需补强
- 有风险

禁止新增英文状态词或中英混排状态词。

## 6. AI 术语（AI Terminology）

统一使用以下 AI 术语：
- AI 主控
- AI 建议
- AI 分析
- AI 检索
- AI 文书
- AI 执行
- AI 复盘
- AI 工作中心

术语必须在全站一致，避免同一能力多名称。

## 7. 禁止项（Do Not）

- 不要大面积彩色
- 不要 emoji
- 不要英文主导
- 不要项目管理词汇
- 不要把开发者日志直接暴露给律师
- 不要把 LawDesk 做成文件管理器

## 8. 页面使命（Workspace Mission）

Evidence：围绕证明目标组织证据，而不是管理文件。

Research：AI 持续检索法律依据、类案与裁判规则。

Documents：AI 起草，律师审阅，协同完成法律文书。

Execution：AI 跟踪执行进展、财产线索与法院动态。

Runtime：面向律师展示 AI 当前工作，而不是展示底层日志。

## 执行说明（Implementation Notes）

本规范用于 M80 后续逐页改造。

后续页面实现中，如与本规范冲突，优先遵循本规范；若需变更，应先更新本文件再改代码。
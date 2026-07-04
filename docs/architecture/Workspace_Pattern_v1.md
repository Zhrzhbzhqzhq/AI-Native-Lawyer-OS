# Workspace Pattern v1

Version:
v1

Status:
Frozen

Purpose:

定义所有 Workspace 的统一设计模式。

适用于：

Matter Workspace

Evidence Workspace

Document Workspace

Knowledge Workspace

Timeline Workspace

Task Workspace

=========================================
Architecture
=========================================

所有 Workspace 必须遵循：

Summary

↓

Navigation

↓

Object List

↓

Detail Panel

↓

AI Analysis

↓

Missing Items

↓

Next Step

不得改变顺序。

=========================================
Summary
=========================================

职责：

显示整体统计。

禁止：

编辑

按钮

AI

=========================================
Navigation
=========================================

职责：

Overview

禁止：

Search

Filter

Sort

Pagination

=========================================
Object List
=========================================

职责：

对象列表。

必须：

只展示。

=========================================
Detail Panel
=========================================

职责：

完整展示 Object。

允许：

Placeholder

禁止：

Edit

Delete

Upload

Generate

=========================================
AI Area
=========================================

职责：

AI Analysis。

第一阶段：

Placeholder。

第二阶段：

Rule Engine。

第三阶段：

LLM。

=========================================
Missing Items
=========================================

职责：

展示：

Missing Evidence

Missing Document

Missing Knowledge

全部：

Read Only。

=========================================
Next Step
=========================================

职责：

告诉律师：

下一步应该做什么。

禁止：

自动执行。

=========================================
Workspace Principles
=========================================

必须：

Read Only First

Human in the Loop

Object First

Workspace owns UI

Runtime owns AI

Repository owns DB

=========================================
Workspace Consistency
=========================================

Matter

Evidence

Document

Knowledge

Timeline

Task

全部：

必须保持一致。

=========================================
Out Of Scope
=========================================

Chat

Workflow

Automation

Knowledge Graph

AI Write

=========================================
Future
=========================================

M16

Document Workspace

Knowledge Workspace

Timeline Workspace

Task Workspace

全部遵循本 Pattern。

=========================================
最后输出：

{
  "workspacePatternDocument":"PASS",
  "architectureFrozen":"PASS",
  "readyForM1514":"PASS"
}

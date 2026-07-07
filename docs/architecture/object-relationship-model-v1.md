# LawDesk Object Relationship Model V1.0

## 一、设计原则

Matter 是唯一根节点。

所有业务对象必须属于 Matter。

## 二、核心对象

Matter

Material

Evidence

Fact

Issue

Law

Argument

Document

## 三、对象关系

Matter
↓

Material
↓

Evidence
↓

Fact
↓

Issue
↓

Law
↓

Argument
↓

Document

说明：

Material 可以生成多个 Evidence。

Evidence 可以支撑多个 Fact。

Fact 可以关联多个 Issue。

Issue 可以关联多个 Law。

Issue、Fact、Law
共同组成 Argument。

Document 来源于 Argument。

## 四、辅助对象

Timeline

Task

Knowledge

Research

Calendar

Contact

说明：

这些对象均属于 Matter。

不参与法律推理链。

## 五、统一字段

所有对象建议统一拥有：

id

业务ID

matter_id

title

description

status

created_at

updated_at

根据对象特点可扩展。

## 六、对象生命周期

Material
↓

Evidence
↓

Fact
↓

Issue
↓

Law
↓

Argument
↓

Document

AI 每一层负责：

建议

整理

分析

生成

律师负责：

确认

修改

最终决定

## 七、开发原则

以后新增对象：

必须说明：

属于哪一层

依赖哪些对象

输出给哪些对象

不得绕过推理链。

# Workflow 总规范

> 本规范适用于 AI Native Lawyer OS 全部 Workflow。

---

# 一、Workflow 设计原则

1. Workflow 描述的是律师完成的一项工作。

2. Workflow 不等于案件阶段。

3. Workflow 可以独立启动。

4. Workflow 可以重复执行。

5. Workflow 可以暂停。

6. Workflow 可以恢复。

7. Workflow 可以跳转到其它 Workflow。

8. AI 全程协助。

9. 所有关键操作必须律师确认。

10. 所有 Workflow 都必须产生 AI 工作记录。

---

# 二、统一章节

01 工作目标

02 页面入口

03 页面按钮

04 页面流转

05 主流程

06 AI 工作计划

07 AI 执行

08 AI 输出成果

09 律师审核

10 数据模型

11 Workflow 状态

12 输出结果

13 下一 Workflow

14 设计原则

---

# 三、统一按钮规范

按钮采用：

【开始】

【确认】

【暂停】

【继续】

【完成】

【重新执行】

【退回AI】

【生成】

【保存】

【取消】

统一命名。

---

# 四、统一 Workflow 状态

Draft

↓

Planning

↓

Waiting Approval

↓

Running

↓

Waiting Review

↓

Completed

↓

Archived

---

# 五、AI 工作规范

AI 必须：

先生成计划

↓

律师确认

↓

开始执行

↓

输出成果

↓

等待审核

↓

根据反馈修改

↓

最终完成

---

# 六、律师确认原则

AI 不得直接：

建立案件

提交文书

发送文件

删除资料

修改案件信息

所有正式操作必须律师确认。

---

# 七、数据模型引用

Workflow 可以引用：

Matter

Client

Document

Evidence

Timeline

Task

Knowledge

AI_Work_Record

---

# 八、日志规范

所有 Workflow：

必须生成：

AI_Work_Record

记录：

计划

执行

审核

反馈

最终版本

---

# 九、下一 Workflow

每个 Workflow 必须明确：

完成条件

触发条件

下一 Workflow
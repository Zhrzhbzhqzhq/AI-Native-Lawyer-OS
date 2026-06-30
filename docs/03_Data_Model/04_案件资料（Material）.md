# 04_案件资料（Material）

> 数据模型：案件资料（Material）
> 所属模块：案件工作区 / 案件资料
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

案件资料（Material）是律师上传到案件中的原始资料对象。

Material 不是证据，也不是法律文书。

它是证据、文书、时间轴、法律检索和法律论证的原始来源。

例如：

- 录音
- 微信聊天记录
- PDF
- Word
- 图片
- 扫描件
- 视频
- 音频
- 邮件
- 合同
- 身份材料
- 银行流水
- 法院材料

---

# 二、核心职责

Material 负责：

- 保存案件原始资料信息
- 记录资料来源类型
- 记录资料类型
- 记录文件路径
- 支持 OCR / 转录 / 摘要
- 支持 AI 分类
- 支持 AI 建立资料关系
- 支持识别候选证据
- 支持发现缺失资料

Material 不负责：

- 直接认定正式证据
- 替代 Evidence
- 替代 Document
- 替代 Timeline
- 替代 Research
- 替代律师判断

---

# 三、业务模式

律师上传资料后，资料先进入 Material。

AI 对 Material 进行：

- 分类
- 摘要
- OCR
- 转录
- 去重
- 建立关系
- 标记候选证据
- 提示缺失资料

律师确认后，Material 才正式进入案件工作区。

如果 Material 具有证明价值，后续进入：

WF-004_证据管理

由律师确认是否转化为正式证据。

---

# 四、生命周期

Material 生命周期：

上传

↓

待整理

↓

AI 整理中

↓

待律师确认

↓

已入库

↓

已关联证据 / 文书 / 时间轴

↓

已归档

也可能进入：

作废

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 资料唯一 ID |
| matter_id | UUID | 是 | 无 | 所属案件 ID |
| material_no | string | 是 | 自动生成 | 资料编号 |
| title | string | 是 | 无 | 资料名称 |
| material_category | string | 是 | 未分类（unknown） | 案件资料类别 |
| source_type | string | 否 | 无 | 资料来源类型 |
| file_name | string | 否 | 无 | 原始文件名 |
| file_path | string | 否 | 无 | 文件存储路径 |
| file_size | number | 否 | 无 | 文件大小 |
| mime_type | string | 否 | 无 | 文件 MIME 类型 |
| status | string | 是 | 待整理（pending） | 资料状态 |
| ai_summary | text | 否 | 无 | AI 资料摘要 |
| ai_tags | string[] | 否 | [] | AI 标签 |
| ai_category | string | 否 | 无 | AI 分类 |
| is_duplicate | boolean | 否 | false | 是否疑似重复 |
| duplicate_of | UUID | 否 | 无 | 重复资料 ID |
| is_candidate_evidence | boolean | 否 | false | 是否候选证据 |
| candidate_evidence_reason | text | 否 | 无 | 候选证据理由 |
| completeness_impact | text | 否 | 无 | 对资料完整度的影响 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| confirmed_by_lawyer | boolean | 是 | false | 是否经律师确认 |
| confirmed_at | datetime | 否 | 无 | 确认时间 |
| uploaded_at | datetime | 是 | 当前时间 | 上传时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、资料类别设计

Material 类型建议包括：

- 录音（audio）
- 视频（video）
- 图片（image）
- PDF（pdf）
- Word（word）
- 微信聊天（wechat_chat）
- 邮件（email）
- 合同（contract）
- 身份材料（identity）
- 银行流水（bank_statement）
- 法院材料（court_material）
- 其他（other）

---

# 七、状态设计

Material 状态固定为：

- 待整理（pending）
- AI整理中（processing）
- 待律师确认（waiting_review）
- 已入库（confirmed）
- 已关联证据（linked_evidence）
- 已关联文书（linked_document）
- 已归档（archived）
- 作废（void）

---

# 八、关系设计

Material 可以关联：

- 一个案件（Matter）
- 一个或多个证据（Evidence）
- 一个或多个法律文书（Document）
- 一个或多个时间轴节点（Timeline）
- 一个或多个 AI 工作记录（AI_Work_Record）

推荐关系实体：

- `MaterialEvidence`：`material_id`, `evidence_id`, `relation_type`
- `MaterialDocument`：`material_id`, `document_id`, `relation_type`
- `MaterialTimeline`：`material_id`, `timeline_id`, `relation_type`

---

# 九、AI 参与规则

AI 可以：

- 识别文件类型
- OCR 图片和扫描件
- 转录录音
- 解析微信聊天
- 生成资料摘要
- 自动分类
- 自动标签
- 去重
- 建立资料关系
- 标记候选证据
- 提示缺失资料
- 判断资料完整度影响

AI 不可以：

- 自动认定正式证据
- 自动删除资料
- 自动修改律师确认内容
- 自动外发资料
- 自动将资料提交给法院或第三方

所有正式入库和正式关联必须律师确认。

---

# 十、今日工作台支持

今日工作台可读取：

- 待整理资料
- 待确认资料
- 缺失资料提醒
- 资料完整度
- 重要资料提醒
- 候选证据提醒

示例：

张三诉李四民间借贷纠纷

资料完整度：

82%

待确认资料：

3 份

AI 建议：

进入证据管理。

---

# 十一、Workflow关联

| Workflow | 与案件资料的关系 |
|---|---|
| WF-001_咨询到接案 | 接收咨询资料 |
| WF-002_案件启动 | 初始化案件资料区 |
| WF-003_资料整理 | 核心 Workflow，整理 Material |
| WF-004_证据管理 | 将候选资料转化为正式证据 |
| WF-005_法律检索 | 基于资料和证据识别法律问题 |
| WF-006_法律论证 | 引用资料背景和证据体系 |
| WF-007_法律文书 | 文书引用资料来源 |
| WF-008_庭审准备 | 庭审使用资料和证据 |
| WF-011_结案归档 | 归档全部资料 |
| WF-012_案件复盘 | 分析资料完整度与办案质量 |
| WF-013_知识沉淀 | 从资料中沉淀可复用经验 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- material_no
- title
- material_category
- status
- is_candidate_evidence
- confirmed_by_lawyer
- uploaded_at
- updated_at

---

# 十三、权限与安全

案件资料通常包含敏感信息。

原则：

- 默认本地优先存储
- 文件路径与文件内容分离
- AI 不得擅自外发资料
- 身份资料、银行流水等敏感资料应加密
- 删除资料必须律师确认
- 所有 AI 处理必须记录

---

# 十四、设计原则

1. 案件资料不是证据。

2. Material 是所有案件内容加工的入口。

3. 原始资料先进入 Material，再由 AI 整理。

4. 是否成为正式证据，必须进入 WF-004 并由律师确认。

5. AI 可以分类、摘要、标记候选证据，但不能确认法律属性。

6. Material 必须保留原始来源和文件路径。

7. Material 是 Living Matter 演化的基础输入。

8. 今日工作台根据 Material 状态推动律师补充资料和确认资料。
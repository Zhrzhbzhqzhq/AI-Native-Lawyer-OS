# 03_客户（Client）

> 数据模型：客户（Client）
> 所属模块：客户管理 / 案件管理 / 案件工作区
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

客户（Client）是 AI Native Lawyer OS 中负责管理案件相关人员信息的基础对象。

V1 中，Client 用于统一管理与案件相关的自然人、法人及其他组织。

Client 既可以表示：

- 委托人
- 原告
- 被告
- 第三人
- 法定代表人
- 公司

V2 将进一步拆分 Party（案件参与人）对象。

---

# 二、核心职责

Client 负责：

- 保存客户基本信息
- 保存联系方式
- 保存身份信息
- 保存组织信息
- 保存案件关联关系
- 保存客户备注
- 支持案件快速关联客户

Client 不负责：

- 保存案件资料
- 保存证据
- 保存法律文书
- 保存案件任务
- 保存 AI 工作记录

---

# 三、业务模式

Client 是独立对象。

一个 Client 可以关联多个 Matter。

一个 Matter 可以关联多个 Client。

V1 默认：

Matter 使用：

primary_client_id

表示主要客户。

未来：

通过 MatterClient 关系表实现多对多关联。

---

# 四、生命周期

Client 生命周期：

创建

↓

完善资料

↓

关联案件

↓

持续维护

↓

停用

↓

归档

Client 不因案件结束而删除。

客户是长期资产。

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 客户唯一 ID |
| client_no | string | 是 | 自动生成 | 客户编号 |
| name | string | 是 | 无 | 姓名或单位名称 |
| client_type | string | 是 | 自然人（person） | 客户类型 |
| identity_type | string | 否 | 身份证 | 证件类型 |
| identity_no | string | 否 | 无 | 证件号码 |
| gender | string | 否 | 未知 | 性别 |
| birthday | date | 否 | 无 | 出生日期 |
| phone | string | 否 | 无 | 手机号 |
| email | string | 否 | 无 | 邮箱 |
| wechat | string | 否 | 无 | 微信 |
| company | string | 否 | 无 | 所属公司 |
| position | string | 否 | 无 | 职务 |
| address | string | 否 | 无 | 联系地址 |
| postcode | string | 否 | 无 | 邮政编码 |
| remark | text | 否 | 无 | 律师备注 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、关系设计

Client 可以关联：

- 多个案件（Matter）
- 多个案件资料（Material）
- 多份法律文书（Document）

推荐关系：

MatterClient

字段：

- matter_id
- client_id
- role
- relation_type

其中：

role 示例：

- 委托人
- 原告
- 被告
- 第三人
- 法定代表人
- 联系人

---

# 七、索引建议

建议建立索引：

- client_no
- name
- phone
- identity_no
- company
- created_at
- updated_at

---

# 八、AI 参与规则

AI 可以：

- 自动识别客户信息
- OCR 身份证
- OCR 营业执照
- 自动填写客户资料
- 自动发现重复客户
- 自动建议关联已有客户
- 自动生成客户摘要

AI 不可以：

- 自动修改客户正式信息
- 自动删除客户
- 自动合并客户
- 自动关联案件

所有正式修改必须律师确认。

---

# 九、今日工作台支持

今日工作台可显示：

- 今日新增客户
- 待完善客户资料
- 重复客户提醒
- 今日联系客户
- 待确认客户信息

---

# 十、权限与安全

客户信息属于律师资产。

原则：

- 默认本地保存
- 敏感身份信息加密
- AI 不得主动外发客户信息
- 所有修改可追溯
- 删除客户必须律师确认

---

# 十一、设计原则

1. Client 是独立对象，不依附于 Matter。

2. 一个 Client 可以关联多个 Matter。

3. 一个 Matter 可以关联多个 Client。

4. Client 保存客户信息，不保存案件信息。

5. AI 可以识别客户，但不能确认客户。

6. 客户身份信息必须律师确认。

7. 客户对象是律师长期积累的重要资产。

8. V1 不拆分 Party，对案件参与角色通过 MatterClient 的 role 字段表示。
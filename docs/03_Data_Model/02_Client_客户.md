# Client（客户）数据模型

## 一、定义

Client 是案件中的客户对象。

AI Native Lawyer OS 只服务独立律师，因此 Client 不做复杂 CRM，只记录办案必要信息。

## 二、基本字段

| 字段 | 含义 | 示例 |
|---|---|---|
| client_id | 客户编号 | C-2026-0001 |
| name | 客户姓名/名称 | 张三 |
| client_type | 客户类型 | 自然人 / 公司 / 个体工商户 |
| phone | 联系电话 | 13800000000 |
| wechat | 微信号 | zhangsan123 |
| id_number | 身份证号/统一社会信用代码 | 110101xxxxxxxxxxxx |
| address | 联系地址 | 北京市朝阳区 |
| role_in_matter | 案件身份 | 原告 / 被告 / 申请人 / 被申请人 |
| matter_id | 关联案件编号 | 2026-0001 |
| source | 客户来源 | 朋友介绍 / 网络咨询 / 老客户 |
| consultation_date | 咨询日期 | 2026-06-30 |
| intake_status | 咨询状态 | 咨询中 / 已接案 / 未接案 |
| ai_summary | AI客户摘要 | 客户主张存在借款关系，需补充转账记录 |
| lawyer_note | 律师备注 | 客户沟通积极，但证据不完整 |

## 三、V1 只保留必要能力

Client V1 不做：

- 客户营销
- 销售漏斗
- 客户分层运营
- 商机管理
- 大型 CRM

只做：

- 记录客户基本信息
- 关联案件
- 保存咨询资料
- 支持接案评估
- 支持后续案件沟通

## 四、AI 可读取内容

AI 可以读取：

- 客户基本信息
- 咨询记录
- 录音转文字
- 微信聊天内容
- 客户提交材料
- 律师备注

## 五、AI 可生成内容

AI 可以生成：

- 客户咨询摘要
- 客户诉求整理
- 事实初步梳理
- 风险提示
- 接案评估建议
- 需补充资料清单
- 沟通问题清单

## 六、律师确认规则

以下内容必须由律师确认后生效：

- 是否接案
- 客户身份信息确认
- 收费方案
- 委托事项
- 代理权限
- 案件正式创建

## 七、Client 与 Matter 的关系

一个 Client 可以关联多个 Matter。

一个 Matter 可以有一个或多个 Client。

V1 先按最简单方式处理：

- 一个案件默认一个主要客户
- 多客户作为补充字段记录
- 后续再扩展复杂关系

## 八、V1 最小可用字段

第一版开发至少需要：

- client_id
- name
- client_type
- phone
- role_in_matter
- matter_id
- consultation_date
- intake_status
- ai_summary
- created_at
- updated_at

## 九、设计原则

Client 不是 CRM 对象，而是案件服务对象。

所有客户信息都应服务于咨询、接案、办案和沟通，不做多余管理。

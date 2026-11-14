---
id: TASK-87.1
title: 让任务领取与交付及时对账，阻止已交付工作重复开工
status: In Progress
assignee:
  - '@Furinya'
created_date: '2026-11-14 06:09'
updated_date: '2026-11-14 07:43'
labels: []
dependencies: []
references:
  - docs/evidence/backlog-reconcile-20261114.md
parent_task_id: TASK-87
priority: medium
type: bug
ordinal: 174000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户连续指出M7、M8及无里程碑旧任务与真实生产脱节，已合质量棘轮仍挂进行中，旧指引任务被误标待手机验收。现有检查只验任务格式，不核交付状态；本轮纠正队列并在现有入口加入轻量对账。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 逐项记录收口、归档和保留依据，GUI与CLI一致，未知设备要求不误报完成。
- [x] #2 已交付但漏同步或仅待验收的任务不得作为新实现领取；旧行为负例失败，新检查提示或拒绝。
- [x] #3 复用现有交付与Backlog入口校验明确的任务处置，不凭日期、文字猜测或CI绿灯自动勾AC。
- [x] #4 核查重复建设风险，定向回归、Backlog检查及独立复审通过。
- [ ] #5 当前机制改动提交并按正常独审、Hosted CI、原生队列及合后验收进入develop后再正式结项；本地完成不冒充已部署。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 核对远端任务、开放PR和源码交付。2. 用CLI整理队列并保存逐项证据。3. 在现有入口增加最小状态对账和负例。4. 独立复审并验证GUI/CLI；远端交付按实际授权与门禁。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-14：默认CLI适配器真实写入与JSON读回验证；旧marker覆盖Blocked负例已RED到GREEN，重试绑定精确本地交付收据。

2026-11-14本地交付：81条Done移入completed，15项归档，13项漏同步收口；GUI和CLI均82条且ID一致，进行中30降为5。旧metadata两文件经用户明确批准修复；task:pick实际TASK-81返回HOLD，防止待验重复实现。新机制102/102及相邻交付协议96/96、syntax/guidance/verify:backlog/doctor均通过；真实Windows CLI写入/JSON读回通过。独立复审ses_e27453480ffeyQKlk8niIDnqTF最终解除P1，无新阻断；旧marker+Blocked/精确收据重试/读回负例均已红绿验证。当前工作仅在feat/backlog-reconcile-1114 GUI独立树，未提交、推送、合并或新增Hosted Full，新增AC5如实保留。

2026-11-14用户再次指出M7及旧任务大量To Do失真：本轮核对已开展与未开工，纠正待验不等于未开始；verify处置须保持进行中，显式Blocked保留。复用本任务修正回归与独审，不新建重复治理任务。

2026-11-14第二轮交付：已逐项复核77条旧To Do，8项M7及其他61项恢复已开展In Progress；5项明确审批阻塞改Blocked，4.2/42/90保留未开始。现82条=74IP/3ToDo/5Blocked，GUI/CLI的ID和status一致，创建时间与验收勾选保留。确认GUI卡片显示创建时间，并非更新时间。verify处置不再退回To Do，且不得清除Blocked；两条新反例RED到GREEN，104/104与Backlog/doctor/guidance/syntax通过。独立复审ses_e27453480ffeyQKlk8niIDnqTF针对本轮复核可接受。原AC5继续等待正常集成，不新增任务或冒称已部署。

2026-11-14用户明确要求提交本轮Backlog及反复确认的全部机制，创建PR并挂原生自动合并，供随后版本规划引用。本轮授权扩展至提交/推送/PR/正常自动合并；AC5仍待真实合后验证，不用入队冒充完成。整理后的82项状态为74进行中、3待办、5明确审批阻塞。

2026-11-14用户明确要求独审后先挂原生自动合并，不应守到Impact运行。原托管43571256496/job132375965323已读取实际失败：本轮delivery静态导入roadmap继而引入安装前luaparse，现机械抽出无依赖metadata解析并保留兼容导出；三个真实发布器在拒绝所有npm包的冷进程反例先红后绿。协调器仅在显式ci:full、严格原生Full队列及精确当前pending Impact身份可验证时先登记schema4；已知失败仍拒绝，握手中失败/Fast切换撤销，全部CI与队列Full门禁不变。8文件224/224及Backlog/doctor/guidance/syntax通过。继续按当前HEAD独审后授权，不把旧失败或入队当合后成功。
<!-- SECTION:NOTES:END -->

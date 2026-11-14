---
id: TASK-107
title: 分离返回主菜单、继续本局与放弃退出
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-14 10:12'
updated_date: '2026-11-14 10:38'
labels: []
milestone: m-8
dependencies: []
references:
  - docs/backlog-details/TASK-107-menu-navigation.md
priority: medium
type: enhancement
ordinal: 177000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户指定参照杀戮尖塔原版；复用V25菜单与状态管理，仅保留当前会话，不增加持久化存档。与TASK-4.16剩余设备验收及主菜单美术任务分离。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 地图、战斗及节点返回主菜单后可继续，原本局状态保持且暂停期间不推进
- [x] #2 放弃本局与开始新游戏覆盖进度均有明确确认，取消不丢失进度
- [ ] #3 主菜单退出游戏沿用平台结算且明确退出奇域不可恢复；保留V25美术
- [ ] #4 定向回归、独立复审及仓库准入通过，PR授权原生合并；设备验证缺口如实记录
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 从最新develop隔离实现，复用退出确认框和V25控件。2. 添加会话暂停/恢复、独立放弃及新游戏确认，保留平台退出结算。3. 真实Lua Host覆盖地图、战斗、节点、取消、旧触点和结算失败；相关检查与独立深审。4. 提交PR，核实精确SHA准入后授权原生合并并交接设备验证缺口。

5. Owner追加授权修复合并链路；提取PR661精确固定ID与动态canonical路由的7文件修复，独立复审后解除整包依赖并授权队列。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已实现会话暂停/恢复与独立确认，保留平台退出。地图/战斗/反馈busy/节点状态往返和退出失败重试首批通过；相邻18项与工程门禁通过。新增奖励、强制选牌、V25手柄验证进行中；官方导入、ready、设备未验。

当前Host已覆盖地图/战斗/反馈/节点/奖励/强制选牌及V25手柄往返；前两项按软件合同验收。平台真实结算、同候选官方导入/ready/PC手机未验，AC3不勾；独立审查无阻断，PR与精确授权收据待收口。详见附件。

不再等待PR661整包：复用其已验证改名门禁修复，固定ID1429751262、Strict/Full/精确SHA等保护不变，避免引入其余605文件。

本轮提取的7文件改名门禁与PR661逐字相同，77项门禁、105项选择器以及Full/交付相邻回归通过。任务继续In Progress；将解除PR661依赖并按新HEAD重新独审授权，不沿用旧收据。
<!-- SECTION:NOTES:END -->

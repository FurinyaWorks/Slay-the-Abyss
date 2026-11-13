---
id: TASK-25.4
title: 补齐所有场景共享卡框的原稿设计
status: In Progress
assignee:
  - Furinya
created_date: '2026-10-28 09:39'
updated_date: '2026-11-13 07:59'
labels:
  - 待验
milestone: m-8
dependencies: []
references:
  - docs/design/CARD_FACE_PARITY.md
parent_task_id: TASK-25
priority: medium
ordinal: 121000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
按Card与CardText批准稿还原共享卡面，覆盖手牌、牌库、奖励、商店与锻造；不制作插画、不改规则。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 五类场景使用完整共享卡框与动态费用反馈
- [ ] #2 原生方案有能力证据和1倍对照预览
- [ ] #3 布局运行时回归通过，平台未验证范围明确记录
- [ ] #4 按本轮明确的初代杀戮尖塔PC真实样卡逐项复刻卡面结构；职业元素配色与牌型、稀有度层分离；保留同尺度对照及逐层差异证据，公开简化替代稿不能充当原版参照。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
核对原稿与原生图库；共享装配与皮肤绑定；各场景复用；生成预览并运行回归；提交PR。

本轮永久卡组沿已合共享战斗卡面，复用五列暗场、四项排序与左下返回，browserShell只控制表现、永久run.deck与临时战斗费用隔离。补17张商店、0/1/5/6边界、详情/滚动、回收与迟到输入、新choice保护。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
共享原生装配与三个运行时宿主已接入；原生图片几何、材质高光、角色徽记、类型标签、费用环反馈及状态复用均有离线证据。用户本轮选择自行导入，待独立候选和用户本轮实机证据；任务保持In Progress，不宣称平台UI通过。未使用OpenCode，额度节省未知。

2026-10-28排期复核：共享卡框是前两幕M4必做品质项，补齐Medium优先级并列入M4排期；原生能力、同候选及设备实测缺口保留，状态和未勾验收不变。负责人按项目约定统一Furinya。

2026-11-07 看板核对（develop 2c85bc61）：实现类交付已按历史记录保留，剩余 AC 待同候选官方/设备验证；当前无在途 PR，状态由 In Progress 归 To Do（待验）。

已实际渲染并核对17张永久卡组五列、滚底末行两张、详情返回及商店恢复；独审R2通过，工程/变异/原生合同通过。当前为离线实际Lua/Simulator证据，未取得官方同候选设备验证，不勾AC。Owner授权提交并在准入通过后auto merge。

用户2026-11-13再次拒收卡面风格，要求准确样式移植而非泛泛参考；参照在精不在多，用一张主样卡与最少单变量对照环环相扣。当前先核验原始参照、轮廓/比例/边框/分区/文字/材质及元素token映射，未做新卡面生产修改。旧统一组件通过不表示卡面质量已获认可。
<!-- SECTION:NOTES:END -->

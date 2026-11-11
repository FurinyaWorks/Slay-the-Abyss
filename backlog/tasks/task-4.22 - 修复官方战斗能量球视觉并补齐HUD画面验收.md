---
id: TASK-4.22
title: 修复官方战斗能量球视觉并补齐HUD画面验收
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-11 14:56'
updated_date: '2026-11-11 16:00'
labels:
  - ui combat visual-regression
milestone: m-8
dependencies: []
parent_task_id: TASK-4
priority: medium
type: bug
ordinal: 172000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户在原神官方客户端实测中拒收左下金色大圆盘、粗框和巨大白字，现有approved-energy-orb只锁属性，未验证最终观感。对照批准V25做最小视觉修复，并让关键HUD实际画面评审进入既有验收；与TASK30同一独立UI修复PR交付，不涉及626高图元角色。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 能量球在实际战斗尺寸下对照批准V25修复盘面、边框和数字观感，保留能量逻辑及可读性，不扩展UI设计。
- [ ] #2 复用现有测试/截图/验收机制，保留属性和规则断言，增加最终渲染证据及独立画面复审；旧粗糙实现不能只凭配置被判视觉通过。
- [ ] #3 交付与手机锁敌修复相同身份的可导入GIL及复测步骤，Simulator、官方客户端和实体手机结果分开；缺当前实机视觉验收不发布。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 对照批准V25与最终官方布局，复现能量大圆盘/粗边框/字号，先记录旧属性测试的盲点。2. 仅修盘面层次、边框与数字，保持位置安全区、能量规则及性能。3. 复用现有真实Simulator截图和UI验收，独立查看实际尺寸；官方客户端与手机标为待用户同候选复测。4. 与TASK30共用独立PR及最终正常入口GIL，排除626，实机视觉验收前不发布。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
最小修复仅作用official-assets-first：保留86尺寸/位置，官方原生圆面6层替代暗色材质堆叠；29→26字号适配原生字形，连续轮廓替代重复阴影。零/正常/溢出能量当前官方Host回归通过。verify:ui新增HUD画面评审和实际phone/touch来源要求，Simulator独立记录。
<!-- SECTION:NOTES:END -->

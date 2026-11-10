---
id: TASK-103.1
title: 地图页V25原生视觉与流畅度专项优化
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-10 09:00'
updated_date: '2026-11-10 11:11'
labels: []
milestone: m-8
dependencies: []
references:
  - docs/plans/2026-11-10-map-v25.md
parent_task_id: TASK-103
priority: medium
ordinal: 168000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner明确授权独立地图任务与PR；复用#582生命周期，避开#588战斗页。整体还原V25并测首次显示、连续交互和资源释放。保持地图生成、规则、RNG、跨幕和同局状态；TASK-4.13设备验收保留。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 实际地图截图整体接近V25批准稿，覆盖背景路线节点图例状态反馈。
- [x] #2 真实地图生成、连接、选择、跨幕和同局状态通过既有回归。
- [x] #3 Simulator SDK及浏览器提供冷显现、切页、点击、20轮交互、释放原始性能数据与身份。
- [ ] #4 独立PR交付，官方设备未测明确标注；不合并不发布。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
按docs/plans/2026-11-10-map-v25.md执行；先真实MapUI基线与截图，再修视觉与已证实性能热点，20轮交互/释放、既有回归和独审后只开PR不合并。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
地图原生纸面、虚线路线、节点层级、官方骷髅与图例、手势反馈、药水容量3/5及恢复已实现并独审。真实SDK20轮战斗地图往返状态不变、17357暖态稳定、销毁0；浏览器真实点选与5次防重复通过。证据docs/evidence/map-v25-20261110。V25候选生效，#588官方素材路径未自动接入；官方设备/GIL导入未测，PR与CI收口中。
<!-- SECTION:NOTES:END -->

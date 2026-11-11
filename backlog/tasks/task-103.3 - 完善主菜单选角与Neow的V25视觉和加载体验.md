---
id: TASK-103.3
title: 完善主菜单选角与Neow的V25视觉和加载体验
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-11 08:07'
updated_date: '2026-11-11 08:21'
labels: []
dependencies: []
parent_task_id: TASK-103
priority: medium
ordinal: 171000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
接续已合并607与待合入621的战斗技术成果，集中完善非战斗入口三页；其他页面已有执行者，避免重复移植。用户要求独立PR，不合并不发布。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 三页对照批准V25完成真实画面与交互黑盒评审，差异和未验项有证据
- [ ] #2 复用官方素材现有组件和生命周期，保留同源性能基线及回归证据
- [ ] #3 同候选贯通菜单到选角祝福地图战斗，交付可试玩入口和独立审查PR
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.核对621与现有三页/冻结原稿，复现真实画面和加载症状。2.在现有布局与生命周期内复用官方素材和有限组件，保留规则与其他页面。3.同候选SDK/真实渲染黑盒及性能配对回归，621合入后验证完整流程。4.独立复审与相关门禁，交付试玩入口和独立PR，不合并发布。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已从develop3a061a76建立feat/noncombat-v25；621仍OPEN自动合并。第一轮源码31886413复用V25菜单/选角布局、官方旗帜与现有有限战斗形状；独审发现结果页串样后已修，两种结果往返及负控通过。自然实际GIL截图与性能正在验证，不勾AC。
<!-- SECTION:NOTES:END -->

---
id: TASK-103.4
title: 实现参考图主菜单原生2D分层场景
status: Done
assignee:
  - Furinya
created_date: '2026-11-12 01:35'
updated_date: '2026-11-12 02:32'
labels: []
milestone: m-8
dependencies: []
parent_task_id: TASK-103
priority: medium
ordinal: 172000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
按本轮附件唯一参考接手主菜单背景。替代此前3D候选方向，保留现有标题按钮与事务；独立Draft PR，不合并发布。与103.3的选角和Neow范围分离。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Simulator实拍可辨识右侧断裂石碑青色裂隙石阶远景遗迹和左侧留白
- [x] #2 约80至150新增原生图元，复用既有转换和素材，不导入新生成图或3D
- [x] #3 加载切页与性能有同候选实测，Draft PR附截图参考对照和控件数
- [x] #4 性能为硬前提：同条件对照首屏加载与切页，完整入口不能长时间等待；未达标继续调整或明确未验收
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.以附件唯一参考，复用production-25d分层和V25原生多边形转换，静态约80至150图元。2.接入现有菜单布局，保留标题输入和退出/选角事务。3.Simulator真实截图逐项比较并迭代；测启动切页稳态与往返控件数。4.独立审查、相关门禁，提交Draft PR和证据，不合并发布。

用户追加性能硬前提，先定位归档/首帧成本，复用既有生命周期并做同条件A/B，不能仅用新增控件少宣称流畅。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮完成150图元17容器的原生2D背景，独立视觉复审基本场景通过。接续PR623现有菜单，独立Draft背景增量；不合并发布。最终GIL447e7f20由干净3a2fee27构建，真实读回0差异；Simulator归档374ms、首帧2120ms、菜单到选角288ms，全部自然切页110至781ms。串行AB未观测明显背景增量，SDK683帧P95 7.96ms。截图/参考/数据与验收边界见docs/evidence/menu-native-2d-20261112。官方设备未测。

已提交独立Draft PR633：https://github.com/FurinyaWorks/Slay-the-Abyss/pull/633；暂以623菜单分支为base，依赖其合入后转develop。保持Draft、无自动合并、不发布。Simulator本轮范围已交付，官方设备与Hosted Full不冒称通过。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
按唯一参考实现150图元17容器原生2D菜单背景并保留原菜单事务。最终GIL447e7f20真实读回、截图与独立视觉/代码复审通过；首帧2.12s、菜单切页288ms、SDK683帧P95 7.96ms，AB未观测明显背景增量。证据及复现见docs/evidence/menu-native-2d-20261112，交付Draft PR633，不合并发布。
<!-- SECTION:FINAL_SUMMARY:END -->

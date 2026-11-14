---
id: TASK-103.1
title: 地图页V25原生视觉与流畅度专项优化
status: Done
assignee:
  - Furinya
created_date: '2026-11-10 09:00'
updated_date: '2026-11-14 06:12'
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
- [x] #4 独立PR交付，官方设备未测明确标注；不合并不发布。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
按docs/plans/2026-11-10-map-v25.md执行；先真实MapUI基线与截图，再修视觉与已证实性能热点，20轮交互/释放、既有回归和独审后只开PR不合并。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
地图原生纸面、虚线路线、节点层级、官方骷髅与图例、手势反馈、药水容量3/5及恢复已实现并独审。真实SDK20轮战斗地图往返状态不变、17357暖态稳定、销毁0；浏览器真实点选与5次防重复通过。证据docs/evidence/map-v25-20261110。V25候选生效，#588官方素材路径未自动接入；官方设备/GIL导入未测，PR与CI收口中。

独立Draft PR #603已建立，HEAD 6ef975bc。最终实际截图发现102039在当前Simulator缺图，已撤回并保留rejected证据，成功证据回用已验证102044同运行时候选。未合并发布；#588官方素材路径仍需后续明确接线，Hosted Full未完成。

Owner要求集中减负：2026-11-10旧PR/分支入口已关闭或清理，唯一剩余组合入口#607，CI减负入口#606。完整来源、精确SHA和恢复方法见docs/backlog-details/INTEGRATION-CLOSEOUT-20261110.json；10份M7独立切片只是保全待接续，未进入主线，UI组合也未验收。沿集中入口处理，不为同一来源再开平行PR；当前未勾AC和状态保持。

2026-11-14逐项对账：PR634实际squash为903bf2a3，PR Full43211206190、原生队列43219327412及push43229600772均success；本轮原verify:delivery --merged真实返回merged_passed，证据build/delivery/bbd96f62-7d15-4932-9139-2b37f349166a。当前基线9f2f44e4保留该成果。此为交付记录收口，不新增平台或设备通过。 4项AC原已全勾，地图切片已由607/634接入正式流程；后续整体验收归103，地图体验余项归4.13。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
4项AC原已全勾，地图切片已由607/634接入正式流程；后续整体验收归103，地图体验余项归4.13。 本轮已核对真实合后交付证据。
<!-- SECTION:FINAL_SUMMARY:END -->

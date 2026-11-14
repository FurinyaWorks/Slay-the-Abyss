---
id: TASK-81.3
title: 避免不可建模改动的无用源码扫描
status: Done
assignee:
  - Furinya
created_date: '2026-11-06 05:36'
updated_date: '2026-11-14 06:13'
labels: []
milestone: m-7
dependencies: []
parent_task_id: TASK-81
priority: medium
type: bug
ordinal: 162000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
快速反馈在仅docs/HANDOFF等不可建模输入时仍先枚举和读取全部源码，随后才返回Full。已用拒绝语料枚举的真实CLI探针确认这段无用IO；改动范围判定可提前完成，不能因此丢失混合改动的有效反馈。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 仅不可建模输入或空改动的CLI不枚举源码语料，原Full结论、原因和非回归通过提示保持
- [x] #2 混合已映射与未知输入保留原选集及Full回退，特殊受支持输入和高风险保守边界不变
- [x] #3 确定性IO反例旧实现失败、修后通过，定向合同与独审通过并按原正常集成门禁交付；不伪称整体CI提速
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
先在原quick-feedback测试中以预加载IO守卫证明仅不可建模CLI不应读取语料，观察旧实现失败；复用同一输入路径谓词，在纯不可建模集合时跳过语料加载，混合和可建模输入仍走原图。核对两advisory模式及related plan、空集、特殊fixture输入与原Full政策，独审后集成。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
紧急集成由来源34115e2b接入；原TASK-81.2仍指Fast合并队列，本任务经doctor消歧为81.3。

2026-11-14对账：不可建模输入零语料IO的确定性CLI守卫、混合映射与未知Full边界本轮复验通过；实现已随607等集中交付，634合后Full及原交付验证本轮已读回，原待合记录失效，不宣称整体CI性能达标。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
不可建模输入零语料IO的确定性CLI守卫、混合映射与未知Full边界本轮复验通过；实现已随607等集中交付，634合后Full及原交付验证本轮已读回，原待合记录失效，不宣称整体CI性能达标。
<!-- SECTION:FINAL_SUMMARY:END -->

---
id: TASK-88.1
title: 统一紧急集成develop基线
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-08 01:12'
updated_date: '2026-11-10 13:49'
labels: []
dependencies: []
parent_task_id: TASK-88
priority: medium
ordinal: 165000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 所有有价值来源均有可追溯去向
- [ ] #2 组合源码验证与2D候选身份真实可查
- [ ] #3 统一develop并清理已保全来源及核对保护
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 以最新develop冻结24个开放PR、远程分支和本地脏树身份。2. 将已完成工程与CI切片集中集成，保留来源和独立复审，正常队列及合后Full验收。3. 收拢UI/地图/事件和素材，保留未完成设备关口，消除重复PR。4. 已消化分支先bundle验证再删除，保留未提交工作；最终读回PR、分支、工作树及develop CI。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner追加全量收口：五公开实验222路径已恢复逐blob验证；#554原两支及最小raw修复实验归档，不动默认API；私UI保留本地bundle。修复组合35-owner鲜读、UI退休/隔离、旧native/Session分层与跨平台102 helper身份；本轮UI/组合52、Session4、CI23等通过。最终远端目标0PR与develop/master两支，Full排队单独跟踪。
<!-- SECTION:NOTES:END -->

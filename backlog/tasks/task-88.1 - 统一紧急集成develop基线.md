---
id: TASK-88.1
title: 统一紧急集成develop基线
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-08 01:12'
updated_date: '2026-11-08 02:04'
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
1. 冻结盘点；2. 统一集成；3. 组合验证与候选；4. develop正式合入和清理

Owner追加全部收口：修复并消化#554；将其余来源写入可恢复隔离档案，清理所有非主线远程分支；修复合后历史回放/退休及CI，保留2D默认。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner追加全量收口：五公开实验222路径已恢复逐blob验证；#554原两支及最小raw修复实验归档，不动默认API；私UI保留本地bundle。修复组合35-owner鲜读、UI退休/隔离、旧native/Session分层与跨平台102 helper身份；本轮UI/组合52、Session4、CI23等通过。最终远端目标0PR与develop/master两支，Full排队单独跟踪。
<!-- SECTION:NOTES:END -->

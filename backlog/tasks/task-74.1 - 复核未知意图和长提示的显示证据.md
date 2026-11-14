---
id: TASK-74.1
title: 复核未知意图和长提示的显示证据
status: In Progress
assignee:
  - Furinya
created_date: '2026-10-28 14:45'
updated_date: '2026-11-14 06:51'
labels:
  - delivery-verify
milestone: m-8
dependencies: []
references:
  - docs/backlog-details/ENGINEERING-HEALTH-20261028.md
  - docs/plans/2026-11-03-m9-engineering-foundation.md
parent_task_id: TASK-74
priority: medium
type: task
ordinal: 123000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
工程审计发现UNKNOWN主图可能被详情推成buff，最长143字符提示在旧1080x32布局可能裁切。已有独立离线候选与完整恢复证据；后续以实际主线核对，不重新混合两套历史回放。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 未知召唤意图按原来源保持unknown，详情和实际目标行为不变
- [ ] #2 最长提示与拥挤敌人、药水及浮字显示完整并有实际证据
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-14第二轮状态纠正：ENGINEERING-HEALTH-20261028.md已保存独立UI候选、unknown语义和143字符容量审查；当前主线显示复核未完，属于已开展待验。 状态表示整个任务的完成进展，不表示当前有执行者持续占用；保留原未验AC、负责人、依赖及历史证据。更正过去把已开展待验事项退回To Do的处理。
<!-- SECTION:NOTES:END -->

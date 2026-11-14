---
id: TASK-105
title: 实现轻量璃月黑白开局转场
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-14 07:06'
updated_date: '2026-11-14 07:27'
labels: []
milestone: m-8
dependencies: []
documentation:
  - docs/backlog-details/TASK-105.md
priority: medium
type: enhancement
ordinal: 174000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
当前旧开场演出禁用，确认角色后缺少自然衔接。用户要求复用现有过场与遮挡机制，仅做璃月短过场，不整份导入参考存档、不改规则。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 确认角色到开局展示短时黑白璃月过场，原生控件数量有据可查
- [x] #2 遮挡和输入隔离覆盖全程，结束与取消不残留遮罩，菜单选角开局流程回归通过
- [ ] #3 提供当前实现实际截图和完整前后衔接证据，明确模拟器与官方实机验证边界
- [ ] #4 完成独立评审并提交目标 develop 的正常 PR
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 复用 prologuePanel、OnUpdate 和现有遮挡接口，移除旧演出布景，仅保留全屏遮罩、中央白色岩印与拦截层。2. 确认角色后播放短过场，覆盖时保持选角静帧，全黑后揭示原开局，复用原取消与结算入口。3. 增加时序、输入隔离、取消和开局衔接回归，生成实际运行截图。4. 独立复审、必要质量检查并创建 develop PR，官方实机证据按本轮窗口授权完成。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已实现并独立复审通过；工程门禁、12项定向回归与同候选实际 Lua 模拟器截图完成。存档交用户手动新导入；官方导入、ready与设备视觉待验，AC3保持未完成。技术证据见 docs/backlog-details/TASK-105.md。
<!-- SECTION:NOTES:END -->

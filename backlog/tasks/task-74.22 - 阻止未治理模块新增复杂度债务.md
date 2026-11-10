---
id: TASK-74.22
title: 阻止未治理模块新增复杂度债务
status: To Do
assignee:
  - Furinya
created_date: '2026-11-10 14:01'
labels: []
milestone: m-7
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/issues/600'
parent_task_id: TASK-74
priority: low
ordinal: 170000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
由内部Issue #600迁入。既有复杂度债务由TASK-74.20负责，依赖环由TASK-74.19负责；本任务只研究未受专项门禁约束模块的新增函数与初始化块。已在ab65ed3b用具名/匿名CC17函数证实未治理模块退出0、已治理模块退出1，尚未实施新规则。P2后续，不阻塞当前M7集成。完整正文、实测与讨论见docs/backlog-details/ISSUE-600-MIGRATION-20261110.json。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 当前SHA复核专项覆盖范围和新增CC超标函数的真实正反对照
- [ ] #2 只限制真实新增债务，定义移动改名、嵌套匿名函数及生成文件的身份；保留历史热点和现有专项硬门槛
- [ ] #3 复用既有AST和Luacheck，无新增扫描器、CI作业或依赖，量化耗时并保留原行为oracle
- [ ] #4 真实违规与合法负例、独立复审及完整CI通过；若现有任务已覆盖则合并追踪而不重复实施
<!-- AC:END -->

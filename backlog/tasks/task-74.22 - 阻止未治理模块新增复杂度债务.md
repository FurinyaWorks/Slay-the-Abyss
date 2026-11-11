---
id: TASK-74.22
title: 阻止未治理模块新增复杂度债务
status: In Progress
assignee:
  - Furinya
created_date: 2026-11-10 14:01
updated_date: '2026-11-11T02:48:00Z'
labels: []
milestone: m-7
dependencies: []
references:
  - https://github.com/FurinyaWorks/Slay-the-Abyss/issues/600
documentation:
  - docs/backlog-details/M7-QUALITY-RATCHET-HEAD-20261111.md
  - docs/backlog-details/M7-QUALITY-RATCHET-CLOSEOUT-20261111.md
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
接续已有PR616，不重复实现棘轮。先用真实Git与固定Luacheck验证精确HEAD、CC/SCC及源码发现边界；修复已证实执行器缺口并保留红绿证据。随后接回新增测试与工作流的严格历史来源视图，保持全部原断言、阈值、库存和预算；独立复审及最终HEAD正常CI、队列与合后验证分别完成。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11复核develop6a614fc8与PR616 ae27b946，task:pick为ALLOW；协调后接续现有候选。独立实测已提交CC16源码能被同一HEAD的未提交安全工作树替换而误报pass，需先修精确输入绑定。已有835/834历史库存拒绝仍未修复，不启动Full试错，不勾AC或宣称准入。

精确提交输入切片已修复：两侧Git对象图与HEAD策略/配置，9/9专项及11/11相邻回归通过；完整345模块逐字匹配、1953引用及68/11/2 SCC不变。小切片独审通过，3项额外真实Git边界通过。新增匿名函数序号借用旧债/误拒绝旧函数的真实AST负控已保全；与835/834库存缺口共同保持阻断，不写整PR准入。详见docs/backlog-details/M7-QUALITY-RATCHET-HEAD-20261111.md。

接续45eb945收口匿名身份和835/834历史合同：同AST可选上下文/内容指纹，一对一额度与父owner匹配，不再按匿名序号借债；默认345模块5918量测逐字段不变。真实CLI新SCC/CC增长红灯、旧债不变和无Lua绿灯；独审另发现src/lua非Lua文件误拒绝，已用递归Lua pathspec修复并保留红绿。完整CI消费者83/83、最终calibration52/52、合流六文件53/53、最终ratchet18/18及库存2/2；独立CI70、双binding60、身份9组负控通过。完整工程补生成物后4/4变异kill和native UI6/6通过，首次缺build/lua失败保留。保持Draft，最终Windows/Hosted/队列/合后未验；见M7-QUALITY-RATCHET-CLOSEOUT-20261111.md。
<!-- SECTION:NOTES:END -->

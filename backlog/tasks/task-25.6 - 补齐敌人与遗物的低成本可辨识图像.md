---
id: TASK-25.6
title: 补齐敌人与遗物的低成本可辨识图像
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-14 02:48'
updated_date: '2026-11-14 05:36'
labels: []
milestone: m-8
dependencies: []
parent_task_id: TASK-25
priority: medium
type: bug
ordinal: 174000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner反馈最新候选仍有敌人缺图、遗物同箱占位，要求先有可辨识低资源图再迭代，不强行使用不适配官方素材。复用既有资产与图库适合项；本任务补简化原生图元图，与TASK-25.5旧精绘素材接入分别记录。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 核查最新PR并保存敌人与遗物缺图及占位清单
- [x] #2 用简化自绘补齐缺项，给出可审阅图集和运行接线证据
- [ ] #3 报告原生图元、构建字节、切换写入与释放开销，官方及手机未测明确保留
- [ ] #4 独立复审及相关回归通过，保留原精绘素材和许可
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.核对最新PR与42敌人、153遗物映射并保存缺图清单。2.为缺项制作有界原生简图，复用现有图标/Actor宿主，不开启旧600图元池。3.生成图集与真实Lua接线、缓存及清理证据。4.离线前后资源测量、相关回归和独审，官方设备未测保留。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
低成本简图本轮本地提交181e4cde61532e13bac912119aca3dc503a4170b，独立树 .worktrees/lowcost-missing-art。42敌人689源图元/单只max28；88遗物732源图元/单件max14。official共享库192242字节，静态池新增679控件，每Actor新增33；默认profile不加图形池。低图元测试2/2、官方共享17/17、相邻路径13/13、语法/架构/Luacheck/许可证及official daily通过；独审指出的回退映射、颜色重入、瞄准dim与姿态重置已修并补回归。图集与资源报告 docs/evidence/lowcost-art-20261114/，等待Owner先看图；未推送/未自动合并新美术。未做Full、官方/手机验收，AC2/3/4不勾。保留旧精绘与许可。

Owner已大致查看两张简图集并明确批准当前版本合入，后续慢慢精修；现接续推送与精确独审、ci:full和merge:auto。历史待Owner审图状态由本条替代，官方/手机及合后Full未验不改Done。

Owner本轮已批准当前42敌人/88遗物简图直接推进合入。PR654 https://github.com/FurinyaWorks/Slay-the-Abyss/pull/654 已创建，ci:full；HEAD181e4cde61532e13bac912119aca3dc503a4170b / BASEe805a87dc4df1a048ba5995931d98a4e4899b5e9 最终独审pass、无未解P1/P2。精确审查记录 .worktrees/lowcost-missing-art/.artifacts/lowcost-art/independent-review.json，正在原merge:auto入口授权。尚未合并或官方设备验收，不改Done。

Owner已审阅并批准简图，完整88/42覆盖与生产接线证据齐，AC2据本轮证据勾选。PR654的merge:auto首轮因impact尚排队拒绝提前授权；原ci:full和独审未变，等待首次路由完成后读回，未绕过门禁。

PR654已完成推送/创建，明确ci:full、Depends-on:none及精确独审；GitHub首个impact作业持续QUEUED，原merge:auto仍明确拒绝Full CI routing is not ready，尚未获得auto-merge-requested，不可报告已入自动合并队列。无新源码失败或审批缺失，不绕过入口。接续命令：在 .worktrees/lowcost-missing-art 运行 npm run merge:auto -- 654 .artifacts/lowcost-art/independent-review.json；若BASE变化须先重新独审，不沿用旧记录。保持In Progress及工作树/证据。

当前单主角版集成接续：原PR654完整纳入integration-next，保留42敌人/88遗物源图、原精绘及许可；组合功能与共享页面定向验证通过。仅集成，不将离线/旧图当官方手机或发布验收。
<!-- SECTION:NOTES:END -->

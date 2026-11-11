---
id: TASK-103.3
title: 完善主菜单选角与Neow的V25视觉和加载体验
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-11 08:07'
updated_date: '2026-11-11 08:47'
labels: []
milestone: m-8
dependencies: []
parent_task_id: TASK-103
priority: medium
ordinal: 171000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
接续已合并607与待合入621的战斗技术成果，集中完善非战斗入口三页；其他页面已有执行者，避免重复移植。用户要求独立PR，不合并不发布。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 三页对照批准V25完成真实画面与交互黑盒评审，差异和未验项有证据
- [ ] #2 复用官方素材现有组件和生命周期，保留同源性能基线及回归证据
- [ ] #3 同候选贯通菜单到选角祝福地图战斗，交付可试玩入口和独立审查PR
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.核对621与现有三页/冻结原稿，复现真实画面和加载症状。2.在现有布局与生命周期内复用官方素材和有限组件，保留规则与其他页面。3.同候选SDK/真实渲染黑盒及性能配对回归，621合入后验证完整流程。4.独立复审与相关门禁，交付试玩入口和独立PR，不合并发布。

5.按用户要求重新完整验收：修复实际Licenses失败，扩充菜单退出/选角牌组/双祝福分支/首战出牌黑盒；定位加载等待真实根因，复核实际画面与最新集成边界，不以原流程通过结案。主菜单背景仍留技术评审。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已从develop3a061a76建立feat/noncombat-v25；621仍OPEN自动合并。第一轮源码31886413复用V25菜单/选角布局、官方旗帜与现有有限战斗形状；独审发现结果页串样后已修，两种结果往返及负控通过。自然实际GIL截图与性能正在验证，不勾AC。

用户追加：主菜单原高图元背景优化先留技术评审，不轻举妄动；已撤回未提交的塔景替代实验。保留原背景源码/资产/开关，不把当前官方候选底图当原高塔还原。独立Draft PR623，不启用Auto-merge。R2真实候选已构建，最终实拍/黑盒中；旧源码证明/新增测试清单接续正在整改，状态保持In Progress。

R2候选10a39d5c实际GIL读回13855控件/360Lua/0逆差异，七页自然黑盒、80→88祝福与首战通过，20次选角返回控件18352稳定/根销毁0。SDK step P95 17.29ms；浏览器归档12.10s、正帧7.59s、确认→Neow1214ms，仍有加载等待，不宣称提速。试玩http://127.0.0.1:55875/，证据docs/evidence/noncombat-v25-20261111/README.md。621仍OPEN，尚待合入后最新战斗集成；历史源码证明接续整改中，AC不勾。
<!-- SECTION:NOTES:END -->

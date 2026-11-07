---
id: TASK-103
title: 交付岩系旅行者两幕正式原生3D版本
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-07 13:57'
updated_date: '2026-11-07 14:44'
labels: []
dependencies: []
documentation:
  - docs/backlog-details/NATIVE-3D-INTEGRATION-20261107.md
priority: medium
ordinal: 166000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户本轮明确批准正式3D路线，保留Lua规则与2D卡牌，复用553及自维护MCP，独立分支保留稳定2D回退。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 两幕正式流程连续可玩且规则RNG进度语义不变
- [ ] #2 完整GIL候选写入读回，PC和实体手机同候选实测
- [ ] #3 源码测试性能证据独立评审PR可追溯
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 以用户1073741923实机截图/日志为失败基线，从渲染源停用2D角色怪物及4389控件立绘。2. 原生镜头和actor ID投影统一点选、拖牌、药水、HP状态意图；动作失败保持3D。3. 复用官方91件遗迹成品及原平坦碰撞平台，隐藏小地图，不用鼠标手搭或2D Simulator冒充3D。4. 单GIL真实写入读回、独审及原生客户端校准；未通过不称完成。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
独立分支feat/native-3d-production基于d8a57cae；正式GameUI/Run离线菜单至奖励回图已通过mock桥，原生5槽图11项通过；地图静止300帧同值颜色写入300→1，未宣称FPS。独审发现runtime同源、死亡历史容量和ready身份竞态，正在修正；完整构建曾因输入变更被拒绝，未冒称候选完成。

首个正式集成GIL已生成：e8a961fe/46309f66，347模块读回、静态0error345warning。PR556源码独审通过，Full待；PC/手机未验收。实际候选路径、失败历史和剩余三种通用外观等边界见附件，已申请本轮20分钟桌面窗口，未获回复前不操作。

用户本轮退回旧候选：347/347官方外部Lua与e8a961fe一致；真实日志证明battle立绘4389控件仍生成。已定位直接render/feedback恢复2D及目标仍旧坐标两根因，新增真实出牌点选/拖拽扣第二敌人HP回归及零旧工厂创建合同；不是以模型出现判验收。
<!-- SECTION:NOTES:END -->

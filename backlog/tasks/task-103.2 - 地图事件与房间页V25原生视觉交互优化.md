---
id: TASK-103.2
title: 地图事件与房间页V25原生视觉交互优化
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-10 11:46'
updated_date: '2026-11-10 13:03'
labels: []
milestone: m-8
dependencies: []
parent_task_id: TASK-103
priority: medium
ordinal: 169000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner明确追加授权接续地图优化，打磨两幕剧情事件及商店营地宝箱等房间页。复用已实现业务和#582生命周期，继承#603地图，不干扰#588战斗页；不新增规则或改变RNG/数值。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 真实事件和房间的视觉层次、选项状态、长文与多分支符合V25风格，逐屏实际截图自检。
- [x] #2 既有事件选择、费用奖励、卡牌选择、返回地图与同局状态回归通过。
- [x] #3 可交互Web Simulator入口及同源SDK连续操作/资源释放证据可复现；官方设备未测明确说明。
- [x] #4 独立PR和证据交付，不擅自合并或发布。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.核查现有完整事件及#588范围，继承#603独立树。2.沿用V25左右叙事与四选项结构，先做真实剧情事件视觉身份、长文与禁用说明，再覆盖商店营地宝箱和选牌房间已有面。3.复用SDK/GameUI保存与浏览器Pixi真实渲染，逐屏查看并进行选择/返回/20次连续操作释放。4.保持规则与RNG，既有事件/房间回归、独审、独立PR和可交互入口，官方设备未测列明。

5.Owner视觉返工：先批准稿与当前1280x720逐屏量化差异，复用现有官方kit/项目肖像，修事件/营地/商店及公共HUD；每屏并列差异复核，原稿未表达的真实四选项/长文只做最小必要适配，更新本PR，不并新功能。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已完成V25事件原生图章、四选项与完整药水说明、Neow尺寸和气泡、商店排布；真实SDK发现并修Match非法属性。最终source save afee98a1405542adcacd82906b5e02808623671425b526375f9d2d176097fffd，35场景、20次事务、120增量、控件17310稳定且释放0；9张最终图经主代理与独审逐张查看。证据 docs/evidence/event-v25-20261110/。官方GIL副本已编码读回静态通过，verify:ui缺同候选startup证据，官方设备未测不判通过。

最终可交互紧凑预览 http://127.0.0.1:4186/editor/play#event-v25-final 已真实浏览器指针验证：120→85治疗、设计师四项、七入口、页面错误0；测试导航重置场景，预览地图只读。完整GameUI同局证据另用SDK。

独立Draft PR #605 https://github.com/FurinyaWorks/Slay-the-Abyss/pull/605 已建立，继承#603/#582以develop为基线触发Required CI；没有自动合并或发布。独审10文件及9图无新增P1/P2。实现及证据已交付，任务保持In Progress等待Full CI及官方验收；本地全量未完成，不宣称Full通过。

Owner明确否定上一轮视觉接近度；撤回AC1。上一轮截图仅证明可显示与事务，不代表批准稿美术验收。返工严格逐屏对照私人冻结V25：事件原稿同行语义色选项/底对齐、长纸带、无自加圆盘；商店与营地恢复稿中构图和既有素材，顶部HUD同步。不得再用技术门禁通过或无P1/P2替代还原。
<!-- SECTION:NOTES:END -->

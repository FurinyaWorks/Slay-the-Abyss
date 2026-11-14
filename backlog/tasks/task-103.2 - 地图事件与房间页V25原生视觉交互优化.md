---
id: TASK-103.2
title: 地图事件与房间页V25原生视觉交互优化
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-10 11:46'
updated_date: '2026-11-14 02:20'
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

本轮试玩拒收：官方profile漏接批准地图墨色及普通事件样式；复用既有styleEvent接入正式composition和runtime token，消除实验室重复正文，保留三药水和离开、禁用/失败及真实事务。修复预览缓存EPERM导致遗物/怪物粉框，改工作区可写cache与精确资源预热。主菜单背景与hover由用户明确排除，另任务处理。用户明确授权本轮验证独审完成后送正常自动合并队列。

最终Full失败续修：先保留43473829313原始失败日志并暂停原生授权，区分真实行为回归、旧样式合同及来源投影/所有权漂移；逐类最小复现后修复，保留原断言语义、历史before全文与原预算。再跑对应失败族、独审和精确准入，不把本地通过当Full通过。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已完成V25事件原生图章、四选项与完整药水说明、Neow尺寸和气泡、商店排布；真实SDK发现并修Match非法属性。最终source save afee98a1405542adcacd82906b5e02808623671425b526375f9d2d176097fffd，35场景、20次事务、120增量、控件17310稳定且释放0；9张最终图经主代理与独审逐张查看。证据 docs/evidence/event-v25-20261110/。官方GIL副本已编码读回静态通过，verify:ui缺同候选startup证据，官方设备未测不判通过。

最终可交互紧凑预览 http://127.0.0.1:4186/editor/play#event-v25-final 已真实浏览器指针验证：120→85治疗、设计师四项、七入口、页面错误0；测试导航重置场景，预览地图只读。完整GameUI同局证据另用SDK。

独立Draft PR #605 https://github.com/FurinyaWorks/Slay-the-Abyss/pull/605 已建立，继承#603/#582以develop为基线触发Required CI；没有自动合并或发布。独审10文件及9图无新增P1/P2。实现及证据已交付，任务保持In Progress等待Full CI及官方验收；本地全量未完成，不宣称Full通过。

Owner要求集中减负：2026-11-10旧PR/分支入口已关闭或清理，唯一剩余组合入口#607，CI减负入口#606。完整来源、精确SHA和恢复方法见docs/backlog-details/INTEGRATION-CLOSEOUT-20261110.json；10份M7独立切片只是保全待接续，未进入主线，UI组合也未验收。沿集中入口处理，不为同一来源再开平行PR；当前未勾AC和状态保持。

集中接续#607已吸收最新事件来源d218f27b相对4eed增量：房间身份层、页面内容与既有实测记录完整保留，组合验证另做，不沿用原分支绿灯。

整片独立复审纠正：最新d218 revision-2已撤回上一版视觉结论，AC1仍未完成；取消旧勾选，保留In Progress和原实测证据。源码组合通过不替代视觉/官方设备验收。

2026-11-13 本轮反馈源码3ce7a682：普通事件复用styleEvent、去重复正文且保留错误；奖励条目复用圆角材质/旗帜按钮与rewardRows token。真实SDK自然7屏到首战及卡组/抽牌/空弃牌完成，祝福198次绘制0遮罩；受控奖励normal/hover/领取、两次排序返回及Lab三药+离开实测通过（仅SDK，非官方设备）。原始证据与验收边界见 docs/evidence/sts-feedback-20261113/README.md。主菜单按本次用户指示排除，官方导入/ready/手机要求保持未完成；通过现有精确SHA复审和CI后挂自动合并。

最终产品切片 fa7273ec：原生旧列表保留校准时序，原native6+官方复用3共9/9，原断言未改；来源10+隔离1和最终自然SDK7屏全部通过，祝福227帧0遮罩、空弃牌可开关。磁盘断连恢复后Git连通性、659项原始输入、存档及旧4档复核匹配；旧模拟器已停，新服务按最终源码重新启动。详细来源和未验证官方/设备边界保持在本轮README与source-checks.json。

2026-11-14 追加拒收已修于90c46efc：普通选项切角遮片排到装饰层后，上沿保留而不再溢出；大问号按事件换官方物品图，复用单一图片控件与主题映射。最终SDK大鱼/实验室5图、44/66/88三高度普通/悬停12组切角像素均通过，14官方图预取成功。新版试玩55316，旧62127保留至交付。源码来源10/10、隔离1/1和独审通过，证据在docs/evidence/sts-feedback-20261113/。官方与设备验收仍未完成；按用户授权送正常自动合并门禁。

Full43473829313失败后已用原入口暂停授权并续修。真实冷列表提前ready的P1修于ab895b0c：按文档可见索引+不同存活控件准入，保空弃牌与warm排序。新SDK自然7屏/181祝福帧0cover、controlled17卡266排序帧0cover通过；旧55316已停，新56606可玩。Full旧合同按明确新要求续接并保原before全文、原业务/RNG/输入断言和预算；source10与repair binding复验通过，Defect隔离旧H身份明确保留。按用户最新指示不扩测，收口后立即重新挂正常自动合并，不等待整轮CI。
<!-- SECTION:NOTES:END -->

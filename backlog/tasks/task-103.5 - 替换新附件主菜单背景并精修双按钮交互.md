---
id: TASK-103.5
title: 替换新附件主菜单背景并精修双按钮交互
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-13 14:12'
updated_date: '2026-11-13 16:37'
labels: []
milestone: m-8
dependencies: []
references:
  - docs/TOOLCHAIN.md
  - docs/design/UI_DESIGN.md
  - .artifacts/menu-red-background-intake/source.png
parent_task_id: TASK-103
priority: medium
type: enhancement
ordinal: 173000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户不满意主菜单标题字体和hover质感，提供红黑白角色图，授权探索去标题且仅保留开始游戏与退出游戏。美术保真与加载流畅为同等要求。独立于PR646选角和祝福范围，复用既有图元与生命周期工具。先确认原图可交付链路和具体方案，不预设可直接导入PNG。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 以本轮原附件核对真实运行画面，主菜单仅有开始游戏与退出游戏，布局不遮人物面部，字体与背景协调
- [x] #2 hover连续过渡，可中断和快速反向；命中区固定，禁用/离开/切页复位，触控点击保留
- [ ] #3 同候选记录冷启动及缓存返回、背景创建成本与交互性能；无逐块揭幕和重复整图创建，未实测项如实保留
- [ ] #4 独立工作树保留他人成果；相关回归、独立复审和可试玩候选完成，官方与设备验收分开报告
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.按本轮附件拟合红白黑人物，去标题双按钮。2.复用轮廓提取，最终1598原生图片，用2D双旋转与有符号缩放替代遮罩三角。3.完成连续可中断hover、结算/旧配置退出保护和真实Simulator试用。4.冷启动仍未达无感目标，待本轮原神窗口验证客户端；官方/设备与完整准入未验，保持In Progress。

5.用户反馈旧版：核对实际浏览器入口56706/style-d359015e；在独立副本合入当前样式候选的菜单切片，保留其他页面和揭幕/卡面逻辑，验证同一实际入口，避免只验证新端口。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮源码所有权为独立.worktrees/menu-red-background，菜单背景/按钮与小型拟合适配；不改PR646选角祝福与TASK94隔离试验。附件sha256=16bdf7b614f0fb6fdbc2414271682446c0012a9e8ff8da70abad3b7a0374480d，已保全.artifacts/menu-red-background-intake/source.png。用户再次明确不能直导图，要求实际拼接/拟合，本轮不再以PNG直导能力为前置。

已交付离线试用分支feat/menu-red-background，证据docs/evidence/menu-red-20261113/README.md。最终构建4e6bd583-da08-4248-b84c-ebb3fd44d9e0、GIL70995f18…c083a；361 Lua实际读回和本轮ready、hover、实拍通过。renderer P95 2.2ms；预载入口约1.90s，预载成本5.81s单列。冷首屏串联约15.96s、前轮SDK初始化7.02s，不能算无感加载或设备性能达标。独立复审允许基本画质/交互试用；Owner审美、冷启动、官方PC/手机和完整Hosted准入仍待。未合并发布。

本轮复现交付缺口：只读浏览器inventory显示用户使用56706样式候选，未打开独立61030。已与原样式线程协调冻结候选与入口所有权；不修改其脏工作树。修复后将核对实际入口的运行身份和真实截图，而不是要求用户猜版本。

更正协调状态：向原样式线程发送协调消息时被工具active writer锁拒绝，未收到原执行者回复。用户随后确认本轮临时掉盘已恢复，目录和提交均仍在；不归因为清理任务。后续只读冻结已提交的样式输入，组合输出写本任务目录，保留原工作树与服务回退材料。

本轮入口修复：原56706服务在掉盘后已退出；仅恢复本任务服务到原56706/style-d359015e，不触碰49386或样式脏文件。冻结fa7273ec样式归档，组合5个menu子树及5项适配脚本，其余361脚本、UI、模板和serverLogic保持；build=1af131dd-ee8d-4e67-80e6-7a6c1dba2da0，save=44e1c68a…26145。实际原端口无头实拍、自然菜单→选角→祝福→地图→首战通过；高旧sceneRev首次重连完整reset、单人控件与拒绝非法人数不破坏会话通过。证据docs/evidence/menu-red-entry-20261114；最终预载7.59s单列，冷首屏/官方/设备仍未验收，不标Done。
<!-- SECTION:NOTES:END -->

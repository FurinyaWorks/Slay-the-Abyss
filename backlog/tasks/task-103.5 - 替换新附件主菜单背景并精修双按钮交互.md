---
id: TASK-103.5
title: 替换新附件主菜单背景并精修双按钮交互
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-13 14:12'
updated_date: '2026-11-14 07:57'
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
- [x] #1 以本轮原附件核对真实运行画面，主菜单仅有开始游戏与退出游戏，布局不遮人物面部，字体与背景协调
- [x] #2 hover连续过渡，可中断和快速反向；命中区固定，禁用/离开/切页复位，触控点击保留
- [ ] #3 同候选记录冷启动及缓存返回、背景创建成本与交互性能；无逐块揭幕和重复整图创建，未实测项如实保留
- [x] #4 独立工作树保留他人成果；相关回归、独立复审和可试玩候选完成，官方与设备验收分开报告
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.按Owner确认的1500–1600绘图图元、上限1800预算重做大背景；保留参考构图和双按钮，不直导PNG。2.分层轮廓、可见三角颜色拟合与微小五官/发饰补绘，确定1600图元；记录原图、生成器与包身份。3.普通原生单轴静态XYZ加精确2D回退，背景总控件1732；原生GIL写入、独立读回和XYZ编解码合约验证。4.仅将实际GIL读回背景接入冻结的当前样式预览，保留其余365Lua和其他UI；修复刷新重复预建、设备切换备用实例与重复归档解析。5.同机三对新进程测背景/整游SDK创建和堆增量；实拍和WebGL提交时序、20次缓存返回、hover与自然首战验证。6.独立复审、接回原入口、归档证据；Owner审美、整游无感冷启动及官方PC/手机/Hosted准入未验，保持In Progress。

本轮收尾：严格沿用96219b31的menu.png及现有1600图元背景，仅在左上增加静态中文标题与Slay the Heavens副标题，原生双按钮补底板和四态，复用命中及动画；定向回归、实际模拟器截图、独立复审后提小范围PR，依赖PR643落地再合develop。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮源码所有权为独立.worktrees/menu-red-background，菜单背景/按钮与小型拟合适配；不改PR646选角祝福与TASK94隔离试验。附件sha256=16bdf7b614f0fb6fdbc2414271682446c0012a9e8ff8da70abad3b7a0374480d，已保全.artifacts/menu-red-background-intake/source.png。用户再次明确不能直导图，要求实际拼接/拟合，本轮不再以PNG直导能力为前置。

已交付离线试用分支feat/menu-red-background，证据docs/evidence/menu-red-20261113/README.md。最终构建4e6bd583-da08-4248-b84c-ebb3fd44d9e0、GIL70995f18…c083a；361 Lua实际读回和本轮ready、hover、实拍通过。renderer P95 2.2ms；预载入口约1.90s，预载成本5.81s单列。冷首屏串联约15.96s、前轮SDK初始化7.02s，不能算无感加载或设备性能达标。独立复审允许基本画质/交互试用；Owner审美、冷启动、官方PC/手机和完整Hosted准入仍待。未合并发布。

本轮复现交付缺口：只读浏览器inventory显示用户使用56706样式候选，未打开独立61030。已与原样式线程协调冻结候选与入口所有权；不修改其脏工作树。修复后将核对实际入口的运行身份和真实截图，而不是要求用户猜版本。

更正协调状态：向原样式线程发送协调消息时被工具active writer锁拒绝，未收到原执行者回复。用户随后确认本轮临时掉盘已恢复，目录和提交均仍在；不归因为清理任务。后续只读冻结已提交的样式输入，组合输出写本任务目录，保留原工作树与服务回退材料。

本轮入口修复：原56706服务在掉盘后已退出；仅恢复本任务服务到原56706/style-d359015e，不触碰49386或样式脏文件。冻结fa7273ec样式归档，组合5个menu子树及5项适配脚本，其余361脚本、UI、模板和serverLogic保持；build=1af131dd-ee8d-4e67-80e6-7a6c1dba2da0，save=44e1c68a…26145。实际原端口无头实拍、自然菜单→选角→祝福→地图→首战通过；高旧sceneRev首次重连完整reset、单人控件与拒绝非法人数不破坏会话通过。证据docs/evidence/menu-red-entry-20261114；最终预载7.59s单列，冷首屏/官方/设备仍未验收，不标Done。

用户明确认为当前版美术、性能、资源占用均不合格，撤回前轮试用通过作为产品质量依据；不将1600图片上限当优化目标。源码/证据仍保留，任务继续In Progress。

本轮重做已按最新预算采用1600绘图图元、1732背景控件（旧3223），背景JSON5.22→3.32MB。native-final GIL688ad0b6…3075，所有inputs/outputs当前匹配；361Lua exact、XYZ独立逆转换零差异。背景复制到fa样式冻结预览，save77874401…551fa/build53629ec8…；其余365Lua与其他UI保持。三对fresh SDK背景堆增量中位5.38→1.97MB、背景构建68.5→53.6ms；整游SDK1951→1935ms区间重叠，不宣称启动显著加速。刷新复现旧active1+parked1、新1+0，GC堆515→313MB；触控画布切换也无未用PC副本。实际1280画布参考误差整体约降37%、面部约降58%，不是审美自动验收。空工作区禁预载导航新3.02s、旧2.73s，不宣称冷加载达标。20次真实揭幕后选角返回复用同一背景、hover与自然首战通过。Review ID menu-quality-native-20261114-03；证据docs/evidence/menu-red-quality-20261114。官方/手机/Owner与完整准入未验，不标Done。

最终补充复审menu-quality-proof-20261114-04覆盖浏览器/刷新/缓存探针；20次返回源稳定、控件31016恒定、背景对象和ID不变，原HP+8/首战/destroy0业务断言全部保留。原56706已切到同save77874401新服务，HTTP当前build53629ec8/active0+parked1读回通过；临时测量服务均结束。AC4按本地候选/独立复审和分开报告范围勾选；AC1/3的Owner与无感冷启动目标仍未通过，不标Done。

Owner在本轮对当前1600图元候选明确反馈“效果不错你可以让它自动合并了”，确认画面并授权自动合入develop；AC1据本轮运行实拍与该确认勾选。继续保留冷启动、官方PC/手机未验边界；正在核对最新develop、精确HEAD独审及Full准入，授权前不标Done。

用户本轮明确要求非常轻量简单；接手续作而非新领。写入范围独立.worktrees/menu-title-finish；不改PR643或其他工作树。

轻量收尾源码与实际模拟器截图已就绪：静态标题杀戮原塔2 / Slay the Heavens，双按钮四态底板，hover80ms/leave60ms；运行时Lua与背景未改，新增30控件。布局/输入8项、悬停Lua及非战斗菜单41断言、模拟器20次返回和自然首战通过。证据docs/evidence/menu-title-finish-20261114；上游PR643仍OPEN/BLOCKED，依赖未落地，按TASK_EXECUTION不提前建PR，保留feat/menu-title-finish后续接续。官方/手机/Full未验，不标Done。
<!-- SECTION:NOTES:END -->

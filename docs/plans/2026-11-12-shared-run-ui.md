# Shared Run UI Implementation Plan

**Goal:** 正式入口以战斗页为唯一共享组件基准，地图、房间、奖励、商店和卡组不能因页面或阶段退回旧皮肤。

**Architecture:** 沿用单一 `ui_theme.json`、CardSkin、RelicView、药水和顶部栏 owner。新增一个仅依赖现有纯布局函数的 JS 合成入口，按明确根类型先校验必需 host，再统一转换顺序，最后核对共享组件；页面只负责数据、排列、可见性与命令，皮肤选择仅依正式 profile。

**Tech Stack:** 现有 Node ESM 布局生成器、Lua view、Fengari 原生控件夹具、现有 Full 测试发现。不得增加 Lua 框架、第二主题、SDK 字段或额外 CI 作业。

## 事实与参照

本轮先后复现了：Map 转换仅挂在另一构建分支、地图背景盖住共用栏、奖励阶段药水退回文字块、长卡文字压缩插画、地图遗物回到旧圆盘/列表、通用素材转换重铺金框。组件本身部分已共享，但正式合成入口不完整，页面阶段仍决定皮肤，原 current UI 断言还锁住旧分叉。修复属于项目架构与可执行合同，不修改全局技能或扩大游戏规则。

已查看 Mega Crit [官方媒体包](https://www.megacrit.com/press-kits/slay-the-spire/)和[官方 Steam 页面](https://store.steampowered.com/app/646570/Slay_the_Spire/)的六张原版图。战斗、事件和商店延续资源/药水/遗物带，商店和卡库沿用卡面外壳，页面改变排列和数据。这里依据可见画面约束本项目的组件关系，不推断其内部代码。原图只保留本地研究，不打包为项目资产。

## 任务 1：固定合成边界

**Files:** 新增 `scripts/official-run-layout.mjs`；修改 `scripts/official-assets-layout.mjs`、`scripts/official-battle-hud.mjs`。

1. 在现有 `tests/official-run-chrome.test.mjs` 加删除 Map/必需根、未知根的负对照；运行确认旧入口没有拒绝遗漏。
2. 用明确的 `SlayTheAbyss`、`AbyssBattle` 与现有六个模板类型校验根。完整 Run 根必须拥有菜单、角色、地图、节点、战斗、卡组、药水与唯一遗物视图；校验在任何转换前完成。
3. 合成入口统一执行非战斗/Neow、Map、Reward、共享顶栏的现有转换。HUD 模块不再拥有 Map 页面转换；通用素材遍历只在合成定型之前执行。
4. 保留既有对象与输入路径，未知根、缺失 host、重复合成均失败；不把坏输入静默当轻量模板。

## 任务 2：让共享成为可执行合同

**Files:** `tests/official-run-chrome.test.mjs`、`scripts/build-ui.mjs` 及新合成模块。

1. 对相同角色/数据检查 Map/Node/Battle 的静态顶栏与字体、无复制输入接收器、背景不盖共用栏。
2. 遍历真实卡面与模板，核对共用 body/ribbon/类型组件；允许宿主的排列、缩放和内容差异，不允许单页另造厚度、材质或长文挤画。
3. 生成完成后再次检查包含运行时牌堆模板的完整集合。故意覆盖单宿主卡框、挪栏到不透明背景之后、重新裸铺共享面板均必须被拒绝。
4. 在原 Full 自动发现的现有文件中运行，不改预算、worker、旧历史收据或原始玩法断言。

## 任务 3：修复真实遗物分叉

独立切片 `fe34f77865c3f66ecf48bfe72844de99c0fcb646` 已使唯一 RelicView 在 official 全 run 使用同一 bar、atlas、hover 与 index→single 入口；无 index/溢出保留同 owner 分页。计数仍读取真实 combat 或 run 数据。复用深岩细边，通用贴图不能覆盖该共享角色。跨 phase 矩阵保留计数、核心图、输入去重和销毁断言。

## 验证与收口

运行 `node --test tests/official-run-chrome.test.mjs tests/official-assets.test.mjs tests/official-assets-legibility.test.mjs`，再做实际 Lua/生命周期和合树真实 GIL 读回的自然地图→遗物→战斗→奖励路径。缺失角色与覆盖对照必须先红后绿。纯 JS 合成模块不得静态引入 parser 或工具链，保留真实零依赖构建入口。

既有 idle-approved-v1 的接回由原角色控制器承接；它是动作/资源生命周期，不是按页面选择第二套 UI。新增来源和测试由主控准确登记后统一刷新当前绑定，不改变任何旧 SHA 或历史集合。最终独审、当前精确 HEAD/BASE Full、正常自动合并和合后验证仍独立执行。

本轮验证：旧入口删除 Map 与未知根负对照均红；统一入口后，整批预检、重复合成、所有实际卡面与两种卡组模板逐一改厚度、地图背景遮挡、遗物裸面板负对照进入同一既有 Full 测试文件。另发现并修复非战斗卡面继承旧费用/类型坐标：所有卡面先由相同主题重建，再共用材质；原 text/hit 对象身份保留。

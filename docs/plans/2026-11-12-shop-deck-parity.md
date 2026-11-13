# 商店与永久卡组修正 Implementation Plan

**Goal:** 修复用户本轮官方截图暴露的卡组复用断层、商人对白构图、离店按钮暗字和商店地图缺失。

**Architecture:** 以已合 PR634 的最终战斗卡面与卡库为唯一只读浏览表现，永久卡组仍使用 run.deck。商人复用既有台词、交易反应和演出控制器，改为货架旁人物及其头上短句气泡。地图复用现有只读预览与一次返回调用页链路；按钮运行时采用当前官方深底皮肤的字色。

**Tech Stack:** 原生 UI 布局生成器、Lua、Node test、Fengari；不新增依赖。

## 已确认设计

- 用户明确要求永久卡组复用已认可战斗卡库；暗场、五列、排序及返回共用，业务投影保持独立。
- 用户通过本轮问答批准：撤掉底部中央头像黑条；商人置货架旁独立位置，气泡在头上并带尾巴，避开商品、价格和购买/取消。
- 深底离店按钮常态、悬停、按下和禁用均有清晰字色，修正运行时覆盖来源。
- 原版固定参考 TopPanel.java 的 SHOP 分支允许直接打开地图；商店补显式顶部入口，关地图一次回原商店。

## 执行切片及所有权

1. 卡组切片：scripts/deck-ui-layout.mjs、src/lua/abyss_deck_ui.lua、tests/official-assets-runtime.test.mjs；先红例，再共用浏览壳，覆盖17张、详情、回收、永久/战斗状态隔离。
2. 商人切片：scripts/cinematic-ui-layout.mjs、src/lua/abyss_merchant.lua、data/presentation/ui_theme.json 的 merchant 段、既有商人布局/生命周期测试；先复现底部黑条，再修改相对人物气泡与显示节奏。交易规则不变。
3. 主线：scripts/official-battle-hud.mjs、src/lua/abyss_game_ui_input.lua、src/lua/abyss_node_ui_feedback.lua、tests/official-run-chrome.test.mjs 及既有地图返回测试；验证直接入口、迟到输入、只读状态与按钮真实重绘。
4. 主线集成：构建 data/UI、相关测试和工程检查，实际同源视觉检查，独立复审。证据放 docs/evidence/shop-deck-parity-20261112/；缺官方导入、ready、PC/手机证据时保持未验。

## 最小验证

- node --test tests/official-run-chrome.test.mjs（基线9/9已通过）。
- node --test tests/official-assets-runtime.test.mjs（使用测试名定向红绿后，最终整文件）。
- npm run build:data && npm run build:ui；既有 merchant、shop_selection、route_preview_return Lua 用例。
- npm run test:related -- --base 903bf2a31 --plan，再按实际影响选择执行；最终 git diff --check 和独立评审。
- 视觉证据须明确为本轮离线或实际候选，不将历史截图、SDK或源码检查代替官方设备验收。

任务记录：TASK-25.4、TASK-4.10，负责人 Furinya。工作树 .worktrees/shop-deck-parity，基线 origin/develop@903bf2a31；不自动提交、推送或创建 PR。

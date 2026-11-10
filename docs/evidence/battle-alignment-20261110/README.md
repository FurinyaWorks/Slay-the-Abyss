# PR #588 战斗页视觉对齐续轮

本轮承接 `5b3e9f11`，继续使用 #582 生命周期与既有 SDK/Simulator 0.5.2。用户明确暂缓主角与怪物造型，只调整战斗页；没有启动原神、官方千星沙箱，没有合并或发布。上一轮证据保留在 `../battle-page-20261110/README.md`，本文件不替换历史结果。

## 实际改动与查看

按私有冻结 V25 战斗稿及原 CSS 测量：顶部栏恢复 43px 高、资源分组、虚线药水槽、居中地点和地图/牌库/设置入口；保留真实牌库张数和 full-source 状态后缀。战斗卡牌使用官方 107192 折叠标题带、107203 费用币，恢复弧形灰标题、白字、三种窗口色、浅灰类型条及可用牌青色外缘。新增装饰均为有限原生控件，未恢复 PNG 数千图元；主角沿用获准的 57 矩形占位、场景沿用 261 静态控件。

结束回合恢复 143×56 六边形、内外框、四态；隐藏旧大按钮残留的金色翼边，保留状态 owner 和监听。抽牌/弃牌保留图标与红色实时数字，新增清晰可见的文字；点击区域同时覆盖文字和图标，与结束回合横向相隔 19.5px。

本机服务 4174 已预载两个独立入口，刷新重新开始，不重置旧 `battle-final` 会话：

- 五牌：<http://127.0.0.1:4174/editor/play#battle-aligned>
- 十牌：<http://127.0.0.1:4174/editor/play#battle-aligned-ten>

均为显式标注的离线直达战斗夹具，支持真实拖牌、点选目标、取消、回合及牌堆浏览。没有改核心规则、牌值、能量或 RNG 算法。夹具仅注入现有 GameUI 创建入口、固定 seed42、合法 Small Slimes 双敌，十牌调用真实 Combat.draw；因此 GameUI Lua 与 GIL 原文有明确差异，不能冒充官方自然开局。

## 同候选身份与真实画面

- buildId `af3d84eb-b916-4f45-aeb0-da1f2f34b6ea`；构建基于 HEAD `5b3e9f11a25211173a3710d570ca8e4c22664d25`、`sourceDirty:true`。
- GIL：`build/pr588-battle-aligned-final/af3d84eb-b916-4f45-aeb0-da1f2f34b6ea/candidate.gil`；SHA256 `c85abbe09e71f154b436bcb0593629158d8a5890b4794239d48ca4b9d9159126`，13693914 字节。其收据记录源文件哈希，不冒充提交后重建；文件大小不是官方容量。
- 本机证据根 `.artifacts/battle-align-20261110/`；最终 save/截图位于 `final-preview/`。实际 GIL 读回 12404 节点、359 Lua 模块，逆向核查 0 faults。
- `pr588.actual.save.json` SHA256 `6926dcdfe2886fadfacb772c0b3229a1c2329d768b9f0d5f62f62d02ecf091a8`；此文件保留实际 GIL Lua 原文，五/十牌派生夹具另有输入与注入模块收据。
- `whole-five.png`、`whole-ten.png` 为最终完整战斗画面；`card-hover.png`、`end-turn-hover.png`、`end-turn-pressed.png`、`turn-feedback.png`、`next-turn.png`、`ten-after-play-turn.png` 为浏览器实际交互画面。
- `discard-open.png`：实际拖出防御，能量 3→2、护甲 +5，点击“弃牌堆”文字后显示 1 张，且正是该防御卡。第一次拖动未命中产生的空弃牌截图已被后续成功画面替换，没有计入成功出牌。
- `route-open.png`：顶部地图入口真实进入既有路线预览，返回按钮为“返回战斗”；返回同局。运行时另验证强制选择出现时拒绝旧指针事务。

截图来自无头 Chromium 软件 WebGL、真实 SDK 投影。复用既有 approved-v25-native-web，它仅移除 Simulator 通用蓝色样例按钮背景；未替换脚本命中和状态逻辑。私有批准稿、第三方运行库和二进制不提交仓库。

## 实测性能与未通过项

`final-five.json` / `final-ten.json` 是顺序运行的原始 SDK 报告，前后输入哈希稳定、faults=0。CPU update 耗时不能换算官方 FPS。

| 同候选场景 | 五牌 | 十牌 |
|---|---:|---:|
| SDK 冷初始化 | 2013 ms | 2009 ms |
| 稳态 120 updates P95 | 12.43 ms | 12.99 ms |
| 实际连续出牌 | 3 次 | 3 次 |
| 连续出牌 update P95 | 32.86 ms | 48.60 ms |
| 连续出牌 update 最大 | 85.56 ms | 126.29 ms |
| 20 次牌库开关后活控件 | 12380，稳定 | 12380，稳定 |
| 20 次地图预览往返后活控件 | 12380，稳定 | 12380，稳定 |
| 根销毁后句柄 | 0 | 0 |

另有真实弃牌 UID 集合与浏览器列表一致、实际结束回合断言。控件总数包含其他隐藏页面，不是战斗页 PNG 图元数；地图预览往返不等于创建 20 个新战斗；句柄归零不等于 GPU/系统内存已证实释放。

最终浏览器有效异步计时为 `final-preview/browser-samples-async.json`：十牌拖牌与回合操作窗口 9.38 秒，86 次 applyScene 完成计时，P50 5.2ms、P95 11.7ms、最大 203.2ms。applyScene 内部包含 app.render；该路径未调用 renderer.render，不伪称测得后者。此前两个同步包裹的 browser-samples 文件仅测到了 Promise 提前返回，属于无效绘制计时，明确不计入结果。

性能定位的 `ten.cpuprofile` / `profile-ten.log` 主要热点为 Fengari 指令执行、Lua 调用栈整理和 SDK 控件桥接，GC 占 CPU 采样约 5%；记录到 554 次 Scavenge 及 3 次 Mark-Compact，其中一次同步暂停 32.78ms。诊断轮起始曾与自建预览重叠，不能替换上表的独立测量，也不能将 GC 单独认定为所有长帧的唯一根因。浏览器 203.2ms 尖峰尚未精确归因；没有为了掩盖它改 SDK、降画质或提高预算。

**因此仍不能判定“完全不卡顿”。** 本轮四处被指出的布局与可发现性问题已实际修正并交付试玩，但原生字体/纸面纹理和软边仍有原稿差异，未声称像素级一致或用户认可。主角/怪物造型按用户要求暂缓。本页需要继续以实际体验决定视觉接受程度，长耗时仍是性能验收未完成项。

## 检查与边界

- 最终相关既有 22 项通过；最后牌堆点击范围增量另跑现有配置 6 项通过。真实运行时 2 项覆盖合法目标高亮、强制选择事务和地图返回文案恢复。
- check:engineering 通过：344 模块、5879 测量、无新增 Luacheck 诊断，原有复杂度门槛未放宽，4 个关键变异被捕获、原生 UI 生命周期 6/6。
- 日常 check:platform-load 通过；它检查默认生产 manifest，不是本候选官方容量。
- check:syntax 与 git diff --check 通过。
- 独立 battle_review 复核无未解决 P1/P2；最终 12 文件摘要 `c4e9842ae2b63b38a98a0a6b7abbd247336719cb61223e76bd53d915380c77c4`；末次只读复核确认两牌堆完整覆盖 caption 且与结束回合无重叠。
- 官方导入、新 ready、官方 PC/手机帧时、GPU/系统内存、官方容量均 NOT RUN / UNVERIFIED。无有效录像；完整 npm run check 与本轮远端 Full 不在本记录中冒称通过。
- TASK-103 保持 In Progress、PR #588 保持 Draft；不合并、不发布、不扩展其他页面。

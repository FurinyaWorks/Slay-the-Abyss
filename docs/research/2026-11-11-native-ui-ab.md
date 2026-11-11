# 千星原生 UI：差分更新与 Tween 小范围 A/B（交 Codex 执行）

> 2026-11-11 Owner 批准的**隔离实验提案**，不是性能修复完成、Backlog 认领或合并许可。目标是尽快得到 **GO / NO-GO**，不引入第二套 UI 框架。

## 为什么还值得测

现有实现已具备原生组件、按页隐藏准备/缓存、手牌几何同值去重和部分静态 setter 去重。历史证据包括 [TASK-4.21](../backlog-details/TASK-4.21.md)、[TASK-100.1](../backlog-details/TASK-100.1.md)、[TASK-104](../backlog-details/TASK-104-PRODUCT-OUTCOME-LOOP-20261109.md) 和 [#582](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/582)。[#553](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/553) 已实证**原生 Tween 能完成局部动画**，无需重复做可行性入门；[#588](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/588) 已做官方素材完整两幕**离线**候选，不能把未验证的实机 FPS 当成通过。先查当前 `develop`、上述历史成果和现有 Backlog/在途 PR，不复制旧任务。

外部参考（**只读机制，不直接整框架迁入**）：
- [genshin-ugc-webui 的控件池/差分渲染](https://github.com/zmy15/genshin-ugc-webui/blob/main/lib/webui/webui_render.lua)；[真机复用复盘](https://github.com/zmy15/genshin-ugc-webui/blob/main/docs/%E7%9C%9F%E6%9C%BA%E5%A4%8D%E7%94%A8%E9%97%AE%E9%A2%98%E5%A4%8D%E7%9B%98.md)（原生 userdata 不允许任写字段、控件不可任意 reparent，mock 不能假装可行）。
- [8itlab Pairs 的原生 TweenSequence 示例](https://github.com/8itlab/genshin-miliastra-mcp/blob/main/examples/pairs/pr_game.lua)（`game.TweenSequence()`、`game.Tween(...)`）；仅参考动画实现，不复用它的游戏/美术。

## A / B 1：剩余高频原生写入是否还能实质降本（优先）

1. **先定位再改**。复用现有实际 GIL / SDK 计数与 `replay:outcome` 工具，找到战斗页一处**未被现有缓存覆盖**的高频 setter/创建热点。不要重复改 `abyss_battle_card_view.lua` 已有的 `sameHandValues`，也不要根据全局计数猜热点。
2. 同一源码基线、视觉资源、十手牌/双敌、种子、输入序列与平台，A 保持现状；B **只对该热点**尝试差分提交或受控复用。比较原生读取/写入/创建/销毁、最长同步阻塞、P50/P95、页面完整可见和操作响应。报告冷热路径，SDK 与设备指标分开。
3. 保持完全等价的画面与规则，覆盖输入命中、拖动/取消、目标失效、页面重入/销毁、`false/throw` setter、迟到回调和至少 20 次往返。无可证实热点、收益不明显或复杂度/回归成本不划算，则 **NO-GO 并停止**，不做泛化 DOM 引擎。

## A / B 2：原生 Tween 能否替代一个 Lua 逐帧动画热点

1. 仅选战斗中一个**固定起终点、固定时长**的非手指跟随动画（如出牌后卡牌归位/命中反馈）；不把实时拖牌手势强行改成 Tween。A 是当前 Lua 插值，B 是原生 Tween/Sequence；视觉轨迹、时长、输入及结果尽可能等价。
2. 用现有 #553 实验证据避开已踩过的 API 误用。验证动画实际完成、打断/取消/重复触发/切页/销毁时安全，保持手牌点击、费用、伤害、随机数和结算一致。
3. 比较 Lua 每帧工作量、原生调用、主线程长阻塞、操作响应和真实视觉顺畅度。只有**画面与行为等价且有实测收益**才建议进入生产；无收益即保留原实现。

## 可选：优秀 GIL 样本只读拆解（不阻塞以上实验）

只有拿到作者合法分享且可研究的 `.gil/.gia` 后，才用已有 MCP/解析器及 [miliastra-ugc](https://github.com/QHY8IV/miliastra-ugc) 交叉核对 UI 树、官方控件、节点图与 Lua；提取**可验证的技术差异**和出处。不要新建通用反编译器、假定旧节点图能无损转 Lua、复制未授权美术或将公开奇域 ID 当作工程文件。

## 交付 / 边界

- Codex 接手前按 `AGENTS.md` 用 **Backlog CLI 查重/认领或在既有任务下承接**；此研究文档不代替任务状态，不手改 `backlog/tasks`。保持独立 worktree 与现有审查、CI 和合并门禁。
- 交**一份简短 A/B 表**：同源身份（commit、GIL、资源/配置、种子）、A/B 原始证据及不利结果、截图/实际输入、GO/NO-GO 与原因；已有工具不足只补必要小探针，不再造第二套测量框架。
- 离线 SDK / 模拟器只能证明离线结论；**官方导入、ready、PC/手机 FPS、容量及视觉验收**没拿到就写 `UNVERIFIED`。真实游戏键鼠/焦点需本轮单独授权，不在此 PR 自动启动。
- 不改玩法 Core/Run/Combat、官方素材路线、V25 保留资产、默认皮肤、CI 阈值或历史收据；不安装/整合 WebUI、MiliUI，不直接发布、不碰 `master`。

# PR #613 / TASK-100.2：两项局部 NO-GO

当前 develop 的生产 Lua、玩法、美术及默认开关均未修改。两项方案在否定条件出现后 **EARLY_STOPPED**；这些脚本是实验样品，不是待接入框架。

| 单变量 | 同源实际 SDK 结果 | 决定 |
| --- | --- | --- |
| 敌人名称 `SetVisible` 改为读取当前 `visible` 后跳过同值写入 | 十手牌/双敌暖态600帧，双敌合计1200次写变成1200次读，净桥请求不降 | NO-GO：没有已证实收益，不推广缓存 |
| 出牌后消散缩放改 `game.Tween(...):SetEase(Enum.EaseType.OutQuad)` | 同一 `T.fast` 与数学曲线，但可见消散滞后1个SDK步；对应样本A=.370756、B=.5；A隐藏时scale=0，B仍=.0003858 | NO-GO：画面轨迹/端点不等价，不调整调度器 |

原始记录、强配对校验与机器摘要在 [本轮证据](../../docs/evidence/native-ui-ab-20261111/README.md)。Owner本轮确认没有可用原神、手机暂不可测：官方导入、ready、PC/手机帧时、流畅度、输入延迟、容量及视觉验收全部 **UNVERIFIED**。

## 取样和边界

- A来自当前源码基线的实际V25 GIL；B分别在其存档副本中只替换 `abyss_battle_render_actors` 或 `abyss_feedback`。相同360份模块、原生树、素材、配置、挂载参数、SDK/Node、seed17和指针序列。双蕈兽/十手牌由生产 `Combat.new/draw` 显式组装，是压力夹具，不冒充自然抽牌。
- 复用 TASK-100.1 的 actual-GIL adapter、SDK计数worker和既有自然前置/取消/出牌/敌回合路线。`variants.mjs` 仅生成两处局部介入；没有安装 WebUI、MiliUI 或新调度/渲染框架。
- `run.mjs` 冻结原始计数worker字节。原始 `SDK_TRUE_V25_NATIVE_CONTROL_COUNT_PASS` 只表示该SDK路线/清理无fault，不表示A/B等价或产品验收。`created/destroyed` 是SDK模型注册/删除数，不是官方容量或Lua控件创建API调用数。
- 计数是 **Lua→Control桥请求**，方法路径按名称聚合，两个同名怪物共用一条路径；初始化session尚未赋值时方法路径为空。`returned`只表示未抛出，不等于setter接受。原生Tween内部写模型、`game.Tween`及Tween生命周期API没有计入，因此不宣称总原生调用减少。
- 三份回放为单次顺序A→差分→Tween；观察器包含额外Id查询且没有校准。画面准备受墙钟预算影响，准备步数/绝对idle相位不同。SDK暖态P50/P95：A 8.692/11.708ms、差分14.600/21.344ms，仅REPORT_ONLY，不推断B造成变慢或设备FPS。完整画面hash不同，不声称全画面逐帧等价。
- 已测实际SDK指针取消、合法防御出牌、敌回合、动画结束后的根销毁，三份最终Core结果一致、根关闭后模型为0。Fengari小探针覆盖差分false/throw/重试/外部写入/下一update重入协调，以及实际Feedback模块的cancel/disable与Kill(false)。后者模拟Tween句柄，只验证生命周期调用，不证明原生插值。
- 600空step不是20次往返；name探针的20次属性重写也不是页面往返。**20次真实页面往返、目标失效、迟到回调注入、动画中途engine销毁及重复/顺序平衡性能样本均NOT_RUN，因NO-GO早停。** 原引擎销毁入口没有调用feedback.cancel，不能从播放结束后的root-close宣称Tween中途销毁安全。样品不使用完成回调，也未证明任意迟到引擎写入安全。

## 复现

先按 `docs/TOOLCHAIN.md` 和千星技能读取MCP资源，只处理存档副本，`MILIASTRA_ALLOW_LIVE_WRITE=0`。需要既有合法V25私有输入与已固定身份的SDK0.5.2导出；不要下载第二套框架。缺输入则记录不可复现，不降质替代。

1. 复用 `buildNativeCandidateFromToolchain` 构建A，保留基线构建收据；复用现有actual-GIL adapter生成 `adapter-receipt.json`、`scripts-exact.json` 和save。
2. 对A中目标模块应用 `intervene(source,'diff'|'tween')`，用现有 `writeScriptBatch` 在副本生成B，再用同一adapter投影。B实验描述记录来源A收据和真实模块/GIL摘要；A的buildId/payloadDigest只能标来源，不能充当B重建身份。
3. 对三份投影各用新Node进程：`node experiments/native-ui-ab/run.mjs <adapter-receipt.json> <固定SDK导出.mjs> <新输出目录>`。必须保持worker源码不变，原始报告保留worker hash。该重放较重，不加入普通CI。
4. 私有目录布局为 `projected/`、`diff/projected/`、`tween/projected/`，报告为 `paired-{A,diff,tween}/report.json`。运行 `node experiments/native-ui-ab/verify.mjs <私有目录> <MCP根> <新摘要.json>`。它重新读取真实GIL section50、完整脚本/挂载、save非介入字段、实际hash和最终Core结果；仅规范化adapter准确生成的描述名称及两个来源路径，不剥离行为字段。
5. 测试先生成原有data/UI。差分探针用 `LUA_PATH=<diff模块目录>/?.lua;./build/lua/?.lua;./src/lua/?.lua;;` 运行现有Fengari CLI的 `-e "dofile('experiments/native-ui-ab/name-boundaries.lua')"`。Tween探针从 `.artifacts/native-ui-ab/tween/abyss_feedback.lua` 装载实验模块，同样运行 `tween-boundaries.lua`。这些是离线边界样品。

社区机制参考：[WebUI控件池/差分](https://github.com/zmy15/genshin-ugc-webui/blob/main/lib/webui/webui_render.lua)、[Pairs TweenSequence](https://github.com/8itlab/genshin-miliastra-mcp/blob/main/examples/pairs/pr_game.lua)。只参考机制，未复制其框架/游戏/美术。OutQuad和Kill(false)语义同时核对已有MCP离线官方指南 `knowledge/official/guide/mhtakr07vej4.md`；#553原生完成证据仅用于避免重复入门，不当成本轮实机证据。

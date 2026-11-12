# 战斗真实输入性能续轮（未验收）

范围仅 #588 战斗页面；不启动原神、不操作用户桌面，不合并或发布。用户十手牌实际操作反馈严重延迟，因此闲置 SDK step 和空白区域 pointer 不再作为出牌流畅性的替代证据。

## 已定位的问题

旧候选 `56092de6` 的实际 SDK `vi` 输入边界测量（计时不含几何、状态查询或 step）：移入卡牌 P50/P95 72.20/159.00ms，首次拖向敌人 243.63/498.38ms，换敌 199.76/329.86ms。诊断 observer 中一次 Strike handler 306.18ms，额外未来 HP 预测占 210.08ms，其中 `Combat.copy` 110.88ms、隔离 `Combat.play` 98.09ms；十张卡的 `Combat.cardPreview` 合计 4.79ms。Observer 仅用于归因，与主计时分组，父子时间不能相加。

原始私有证据：`.artifacts/battle-feedback-20261110/native-tween-probe/on-card-hotspots.md` 及其中三份有效报告。失败的混合旧主题探针保留为 FAILED，不计入改善结果。

固定原版 ZIP 的 `AbstractCreature.java:545–555,836–941` 只绘制当前 HP、真实变更后的追赶条及独立已有毒伤段；`AbstractPlayer.java:1761–1764,1786–1865` 更新牌面伤害、瞄准箭头和目标角标，没有整场出牌后的敌 HP 预演。精确片段及 ZIP/Java SHA：`.artifacts/performance-blocker/vanilla-target-health-source.json`。

## 本轮修复与证据边界

`fd868b33` 仅在 official-assets-first 模式停止 `DamageView.preview/potionPreview` 全场模拟；默认模式保留。动态卡面公式、命令校验、真实伤害、箭头不变。群攻角标独立读取卡牌的 `ALL_ENEMY` 目标类型，不再依赖预测伤害；自身卡不点亮敌人。

新定向整页合同实际验证：双敌横扫瞄准时 16 个角标可见、双方 HP 不变、无未来 HP 预测；释放后双方各受 8 点伤害。防御无敌人角标，释放后格挡 +5；火药水释放实际扣 20 HP。两种额外模拟函数均设为抛错负控。原默认测试未修改。

中间候选 `a0308bec-d8ca-4514-ab02-bf0db0c79cf6` 实际 GIL SHA `f41fc6ac56bda12119fbebdc16dfec0ca35fe106aa73ac71495a40de660f6753`，实际读回 save SHA `33274d66561c1dc74dba94c0ea896948ddb6e4f0a4448f7367fdc4009539d3db`，14,052 节点、360 Lua、inverse faults 0。该候选尚不含后补群攻角标修复，不能称最终候选。

该中间候选十牌派生夹具的动态数字九阶段通过：力量4/虚弱1显示7 → 易伤目标显示11 → 取消恢复7且规则状态不变；目标格挡5时实际 HP−6、block归零、energy−1；敏捷3/脆弱1防御显示并实际获得6。原始报告 `.artifacts/battle-feedback-20261110/input-performance/dynamic-numbers-ten.json`。首次误用已预置状态的 status 夹具触发 setup 断言，报告保留为 FAILED，修正输入为无状态 ten 后重跑，未放宽断言。

### 中间候选真实十牌输入

无 observer、无源注入，十个卡中心试次，严格只计 `vi`。报告 `.artifacts/battle-feedback-20261110/input-performance/on-card-unobserved-a0308bec.json`，PASSED：

| 输入 | P50 ms | P95 ms |
| --- | ---: | ---: |
| 移入卡牌 | 50.02 | 61.84 |
| 按下 | 1.40 | 2.32 |
| 首次拖向敌人 | 67.77 | 107.17 |
| 切换敌人 | 44.44 | 77.05 |
| 回手取消 | 51.04 | 56.24 |

自动 tooltip 停留后首 Down 1.124ms，held UID/槽位正确、swallow=false、资源未变。与旧结果相比大头下降，但仍不能判流畅；此表不是浏览器端到端延迟，也不是设备 FPS。悬停整页重复渲染的优化继续验证。

## 最后候选与直接试玩（2026-11-11）

最后候选 **d98e6ca3-4d71-4c2d-89d7-379f70ba50de**：

- source `0df2a12e412e90951d00840a4c8e7bfe63214f25`；sourceDirty=true 如实保留，生成与内嵌模块逐份核对。
- GIL SHA256 `07de7847a1848ee8afe6896a6b2bc047c525b6fcf5331c7c984a1bd5972de776`。
- 实际读回 save SHA256 `73de931ab43e797144cbfd16165bbf3083f38610f8b7d5ac5a68cad318386ebd`。
- 14,052 converted controls / 360 Lua；inverse 比对 14,051 个非根节点，faults=0。不是官方容量读数。
- build：`build/pr588-battle-card-coverage-final/d98e6ca3-4d71-4c2d-89d7-379f70ba50de/candidate.json`。
- readback、SDK 和 browser 原始数据：`.artifacts/battle-feedback-20261110/coverage-final/`。

本机独立预览已预载四份存档，不触碰旧 4178 用户会话。**预载不等于冷启动合格**，runtime 没有提前后台暖机：

| 试玩 | 本机 URL |
| --- | --- |
| 十牌、双敌、三药水与三遗物；Offering 可实际打开消耗堆 | http://127.0.0.1:64326/editor/play#battle-performance-ten |
| 实际稀有度×类型十格 | http://127.0.0.1:64326/editor/play#battle-card-rarities |
| 升级、X费、动态费用、消耗、诅咒 | http://127.0.0.1:64326/editor/play#battle-card-special |
| 四种战斗生成状态牌及特殊诅咒 | http://127.0.0.1:64326/editor/play#battle-card-status |

这是离线 SDK 压力夹具，通过现有 Run 获取/升级与 Combat 抽牌/生成 API 准备场景，不是自然流程或官方存档导入。定义、规则、HP 和能量参数未改。实际运行已核对；预载身份收据为 `coverage-final/playable-receipt.json`。

Web 服务使用**明确标记的私有 SDK renderer/driver 适配**：仅普通 sprite 颜色更新复用及有界请求/绘制流水；不改 Lua、规则、资源 ID 或手动时钟。不把该工具当官方原生运行环境。实际两个 HTTP renderer 路由 SHA 均为 `9eb4e51fe9a01219f15eb5507bd8791a7f93cf1178a53dade4dc0af695491e82`；工具补丁与身份位于 `.artifacts/performance-blocker/`，未写入用户 SDK 缓存或冒充正式包更新。

## 最后候选整页结果

`coverage-final/ten-whole-page.json` 使用实际 d98 GIL 派生十牌，0 faults/sourceStable：

| 测量边界 | 结果 |
| --- | --- |
| SDK 初始化（不含浏览器资源/HTTP） | 1,984.84ms |
| 十牌双敌稳态，120 次 SDK step | P50 5.61 / P95 8.54ms |
| 全部 893 次 step | P95 13.20 / max 88.91ms |
| 三次**真正提交命令的 Up**，不含此前选牌 tap | **143.51 / 135.94 / 132.44ms** |
| 结束回合的 Up | **148.03ms** |
| 20 次弃牌堆、20 次牌库、20 次路由预览往返 | warm 后 controls 稳定 13,782，真实手牌/能量守恒 |
| 引擎根清理 | controls=0 |

同一d98额外短资源探针 `coverage-final/native-tween-cleanup.json`：ready360 Tweens/0 Sequences；全牌组模态与路线打开归零，返回恢复360；真实root销毁后T/S/controls全0，再推进120帧仍全0、原360句柄均dead。它不替代上述真实弃牌grid20次测试，两种边界分别保留。

不能从 step 数据推出 60FPS 或“没有出牌延迟”。整个 `vi` 计时单列于每个 stage 的 `pointerEvents`，此前旧报告只测 step 的局限已纠正，未删除旧记录。

7b64 同逻辑候选的十中心无插桩输入组：hover P50/P95=1.12/31.58ms，首次瞄准10.20/17.06ms，换敌9.72/18.57ms，取消28.69/71.10ms；首次 hover 长样本保留。d98 相对 7b 的358份 Lua完全相同，仅 `abyss_theme` 诅咒标题颜色与 `abyss_ui` 构建元数据不同；该10样本组仍保留7b身份，不冒称d98重采。d98整页、实际指针命令和数字九阶段另行实测。

最终数字九阶段 `coverage-final/dynamic-numbers.json` 全通过：7→11→取消7、格挡5后实际HP−6、Defend显示/实际6，sourceStable、0 faults。

独立 observer 诊断使用7b同代码的三个真实命令（`final-command-attribution/report-r2.json`）：`snapshot.capture` 约98–109ms；实际 Core.play 约3.8–4.4ms；前置 render、feedback 内 render、后续 refresh 合计约92–130ms。插桩且有并行负载，**不能替代 d98 的原始延迟**；只说明剩余热点是完整事务快照及多次 UI 刷新，而不是规则求解。前置 presentation 失败保护与完整回滚合同保留，未删除保护、缩减快照图或改核心架构来造快数据。

## 真实画面与卡牌覆盖

稀有度/类型 matrix 覆盖 RED75 中实际存在的 **10/10** 个基础/普通/罕见/稀有×攻击/技能/能力组合；基础能力、普通能力不存在，明确 N/A。机制组覆盖真实升级标记/费用/标题、X、动态费用、长文与消耗；第三组用 `Combat.applyEffects(makeTempCardInDraw)` 及 `draw` 生成 Wound/Dazed/Burn/Slimed，另核特殊诅咒，不伪称它们属于 RED75 奖励池。

三组都是实际十牌，逐槽核 UID、定义、稀有度、类型、可用性、hover→首 Down→拖取消；真实 Impervious 消耗/+30格挡/−2能量、Slime消耗/−1能量、Whirlwind对两敌各5×3伤害及能量归零均通过。**没有声称75张及每张升级效果全部实打覆盖**，已有核心规则回归沿用，不重新发明规则。

覆盖发现并修复：状态/诅咒误用红体与攻击窗→现有图层静态换灰/黑技能卡体，0新增图元；高光 alpha 保留128/77/115；材质 setter 失败后可重试；切回普通卡恢复红体。固定原版源码确认 CURSE 使用 common banner，Regret 最后修为灰标题条。

7b 的33张完整整页/逐槽图与来源保留在 `.artifacts/battle-card-coverage-7b64ccf3/coverage-summary.json`；最后 d98 三组 SDK 重跑通过，并拍7张实际差异图，索引 `.artifacts/battle-card-coverage-d98e6ca3/coverage-delta-summary.json`。360 Lua导出读回、实际 HTTP bundle SHA、当前 build ready、逐slot/tooltip标题及输入文件哈希均核对。人工已看灰/黑卡体、Regret common banner、X与升级图；visualAccepted仍false，未把自动截图当艺术验收。

`coverage-final/browser-hud/` 是最后候选独立无头浏览器**真实操作**：三药水准确打开对应说明、三枚不同官方遗物图标与单件详情、Offering HP80→74/能量3→5/消耗堆1张、Defend实际进入弃牌堆、抽牌堆查看，已逐图核查。没有用固定旧坐标猜牌；点位来自相同实际HUD的 SDK 几何并按 canvas 变换。

同服务 `coverage-final/web-preview/visual.json`：完整 HTTP 响应间隔219样本，P50 27.24 / P95 41.13 / max55.90ms，手动时钟、无头GPU、私有适配，**不是官方设备FPS**。该次archive载入12.54秒、首次ready合计21.99秒；HUD另一独立加载8.93秒/合计16.87秒，均未达快速冷启动。旧HUD采样错误只过滤get导致0样本已保留，未将它当性能通过。

## 检查与未通过项

冻结生产的官方整页合同13/13、来源22/22、工程345模块/5930测量无新告警、native contract6/6、默认药水拖牌回归通过；独审修复P2后无剩余代码P1/P2。工程初次Node22并行运行两项 mutation baseline 超时保留；已校验Node24在工作树临时目录按原时限重测四项均 killed_by_assertion，系统Temp EPERM首次尝试亦保留，没有放宽门槛。最后诅咒颜色另补现有中性卡合同通过。

`test:related --plan` 因 Backlog 与既有未跟踪输入返回 full fallback；没有把定向结果写成完整 `npm run check` 通过。交付前通过 GitHub 连接器读回 #588 为 **closed、merged=false、draft=true**（closed_at 2026-11-10T14:26:38Z）；保留当前关闭状态，不擅自重开。既有 merge `1a733d8` 的线性历史CI门禁未修，未重写历史、合并或发布。

**当前结论：不通过“既原版质感又完全流畅”的验收。** 拖牌大幅改善，整页功能与清理有实际证据，但真正提交仍约132–148ms，Web冷加载仍慢。原生卡壳/费用球仍是官方素材近似，Slimed的colorless费用材质、手绘细节及加色光晕未等同原版；当前普通UI图像入口未找到原版PNG直用及同等加色混合路径，不退回数千图元重建。没有本轮官方导入、新ready或PC/手机设备实测；本轮不启动原神、不扩其他页，TASK-103保持In Progress。

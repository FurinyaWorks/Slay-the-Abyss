# 魈窗口与防守兑现批次：x27 / x28 / x37

基线 `f43498f6c78506d40c5dc6f34a688021d9a3428b`。本轮 Backlog CLI 不可用（`command not found`），不宣称修改任务状态。仅隔离研究域与真实 Lua paid/Run 集成，HOLD、正式角色菜单与原四域不变。

权威 `character-xiao-nov13` commit `880942f5`：cards.json SHA256 `1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa`；model.mjs SHA256 `57aab330cd2c2dff06cdcd8087ccfffa5668495cef39b2d3c3c2ed513d932783`（完整以本轮下列验证记录为准）。卡面按 source `cardText` 渲染格式，不自拟机制。

- x27：1费非消耗技能，先实时将面具减1到最低0，再独立原生block7/10。正→0移除面具owner schedule，不重新入场、不触发/重置遗物；剩余2/3仅缩短。源退出被动 exitGuard/exitDraw 尚未付费接入，本域 canUse 与执行均拒绝非零值，原子回滚，不静默漏算。**不能声称x27已覆盖未上线退出能力组合**；未来能力批应统一出口hook。
- x28：2费非消耗攻击，实时mask恰1时基值10/14加10/12，任何正mask再+4，然后宿主strength/weak/vulnerable、格挡与反应。
- x37：1费非消耗攻击，实时block×1封顶14/20，再加mask+4再交宿主；不移除原格挡。cap不限制外部Strength与面具加成。
- 三牌真实consume、limbo、pending UID/playId/step及完整payload绑定；无自定义结算绕过原生终局清队列。资源读取在原生阶段，不沿用预检快照。

新 `xiao-reviewed-nonbasic-twentythree-v1` 来源为原20+本3；5 common /15 uncommon /3 rare，保源rarity。有限同稀有度不放回抽样，耗尽跳slot、不重掷。旧20及所有更早域完全不扩容。源卡面、两面、费用、HOLD markers漂移拒绝。

验证命令（唯一串行 Node/Fengari 窗口）：
`NODE_OPTIONS=--max-old-space-size=256 node --test experiments/characters/lifecycle/xiao-next.test.mjs`

证据边界：受控真实Lua paid/Run交易与永久UID；样本测试有999伤胜利、手牌放置与能量夹具，不是自然通关、不代表官方导入、CI、设备或产品放行。完整评审/CI由父任务负责。作者不推远端。

作者初始两次 paid 检查在末尾 FNP 夹具失败：`missing exhaust power order`；仅 `Actors.applyPower` 不自动注册消耗监听顺序。第三次改用既有 Corruption prepare/apply 与 Exhaust.rememberPower，未改宿主、未减断言。静态检查同时修复新catalog生成器漏空格导致的 `dend` 拼接，未以通过证据覆盖此修复前版本。

第三轮 paid 与 source reward 均 PASS，但普通战 seed42..100 未覆盖全部三新ID，最终联合覆盖断言失败（未打印具体缺失ID，不能据稀有度断言缺的就是x28）（整suite189.92s）。随后仅补跑 resource-run 与未执行的 Run rollback：每3个种子使用受控 boss tier 取得真实稀有奖励，其余普通战；不改采样器、不删覆盖断言。不能将此受控稀有度测试称自然通关。
分层样本上限固定 seed42..100（最多59），仅 seed%3==0 为 boss；三新ID均命中且至少12次才早停，未命中如实保留缺口，不追加种子。

补跑完成：`XIAO_NEXT_GENERATED_REWARD_RUN_PASS 44 actual sampled claim/UID/paid; 22 observed IDs`，3新牌均覆盖；settlement/claim/skip/RNG/domain/bossRareShort PASS。`XIAO_NEXT_RUN_ROLLBACK_PASS 8 base/up permanent UID whole graph rollback retry`。新paid PASS72 faces/mask/block、27源漂移、21stage变异/重复回滚；new source reward全部 PASS。此为分段有证据通过，不声称第三轮整suite绿色。

`model.cardText` 动态加载逐一核对新source内6个基础/升级文本，`XIAO_NEXT_SOURCE_TEXT_PASS 6 exact model.cardText faces`。
旧20奖励域单域回归（原 xiao-mixed-reward-source.test.lua）exit0：factory/finite/drift/closed/old domain/cap 均PASS。未重复旧全套paid或工程全量。

# 钟离：护盾保留与即时兑现（候选 0.1）

2026-11-13。负责人 Furinya；本轮用户指定生产钟离技能。独立实验，不接入正式职业、冻结 V4、Lua 加载器或比赛范围。

## 阶段与合同

- 基线 develop `903bf2a`；规范读取 #635 `c53e3511dcc4af631f541f71e21afc66797c4dd2` 的 PRODUCTION/NAMING/SOURCE_PRIORITY/BALANCE/RAIDEN/MIGRATION 六文。规范尚未合并。
- 本切片是 **G0/G2 机制研究与 G4 局部正确性证据**，不是绕过 G1 的产品放行。G0 人物/环境合同待确认；G1 官方资料不齐；G3 六卡只是实验槽位；G5–G9 未通过。
- Backlog CLI 本机不存在，已尝试 `backlog instructions overview`；未伪造认领或手改任务。并行规则审查员查询开放 PR 无钟离生产线，本地未检出同名任务，不保证未推送分支。
- 核心取舍：留住跨回合防线抵御下轮，还是消耗其中一部分抢先击杀。只增加一种资源 `jade`（暂称玉璋），不引入元素反应、队友、愿力或额外倒计时。
- 人物假设：往生堂客卿身份，沉稳可靠；避免未核剧情阶段断言、债务梗和新写“官方台词”。禁止偷渡治疗、免费回能或无代价循环。所有玩家名保留唯一待命名 ID，不冒充已核官方名。

## 单一母表与结算

`model.mjs` 的 `cards` 同时驱动执行和卡文；费用、稀有度和初始数值全部是候选，不改任何旧批准数值。基础/升级分别定义；实例绑定卡 ID 和升级状态，不允许请求把基础牌变成升级牌。

测试环境：60 HP、3 能量、单敌40 HP、六个演示实例，一次出牌消费一个实例。该手牌是理想机制实验，不是承诺初始牌组。无抽牌/随机/奖励/商店/恢复/遗物/洗牌/力量/虚弱/易伤/反伤/群怪/动作惩罚；这些全部未实现，不能推导自然成型率或胜率。未制作图像/音频或引用授权不明素材。

合法性→核对实例身份与升级→目标与战斗状态→核费用/玉璋→支付→有序效果→死亡→弃牌。取消/失败返回原对象，零支出。玉璋按强度相加，上限20，超量丢弃，不赠补偿；可跨回合，不跨战斗。入伤逐段按格挡→玉璋→生命扣除；敌人行动后清掉残余格挡，玉璋不清；玩家死亡停止剩余段。击杀敌人后敌人不再行动。模型没有异步触发、复制、0费或X费牌，不能声称这些复杂渠道已覆盖。

| ID | 职责 | 费用 | 基础 / 升级 |
| --- | --- | --- | --- |
| zl01 | 基础单体输出 | 1 | 6 / 9伤 |
| zl02 | 当前回合防御 | 1 | 5 / 8格挡 |
| zl03 | 跨回合防线来源 | 2 | 12 / 16玉璋 |
| zl04 | 用防线换即时击杀 | 1 | 消耗6玉璋，14 / 18伤 |
| zl05 | 无玉璋时也可用的终结 | 3 | 24 / 32伤 |
| zl06 | 小额即时防守与留存 | 1 | 4格挡+3玉璋 / 6格挡+4玉璋 |

依赖图：zl03或zl06→玉璋→未来减伤 / zl04即时伤害；zl01/zl05不依赖玉璋。zl03→zl04 可在3能量中完成；空资源反序不能支付。6玉璋、敌14 HP且意图15时转攻击杀免去全次伤害；自己5 HP、敌40 HP且意图10、**只剩1能量**时，转攻后无法再支付防御会死，普通攻击后保留6玉璋则余1 HP。不能省略最后1能量约束：完整3能量手牌允许转攻→防御→小额防线，不能笼统声称转攻必死。以上是明确可达状态反例，不是环境分布证据。

## 数值诊断，不是 B/C-GATE 通过

仓库 `docs/evidence/warrior75/matrix.json` 提供 STS1 固定来源位置，身份是固定第三方反编译镜像，不是本轮直接官方客户端核验。后续须重新核原文及环境，不把历史PASS继承为本角色平衡结论。

- `BodySlam.java` use 28–35 / upgrade 78–85：格挡转输出、升级降费的参照。本候选消耗固定6防线、仍花1能量，不按全部防线无限增长；机会成本不同。
- `Barricade.java` use 28–44 / upgrade 46–53：跨回合留防参照，稀有能力3→2费。本候选不用启动能力就能留存，必须把强度上限、来源费用和机会成本计入，不能宣称普通来源与稀有能力等价。
- `IronWave.java` use 33–40 / upgrade 42–50：伤害/防御分配参照，本候选zl06没有伤害，留存收益需多回合验证。
- `Bludgeon.java` use 31–37 / upgrade 39–46：高费直接伤害参照，本候选zl05稀有、3费，现值可能缺乏稀有价值，不凭单局擅改；先核基线并测与防守后延迟攻击的机会成本。

已知风险：zl06两张合计8格挡+6玉璋，当前防守可能支配zl03的12玉璋，但占两次抽牌，跨回合留量更低；需自然抽牌对比。zl03满资源会浪费；zl04无来源会死抽；持久防线可能让低伤敌失去压力。没有补回血掩盖问题。没有审美/数值批准，禁止扩到75或将6卡冒充完整技能池。

## 来源与命名 HOLD

读取 `sources.json`。HoYoWiki主机为官方社区平台，不能自动当成所有条目都经官方背书。2026-11-13 搜索命中角色页摘要含“地心”“天星”“玉璋护盾”，打开正文返回0可读行。仅搜索摘要、主页URL不能满足逐卡精确核验。技能/天赋/命座/TCG/战斗语音/日常语音/故事/宣传分类均保留待查项；没有降级到P3/P4，没有制造官方原话或人审记录。即便选中“地心/天星”候选，仍需精确条目、效果匹配及独立人审。

## 复现与后续

`node --test experiments/characters/zhongli/model.test.mjs`

证据仅 Node 内核正确性；无浏览器、手机、官方导入、真人试玩、自然奖励仿真或当前SHA必需CI。先补资料索引和两类同类原文核验，再确认机制合同、可玩小样；不能跳到75。阶段成果可远端备份但保持候选/HOLD，不申请正式合并许可。


## 0.2：完整目标与抽牌循环增量

用户新增完整目标是75张牌与初始遗物，必要时沿既有美术流水线做资产；当前仍只6种机制卡位，保留69个未生产位置，不填无意义占位牌凑数。`battle.mjs` 增加可复现洗牌、每回合抽5/满手10、弃牌重洗、战斗重置和候选初始遗物 `zl-relic01`：每场开始仅一次获得3玉璋。遗物名、数值、来源均HOLD，非正式批准。初始实验牌组4攻击+4防御+1防线+1兑现；未采用稀有终结或额外治疗。抽牌算法用单独确定性随机流，可见决策投影不含牌库顺序/随机状态。该投影是策略接口，不意味着客户端存储不可见。

此增量覆盖前文“无抽牌/洗牌”的0.1内核边界：0.2 harness现已实现抽牌和洗牌；其余奖励/商店/遗物池/自然选牌/真实敌人族群仍未实现。单敌意图输入支持多段，不能说已接入官方敌人。`node --test experiments/characters/zhongli/*.test.mjs` 是当前复现命令。

独立复审0.1：`character-rules-zhongli-56b6834-20261113`，规则审查员实际重跑24/24并核GitHub五路径；判定仅限定数学模型通过，不代表来源、人审、平衡、CI或设备。后续Codex复审指出“转攻必死”反例遗漏剩余行动预算，0.2已收紧成剩1能量并断言不能跟防守牌。没有为消除该反例修改任何数值。0.2新增抽牌/遗物需另行独审，旧评审不自动继承。

### 初始牌组压力证据（非自然奖励成型）

`node experiments/characters/zhongli/pressure.mjs` 复现 `pressure-results.json`：4类人工意图（低伤4、随回合成长3+2t、大伤18、3×3多段），进攻/防守两策略，遗物有/无；开发种子1–10与保留种子1001–1010，合计320场、每格n=10、上限20回合。逐局保留失血、胜/败/截断、兑现首次回合及回合开始条件牌未支付次数。决策枚举整回合合法牌序，不是打一张就结束；只用当前可见手牌/意图，不看下一张。未以这批结果调值。没有置信区间，不把n=10的胜率外推为产品结论。

有遗物保留种子：大伤进攻失血P50/P90=31/36，防守41/54且1场截断，说明保守策略可能拖长高压战斗；低伤防守0/0，提示长效盾可能抹平压力，需更真实成长/负面/群怪遭遇复审。成长与多段样本防守0/0，不能据此称全面平衡。由于仅初始牌组，无奖励出现/选择/成型率，更不是自然构筑证据。

本地终端试玩入口：`node experiments/characters/zhongli/play.mjs`，数字出牌、`e`结束、`q`退出；固定种子42和单敌，展示当前意图、每牌同源规则与资源。不要求使用用户桌面/游戏GUI，不包含资产。此入口待真人操作记录，自动脚本不是G7人测。用户最新美术范围仅角色待机动画，由独立美术线处理，本分支不做卡牌插画。


### 官方机制来源增量（仍非中文命名放行）

资料线补充后本角色线实际打开核读两份官方作者英文正文：[1.3更新公告](https://www.hoyolab.com/article/162350) Characters / Adjustments to Zhongli（222–261行）核实生命关联护盾、岩脊、减抗与生命关联伤害；[设计回应](https://www.hoyolab.com/article/100444)39–49行核实护盾/控敌与生存定位。均署名Genshin Impact Official。版本明确为2020–2021历史机制材料，不当作2026完整角色资料；中文名字和完整P1/P2分类仍HOLD。来源记录在sources.json，同页只保留短名称锚点和原创概述，不复制全文。

**zl04主动消耗自己的护盾换伤害属于本作回合制改编假设，不是已证实的钟离原作招式**；这项核心取舍还需人物表达/产品评审，若不成立应换机制方向，不能用官方盾的存在自动背书。初始遗物每战3玉璋同样属于新设计候选，未冒充官方遗物。

## 0.3：失败解释与第一批职责研究（8种卡位，不是G8扩容放行）

`failure-traces.json` 固定保留种子1006，18点单次攻击，防守策略：无遗物20回合死亡，有遗物20回合余3 HP、敌16 HP截断。轨迹显示每回合玉璋被消尽，zl04整场未打出；策略按“当前少失血”严格优先于一切伤害，即使可以用伤害缩短战斗也常选三张防御。遗物只贡献开场3点缓冲，不能修复这种局部贪心。不把策略失败直接判成数值Bug，也不延长时间上限、删样本或添加固定回血掩盖它。旧320场报告原样保留，复跑输出与旧JSON一致。

两个新**研究卡位**只复用已有damage/block/jade，不增加计数器，不修改原6张牌及遗物数值：

| ID | 职责与实际成本 | 候选基础 / 升级 | 不选情境 |
| --- | --- | --- | --- |
| zl07 | 1费普通攻击，高压回合防守时也推进击杀 | 5伤5格挡 / 7伤7格挡 | 无伤害意图时格挡浪费，纯输出/长期留盾可能更好 |
| zl08 | 1费普通攻击，低压回合输出同时积少量跨回合防线 | 4伤3玉璋 / 6伤4玉璋 | 即时大伤减免不足，满玉璋收益浪费 |

zl07与zl08：受5点攻击时，前者免伤、后者失2 HP；空意图时前者格挡归零、后者留3玉璋但少打1伤。不会声称一张普遍优于另一张。zl07借鉴STS1 Iron Wave的攻防同牌职责，zl08借鉴其机会成本及Barricade的延迟留防问题；后者不是“等同一张稀有能力”，仍需单牌精确对照与独立数值批准。固定值仅研究初值。全部名称继续待命名，资料/人审不全不会自动变正式卡牌。

`node experiments/characters/zhongli/batch-one.mjs` 复现240场额外职责实验：全新探索种子2001–2010，四人工意图×两策略×三牌组（原10张、原10张+zl07、原10张+zl08）。增加卡牌保留真实11张牌库厚度，不通过替换基础牌伪装免费收益。它是固定拿到一张后的效果，不包含奖励出现或选择概率。不同牌库大小的同种子随机消费不等价，不作逐种子因果差值，只报各组描述性分布。

大伤防守组：原组9胜1截断，失血P50/P90=40/45；加zl07为10胜，21/24；加zl08为10胜，37/44。成长进攻加zl08的P90从原组5到7，揭示少量防线/加厚不保证改善。n=10每格仍很小，无统计推广或正式平衡结论。所有负面结果保留在`batch-one-results.json`，本批没有根据结果调值。

总量现在8种研究卡位+1候选初始遗物，离75仍缺67张。G1中文来源、G3命名、G5数值、G6自然奖励、G7真人均未通过；这两个卡位用于验证缺口，并不把未过G7的研究写成G8已获扩75许可。下一批须先验证真实敌人/自然获取及人物表达，尤其主动消盾是否符合本作钟离合同，再补职责，不先造67张名称。

### Boundary repair after 0.3 review
The reviewer reproduced dead-state draws, invalid RNG acceptance and duplicate instances
spanning draw/hand. battle.mjs now validates all public battle entry points, complete
card zones, instance identities and numeric state. Terminal draws/relic calls do not
change state. Targeted tests passed 42/42 before journey work. The prior 40-test suite
missed these boundaries. Preserved snapshot: 54e97ae; successor repair: 2ab3daf.
New journey work is not covered by prior review approval.

### Three-room acquisition slice: RESEARCH ONLY
Production rules read at baseline 903bf2a31e91f10fb24763ab4cea23d586d0bb83:
- data/rules.json:63: three choices.
- src/lua/abyss_card_pool.lua prepareRewards: rarity first, unique offered identities,
  rarity offset and act upgrade RNG. Incomplete pools must not be silently filtered.
- src/lua/abyss_run.lua:355-374: phase ownership, validated index, transactional append,
  once-only resolution. Choice 0 explicitly abandons; UI Skip merely closes picker.
- src/lua/abyss_relic_card_rewards.lua: multiple groups/Singing Bowl excluded here.

journey.mjs does NOT port production rarity or upgrades: only five candidate common
identities and no uncommon pool exist. It uses explicitly restricted three-distinct-common
seeded offers after wins one and two. Acquisition adds one permanent deck instance; next
battle shuffles the full deck. HP persists; jade clears; relic applies once per new battle.
No free heals, removal, upgrades, shops or guaranteed combo offers. Three encounters repeat
the same synthetic family with 40 HP enemy, not real map integration.
Reward policies see only HP, current deck and offer: abandon all, accept at most one zl07,
or accept at most one zl08. Action policy uses visible-state full-turn defense enumeration.

Replay: node experiments/characters/zhongli/journey-study.mjs
120 runs on unseen seeds 3001..3010 (4 families x 3 reward policies x 10), up to three
battles each. journey-results.json includes per-room HP, turns, choices, deck sizes and
dead payoff draws. Same encounter/offer seed schedules; changed deck size changes shuffle
mapping, so this is not matched card-draw causality. No numbers tuned from these seeds.
Low/growing: all policies 10/10 completion, loss P50/P90 0/0. Multi: all 10/10, loss0/4.
Large: all policies 0/10, all die. These endpoints DO NOT establish acquisition superiority:
easy fixtures have a floor effect; repeated large hits overwhelm HP-carry runs. Do not tune
to erase failures. Next requires actual encounters and per-room opportunity-cost analysis.
Not G6/G7 approval, natural 75-card construction, population balance or fun evidence.

### Missing responsibilities before 75
Eight research roles are not 75 complete cards. Do not create 67 numeric variants.
- Control identity missing: one capped refresh/not-stack contract and boss immunity
  timing must precede control cards.
- Rock construct/resonance missing: inspect existing summon limits/timing before adding
  parallel counters solely for theme.
- Selection/draw/setup retention costs missing: establish hand/deck ownership, exhaust,
  retain timing and infinite-cycle tests before access tools.
- Multi-target encounters/target selection absent; more single-target variants cannot fix it.
- Shield sacrifice is a proposed adaptation, not official evidence. Identity acceptance
  may change this branch; do not mass-produce dependent payoffs first.
- Uncommon roles, rarity curve and expensive payoff viability need actual distributions,
  two checked STS1 comparisons each, and human evidence.
These are unresolved production responsibilities, not approved effects or a card quota.

### Ninth research role: suppression (0.4 candidate, HOLD)
zl09 costs 1, base 5 damage then 1 Weak; upgrade 7 damage then 2 Weak. Previous card
values unchanged. Name remains pending. This is a **project adaptation**, NOT Zhongli's
original petrification, resistance shred, nor a newly approved official ability.
Role: invest damage tempo into reducing coming ordinary attacks, protecting HP/jade;
quiet turns make a basic strike's extra damage preferable. This is not G8 mass expansion.

Pinned project contracts (903bf2a): data/rules.json weakPercent=75; data/statuses.json
weak stacks duration and decays round_end_minus_1; abyss_actor.status/addStatus/tick:
player-applied enemy Weak does not receive the monster-source JustApplied grace, unlike
some enemy-applied status cases. attackFloat reduces ordinary attack then floors.
The candidate models only player-applied enemy Weak and plain incoming attack hits.
It does not claim support for poison/fixed damage, Artifact, strength/vulnerable ordering,
monster-origin debuffs or actual engine integration. No use of enemy-AI stunned.

Duration adds, magnitude stays 25% reduction, enemy action completes then duration loses
one, including a nonattacking action. Safe-integer overflow rejects before payment.
No game-design cap is invented; safe integer is an implementation boundary. Damage resolves
before Weak; a killed enemy gets no new debuff and cannot act. Each hit floors separately
before block/jade/HP; one action with multiple hits decrements duration once. Dead battles
retain frozen state. UI text derives duration and percentage from the same effect/config.
Action enumeration now evaluates the resulting Weak state, not original intent damage.

53 local tests cover both versions independently, stacking vs multiplier, multi-hit floors,
2→1→0 decay, idle enemy action expiry, cancellation/invalid target/payment/overflow rollback
and lethal handling. Source and balance review remain HOLD. STS1 comparison candidates are
Clothesline (attack plus Weak) and Sucker Punch (attack plus Weak); their exact pinned source
values have NOT been verified here, so they do not yet count as B-GATE references.

### Second responsibility batch: eleven research candidates (0.5, HOLD)
Prior ninth-card snapshot a10b3df/local7bd88fe was independently checked as
character-rules-zhongli-7bd88fe-weak-20261113: 53/53 plus 1002 independent rounding oracle
cases. That review does not automatically approve this new batch.

zl10: cost2 block20, upgrade26; exhaust after resolution. Unlike zl03's reusable jade,
this saves a heavy-hit turn but leaves no persistent protection on quiet turns and cannot
be redrawn this battle. Complete hand/draw/discard/exhaust ownership is validated. Exhaust
resets on the next battle. Production baseline903bf2a abyss_combat.lua:887 routes exhaust
cards to exhaust rather than discard; this experiment does not port exhaust triggers,
recovery effects or relic interactions. They remain unsupported rather than silently tested.

zl11: cost1 damage5 then, if jade>=6, extra6; upgrade damage7 then extra8. No jade spent.
This adds a maintain-defense payoff, distinct from zl04's risky consume-defense payoff.
Threshold is shared by text/runtime. Below threshold it underperforms the basic strike;
above threshold it offers tempo while preserving the defense resource. The two sequential
damage effects are deliberate. Both slots are project adaptations, not official named
abilities or approved character identity; pending display names and source HOLD retained.
Old card numbers unchanged. Candidate values are unapproved hypotheses, not balance fixes.

61 local tests include independent base/upgrade outputs, threshold0/5/6/7/20, enemy armor,
no resource consumption, opposite quiet/heavy contexts, exhausted ownership across ten
reshuffles, duplicate-in-exhaust rejection, new-battle reset, cancellation/payment/target.
Balance reference candidates: Impervious/Flame Barrier for emergency defense; Body Slam/
Sucker Punch for conditional output comparisons. Exact original-source numerical comparisons
are still missing and do not count as completed B-GATE evidence.

New evidence batch-two.mjs: 120 single battles on seeds4001..4010; three families, baseline
and fixed single addition of zl09/zl10/zl11, defensive visible-state policy. Deliberately
not natural rewards: guaranteed added card and changed deck-size shuffle mapping are
confounders. In heavy fixtures baseline9 wins/1 truncate, loss P50/P90 45/54; zl09 10wins
20/29; zl10 10wins30/40; zl11 10wins32/42. Growing all groups zero-loss floor. Multi-hit
zl11 P90loss4 versus baseline1 is a downside case, not silently discarded. Small-n and
myopic policy prohibit population balance/fun inference; no values changed after results.
The frozen three-room reward pool is unchanged and still does not include these additions.
Full75 still64 missing; this batch does not pass G1/G5/G7/G8 or production integration.

### Paid draw access and explicit restricted-pool v2 (0.6, HOLD)
Twelve candidate roles now exist, not twelve production-approved/playable cards.
zl12 costs1, block3 then draw1; upgrade block4 then draw2. Existing values unchanged.
This is tactical access adapted for this project, not an official Zhongli skill name.
Opposing cost: a draw card spends energy and offers less immediate protection than a
basic defense; drawing cannot create energy or guarantee a specific payoff.

Pinned903bf2a abyss_combat.lua resolvePlay removes played card from hand and sets cardInUse
before effects; only after resolution does it enter discard/exhaust. shuffleDiscardIntoDraw
requires an empty draw pile. Candidate matches those boundaries without claiming trigger parity.
Kernel returns pendingDraw and inUse (not a completed play); full battle wrapper resolves
draw/shuffle from cloned state, then disposes played instance. It cannot draw itself.
Unresolved kernels reject another play/endTurn/view; ownership validation includes inUse.
Only a final draw effect is currently supported; interleaved draw/effect lists are rejected,
not silently reordered. Maximum hand10, overflow draw stops without consuming draw pile.
No on-draw status damage, relic triggers, draw denial, retain, or exhaust retrieval support.

Planner enumerates only current visible cards, stops at a draw boundary, then reobserves
actual resulting hand. It does not evaluate unseen draw/discard/RNG. Tests poison hidden
getters and verify a newly drawn attack can be played afterwards. Fixed positive costs,
no energy generation and no retrieval bound action count by energy; no zero-cost loops.
69 local tests include basic/upgraded draw, self-reshuffle exclusion, ten-card cap, partial
draw, invalid RNG, pending-state rejection, malformed draw range/order, cancel and payment.
B-GATE comparison candidates: Shrug It Off and Backflip; exact source values still HOLD.

Versioned reward pool: v1 unchanged five commons; v2 adds zl09/zl11/zl12, eight commons
in total. offers(seed,room,version) is replayable and returns three distinct IDs. zl05 rare
and zl10 uncommon still have no journey acquisition channel; they remain kernel/fixed-deck
research only. This is NOT a complete rarity system. Common probability=100%, uncommon=0,
rare=0 in this deliberately restricted study. Ideal uniform per-offer inclusion is3/8;
actual finite LCG sampling is not asserted perfectly uniform. access-results.json records
20000 diagnostic offers (seeds1..10000, rooms1/2), observed inclusion counts for every ID.

access-study.mjs:160 three-room runs on fresh seeds5001..5010, two versions x two families
x four visible reward preferences. Neither version guarantees the desired card, accepted
copies are capped at one by policy, and skip remains a real choice. Large-family all groups
die; multi-family all complete, guarded policy v2 P90loss3 vs baseline2. Thus reachable
cards are not proof of balance or improved survival. Actual original320/oldjourney120 outputs
remain byte-for-byte equal with the legacy default. New source/naming/human/integration
and full-rarity gates remain HOLD; full75 is63 candidates short.

### Thirteenth research role: offensive exposure window (0.7, HOLD)
Prior 0.5/0.6 local86bec94 / remote8e8e962 independently reviewed by
character-rules-zhongli-86bec94-access-20261113:69/69,18 independent role probes,20-turn
all-draw-card conservation,160 journey/120 fixed-card reports and20000 offer counts.
This recorded scope does not auto-approve the following candidate.

zl13: common cost1, apply2 Vulnerable; upgrade3. No immediate damage, shield, draw or energy.
The official1.3 English notice162350 documents nearby nonstacking resistance reduction.
Our targeted timed +50% ordinary-attack Vulnerable is NOT that resistance formula, aura,
stacking behavior or petrification. It is a proposed adaptation, not an authenticated name.
Choosing setup can improve follow-up hits, but loses a last-energy immediate lethal and
cannot save HP by itself. Original12 card numbers unchanged.

Project903bf2a rules vulnerablePercent150; statuses vulnerable duration/round_end_minus_1;
player-source status marking has no monster-source grace. Each player attack effect gains
50%, floors before enemy block; two damage effects floor separately. Duration adds without
increasing magnitude, decrements after enemy action including idle, clears at0 and newbattle.
Incoming enemy attacks are NOT amplified by vulnerability on the enemy. Damage then status
on dead targets is excluded. Unsafe duration/damage arithmetic rejects before payment.
No Artifact, fixed damage/poison, full power-order or monster-source guarantees are claimed.
75 local tests cover both versions, duration2+3, round expiry, separate-hit/armor arithmetic,
no incoming amplification, last-energy tradeoff, target/cancel/payment/overflow rollback.
Exact STS1 reference values for Bash/Trip remain unverified; no B-GATE approval claimed.

v3 restricted common offers add zl13 without changing v1/v2. Three distinct out of nine;
common100%,rare/uncommon0 remains deliberately incomplete. Ideal-uniform inclusion1/3,
actual20000-offer diagnostic counts are saved, not asserted an exact LCG theorem.
exposure-study.mjs:40 three-room heavy-pressure runs seeds6001..6010 comparing v2/v3 and
skip/expose. Only v3/expose acquires zl13 (5/10); one reaches room3 vs0 for all controls.
All40 still die. This is reachability evidence, NOT survival balance or successful natural
full-pool construction. Current rare5/uncommon10 still lack journey acquisition channels.
Full75 remains62 short; source/naming/character-contract/balance/human/integration HOLD.

### Fourteenth research role: retained attack window (0.8, HOLD)
Previous13-card local1b8b58c / remoted135d6d independently reviewed by
character-rules-zhongli-1b8b58c-vulnerable-20261113:75/75,1002 rounding oracle cases,
40journeys and20000offer count reconstruction. No approval is implied for this new batch.

zl14: common cost2 damage13, upgrade18, selfRetain. Untouched original13 values.
Role is waiting for a viable output window instead of losing the card at end turn. It
still costs2 and occupies a hand slot while unplayed; retention gives no discount or stats.
The one-energy setup test must wait for next turn; it is NOT evidence that an otherwise
payable same-turn combo should be delayed. Source/name/identity are unapproved adaptation.

Pinned903bf2a abyss_combat.lua:1685-1693 partitions selfRetain/selected/instance.retain,
excluding ethereal; retained cards later reunite with hand. Candidate implements only
intrinsic selfRetain at stable turn boundaries, not selected retention, ethereal conflicts,
Establishment/Equilibrium/Well-Laid Plans or other retain triggers. It does not model their
intermediate staging queues. Unplayed14 remains in hand, ordinary cards discard, then normal
five-card draw respects cap10. Played14 enters discard normally and may later reshuffle.
On incoming lethal, this model ends battle and discards remaining hand without drawing;
preexisting terminal states remain unchanged. This cleanup is not asserted engine parity.

83 local tests cover separate base/upgrade damage and payment, full hand preventing draw,
ten retained instances consuming real slots, release-one-slot draw, zone uniqueness,
invalid duplicate rollback, death/victory freeze, new-battle reset via fresh instances,
cancel and insufficient payment, one-energy setup into next-turn attack. Reference candidates
for future source checks: Windmill Strike and Sands of Time for hold opportunity-cost design,
not asserted exact equivalent values or completed B-GATE comparisons.

v4 restricted pool adds14 to ten commons, leaving v1/v2/v3 unchanged. Ideal-uniform inclusion
3/10, actual20000-offer generator counts recorded. Rare/uncommon channels still absent.
retention-study.mjs:40 fresh-seed7001..7010 runs, large/multi x skip/accept14. Large both
9deaths/1truncate, accept14 actually obtains1/10; multi both10complete lossP90=4, obtains6/10.
No demonstrated survival advantage; myopic policy does not optimize future retention value.
Full75 remains61 short. Human/source/full-rarity/balance/integration gates remain HOLD.

### Fifteenth research role: temporary attack retaliation (0.9, HOLD)
14-card local60c54bd / remotebcd763b independently checked under
character-rules-zhongli-60c54bd-retain-20261113:83/83,90 mixed retention/draw/exhaust turns,
40run and20000offer report reconstruction. Not approval of this new role.

zl15 common cost2, block8 then counter3; upgrade block11 then counter4. Prior14 unchanged.
This answers repeated attacks, not persistent defense or burst prevention. It is a proposed
project adaptation, not an official Zhongli reflective shield, petrification or name.

Pinned903bf2a statuses flame_barrier/intensity/next-turn removal; Actor.queueAttackedPowers
explicitly triggers zero-damage, fully blocked and lethal ordinary hits. Actor.retaliate
consumes attacker block but applies no ordinary modifiers and cannot recursively retaliate.
Candidate models a single enemy, immediate reaction after each plain incoming hit; target
Vulnerable does not amplify fixed retaliation. Each hit first consumes block/jade/HP, then
counter triggers even if player died. If enemy dies, later hits stop. If both die, result
is death, never victory/reward. Counter intensity adds; safe-integer overflow rejects before
payment. Empty hit-list means no attack, so no retaliation; list[0] means one zero attack.
Stable endTurn boundary clears counter for next turn; this is not full engine queue parity,
area batching, Intangible, trigger relics, fixed incoming damage, or after-death UI handling.

Shared pure previewEnemyAction drives immediate policy projection and resolution, so a
counter kill can avert later hits without looking ahead. Policy still does not inspect
future encounters/draws. Tests include block/vulnerability independence, zero vs idle,
lethal trigger, two deaths, mid-multihit kill, additive intensity, cancel/pay/overflow and
newbattle reset. 90 local tests pass. Original320 report remains byte-identical.
B-GATE exact references for Flame Barrier/Flame Barrier+ and Caltrops still need independent
source verification; current numbers are candidate hypotheses, not approved tuning.

v5 restricted ordinary pool adds15 (11 commons), retaining v1–v4; ideal uniform inclusion
3/11 with real20000-offer counts saved (not exact-uniform RNG assertion).40 fresh-seed
8001..8010 three-room runs compare skip/accept15: large both10deaths, actual acquisition2/10;
multi both10complete lossP90=4, actual acquisition4/10. No survival benefit demonstrated.
Full75 remains60 short; rare5/uncommon10 still lack journey access. Source/identity/naming,
complete-rarity, balance, human play and production integration remain HOLD.

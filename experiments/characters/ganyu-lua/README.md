# 甘雨正式 Lua 队列接入第一切片（未注册）

基线：远端 develop 903bf2a31e91f10fb24763ab4cea23d586d0bb83，本轮重新ls-remote/fetch核验。候选源为甘雨分支本地49b4ddf/远端5f13156a中的75卡cards.json（0.26）；这里只读拷贝并在生成物记录SHA256，不调候选值、不声称来源/平衡已审批。

本切片不是另造战斗引擎：把01、02、22、24的基升结构映射为真实Lua卡定义ABI（amount→value、enemy→ENEMY、upgrade、exhaust），在测试私有data副本注入，经正式Combat.new/Combat.play、真实UID、原动作队列/支付/扣甲/抽牌/消耗结算。没有改data/cards.json、角色注册、源卡池、V4或共享dispatch。定义前缀ganyu_lab防碰撞，productionEnabled=false。attack/skill分类是此适配提案，不代表角色生产审批。

## 实测与差异

- 编译器2测试通过：4卡独立字面值、71卡明确未映射；未知资源、保留、非法目标/数值/额外effect字段拒绝。
- 正式Lua执行14组基升场景通过：支付、护甲、盾、抽牌、消耗、无效目标、能量不足、原注册未污染。
- 已复现真实差异：22击杀最后敌人后正式队列清掉draw尾，研究JS模型会继续抽牌。本适配遵循正式引擎，不静默修改它，不宣称与旧模型全局等价。
- 此处敌HP100/指定手牌只是队列集成夹具；非自然构筑、完整角色试玩或设备验收。

## 下一步产品阻塞

71卡仍未接入，包括尚未验证的普通组合；蓄力上限/消耗、满蓄/单蓄分支、冰雨跨回合字段/延长/提前释放、首回合遗物hook、检索与保留均须正式状态/队列生命周期协议。不得把字段塞入UI或用研究引擎替代正式动作队列。44设计支配及源头/命名/人审仍HOLD。完整角色注册需上述协议、单卡对照与独立审查后另行进行。

## 复现

先安装项目锁定依赖并执行 `node scripts/build-lua-data.mjs`；然后：

```
node experiments/characters/ganyu-lua/compile.mjs
node --test experiments/characters/ganyu-lua/compile.test.mjs
node node_modules/fengari-node-cli/src/lua-cli.js -e "dofile('experiments/characters/ganyu-lua/verify.lua')"
```

本环境复用已有锁定依赖目录；Backlog CLI不存在，未伪造任务认领。未启动全量测试，独审/CI/正式导入/真人验收未完成。本目录为未注册集成切片，不是可选正式角色。

## 隔离角色资源/生命周期提案

resources.lua 是无共享注册的纯数据计划器，尚未接入正式回合生命周期。实现蓄力0–2、主动产蓄、满蓄两段箭、单雨场取max刷新、回合末剩余能量入蓄（遗物真实合同不是战斗开始赠蓄）、消耗tick与重复owner-end拒绝。输出仅标准damage/damageAll动作及待提交资源，不直接改Actor，也不自建伤害引擎。resources-test.lua 实际调用正式Effects.apply验证主目标死亡仍对第二敌人绽放、雨伤击杀结果；资源输入不变和异常断言通过。

挂接约束：正式Combat.endTurn事务须在弃牌前提交bank，弃牌后/敌行动前排tick；资源与能量必须同一事务回滚。lastOwnerEnd需随战斗重建，不是跨战永久资源。当前仅计划器加真实伤害执行测试，不证明上述自动挂钩已完成。共享待协调点为abyss_flow_actions、abyss_end_turn_powers和正式资源可见视图；本分支均未改。类型、伤害修正与遗物来源适配仍需批准及审查。

## 第二切片（待独审）

扩至8个未注册定义：新增04、08、21、55，复用正式damageAll、block/draw、零费exhaust。3编译测试与22组原Combat.play基升检查通过；其余67未映射。卡文/升级文从同结构输出，ALL_ENEMY采用正式定义ABI，不能当设计批准。数值生成限制为Lua平台32位非负整数。04 attack类型与其他类型仍属接入提案；正式力量/虚弱/敏捷等修正将由原引擎承担，不强求与未建这些状态的研究模型等价。资源阶段另加未完成bank禁止新bank，防跳前轮冰雨；集成owner需取最新快照。

## 第三切片（待独审）

仅普通正式操作增量扩至17卡：新增07、11、12、13、15、57、61、63、73，其余58仍未映射。新增18组独立字面期望验证每张基升的费用、伤/盾/抽、弃置或消耗、10实例守恒，累计40组正式Combat.play场景。资源接口与82fad750已审版完全一致，没有动共享生命周期。类型仍是提案，不是批准注册；零费经济及终结伤害后抽牌尾被清除的正式语义风险未消失。

## 第四切片（待独审）

扩至22卡：26、28、54、62、65使用正式selfRetain，28同时exhaust；其余53卡（含保留但需资源的27/40/56/59/68/74）仍拒绝。新增10基升生命周期夹具真实调用Combat.endTurn，核同UID跨轮保留、未打不获得印刷格挡、后续出牌仍正常支付及弃置/消耗，累计50组Lua场景、4编译测试。旧17卡生成物仅显式selfRetain=false，原费用/效果/卡文未变。此处依旧是私有bundle，未选入正式职业或自然奖励，未作Balance批准。

终局语义精确补充（17卡独审）：57/73击杀最后敌人后的draw尾被正式队列清除；12的同步block尾仍结算3/4盾，61先盾已生效。不能概括为“所有尾效果均清除”。本适配沿用实际正式引擎生命周期，不为追平研究模型而改共享结算。

## Conditional resource planner increment (not additional registered cards)

Added pure plans for charged_direct, charged_block, charged_aoe and storm_block. Full-charge effects consume exactly 2 only at resolution; 0/1 remain. Storm condition includes a live zero-damage field, does not consume/refresh its ticks, and does not consume charge. Aggregate base+bonus is checked before Lua integer addition. Independent literal base/upgrade values for 17/19/35/32 exercise 48 resource/field combinations against actual native Effects damage, armor and block, plus MAX and malformed-field rejection. This does not implement payment, resource commit, pause/resume or the shared dispatcher. Definitions remain 22, unmapped 53; none of these four planning capabilities constitutes a newly playable card. Existing 50 native Combat groups and compiler tests remain passing. Pending independent review for this increment; prior 22-card retain batch independently passed at 22f058e6 (ab04015 documentation-only follow-up).

## Manual storm resolution proposal

Pure storm_release now emits one native damageAll and removes precisely one existing trigger; absent field emits no effect. It does not change the bank/owner-end markers. storm_focus emits one native damage equal to base plus remaining field amount×turns, then removes the field in the returned copy. The multiplication is bounded before evaluation on the 32-bit Lua runtime. Candidate37 remains a disputed, unapproved adaptation, not a newly enabled card or an approved design change. Tests cover base/up4/7 with1–3 remaining6-damage ticks, armor/single-vs-group target separation, absent/zero-damage fields, repeated release expiry, exact MAX and overflow rejection with unchanged input. All50 Combat groups and4 compiler tests remain passing; definitions stay22 and53unmapped. Formal payment/target validation/resource commit and queued terminal ordering are host responsibilities not implemented by these pure plans. Conditional predecessor ad5e34ed passed independent scoped review; this storm increment awaits its own review.

## Tier-payment planner increment

Added spend_one_damage/block and full_charge_damage/block plans, retaining the exact frozen41/42/44/45 values. 24 independent base/up×charge0/1/2 native Effects cases cover armor, target isolation and unchanged input. Ordered full-bonus→charged-shot retains bloom, whereas single-charge-payment→full-bonus/charged-shot loses the full-charge benefits. Checked MAX addition and inactive huge bonus tests pass. This does not resolve44's domination/design blocker or change any values. Definitions remain22/unmapped53; all50 Combat and4 compiler tests pass. Next priority is a real opt-in queued resource transaction with the shared integration owner, not treating additional pure plans as playable cards. This increment awaits independent review; predecessor0906386e storm plans received limited review approval.

## Proposed queued charged-shot/charge ABI

`queued-card.lua` exports prepare(combat,state,effect,target,uid) and dispatch(combat,state,effect,queue). Namespace ganyuCard supports charge and chargedShot only. Preparation captures native NORMAL damage for the target and all enemy IDs before subsequent modifiers change; dispatch validates pendingPlay/cardInUse UID and target identity, resolves charge at execution time, pushes native damage actions in order and commits the resulting resource record. It does not start/finish queues or debit energy. `queued-card.test.lua` uses actual ActionQueue, Effects/Actor and Snapshot, including modifier snapshot preservation, six base/up×charge scenarios, three charge scenarios, command rollback after native damage, and malformed context rejection. Payment in this fixture is explicit harness code, NOT real C.play; shared opt-in dispatch/prepare wiring, terminal allow policy and public play validation remain the integration owner's next task. No shared source files or registration changed. These files await independent review.

## Public play integration contract (currently blocked, NOT PASS)

`public-play-contract.test.lua` calls only real C.new/C.play with explicit candidateLifecycle Ganyu and private fixture03/06 definitions, expecting14 base/up/resource/terminal scenarios plus invalid-target/insufficient-energy/replay identity checks. On develop903bf2a it intentionally fails at the explicit `Ganyu host initialization unavailable` assertion. This is executable acceptance work awaiting shared opt-in initialization/prepare/dispatch integration, not evidence of a working public card. Run it from the integration checkout with this test's absolute path after the owner provides a frozen implementation. The d3c5f3ad queue ABI and18ead808 tier planner have independently passed their limited scopes; the host must validate actual ActorPresence/paid UID and own one Snapshot across payment and queued effects, including terminal allow rules.

### Paid preparation defense in depth

The dedicated prepare path now independently requires matching real pendingPlay/cardInUse UID, an actual state.enemies target object matching the paid targetId, and native ActorPresence.isActive for source/target. A copied actor with the same ID is rejected, as are escaped, half-dead or dying actors. Dispatch rejects an inactive source but intentionally does not re-require the selected target to be alive after earlier queued effects. Tests cover these cases without shared changes. This requires the host to invoke prepare after creation of pendingPlay/cardInUse; host validation and its Snapshot remain mandatory. Public C.play contract remains blocked until opt-in wiring is supplied.

## Native permanent acquisition integration

`acquisition.test.lua` independently runs44 base/up cases across the22 mapped definitions using actual Run.startCombat/finishCombat, leave/reopen reward, claimCardReward, next startCombat and C.play. Rewards preserve upgrade and new permanent UID; next-battle instance retains deckUid, then the same instance reaches discard/exhaust. Claims do not advance card RNG, duplicate claims cannot append twice, unavailable content rolls back, explicit abandon resolves without a card. The offers are deliberately replaced by fixed IDs after a real win; the selected next-battle instance is deliberately moved into hand. This proves native permanent acquisition/instance execution compatibility, NOT natural pool generation, natural draw accessibility, complete Ganyu campaign, or balance. No rarity/source-pool modifications and no registration. This test batch awaits independent review. Earlier57e5707f missing-UID fix passed independent scoped review and is backed up at9868735b.

## Separate conditional draw ABI proposal

`draw-card.lua` is a separate future ganyuDraw dispatcher, deliberately outside the frozen03/06 shared integration. It resolves chargedDraw (consume2), spendOneDraw (consume1 if available) or stormDraw (field existence, no consumption) at execution, then queues one native draw. It reuses paid UID/Actor guards, validates integer fields and checks addition before consumption. `draw-card.test.lua` passed36 literal base/up resource/field cases for30/33/43 through real ActionQueue and native draw, plus actual10-card full-hand cap with4 remaining draw cards, empty supply, real discard reshuffle and post-draw Snapshot rollback including RNG/pile aliases. Missing UID, malformed numbers and aggregate overflow reject before enqueue. This proves isolated queue mechanics only, not shared C.play routing, all draw-trigger powers/pause handling or approved balance. No modification to the frozen queued-card03/06 module; no new registered definitions. Awaiting independent review. Native acquisition51a782e6 passed its44-case limited review.

## Actual public-play power interaction checks

`native-interactions.test.lua` passes8 base/up checks on currently mapped21/02/55: Strength+Weak modifies each AoE hit, Dexterity+Frail modifies block, Feel No Pain+Dark Embrace trigger once for the exhausted UID, and native player.noDraw prevents draw without undoing printed shield/exhaust. Two additional fault injections throw after the second actual C.draw (the exhaust-triggered draw), then verify the whole C.play state and original hand/exhaust/card aliases restore; retry triggers each benefit once. These verify real mapped-card engine interactions and expose why research-model numbers are not full-game balance results. An initial test incorrectly used statuses.no_draw; it was corrected to the actual native player.noDraw field before passing. No production code changed. Separately dfaba927 conditional draw ABI passed scoped independent review; shared routing and complex draw choice pauses remain unclaimed.

## Full candidate reward-pool boundary (not enabled)

reward-pool.mjs projects the frozen source inventory without changing rarity or filtering unsupported cards:2 basic excluded,11 common/58 uncommon/4 rare retained in candidate order, with source SHA256. Native CardPool.prepareRewards across24 seeds produced72 offers including31 currently unavailable choices. Removing all mapped definitions leaves identical identities, upgrade rolls, rarity offset and RNG result; prepare itself does not commit RNG. The boss test selects only the four rare candidates, all unavailable under the22-definition slice; real Run.claimCardReward rejects such content without mutation or reroll. This is explicit evidence that a partial filtered pool must NOT be enabled. The generator/test and resulting pool are isolated artifacts only, not a natural-run completion or approved rarity design. Production registration remains untouched. Independent review pending for this boundary batch.

## Public03/06 host verification update

The previous missing-host failure remains historical for develop903bf2a. A separate exact archive of integration owner commit d55b0c32ea891a4faf978968e95a72fb76e63cef was built with its actual shared Lua sources. The unchanged14 public C.new/C.play contract scenarios now PASS there. Four further base/up probes verify Strength+Weak+Vulnerable captured damage (first enemy83/79HP, second95/94HP) and Thorns killing the player after direct damage: the pending bloom does not hit the other enemy and already-paid charge remains0. These additional probes are now appended to the contract. This is the first verified real public03/06 path, limited to explicit candidateLifecycle ganyu with relicEnabled=false. It does NOT include relic bank, storm/owner-end stages, full75 mapping, class registration, production approval or device/human acceptance. The test must run against that integration snapshot (or a separately verified successor), not this still-unmodified develop host.

## Separate conditional damage/block queue proposal

conditional-card.lua adds an isolated future ABI for chargedDirect/chargedBlock/chargedAoe/stormBlock. prepare captures both base and active-conditional branches using native attack/block modifiers at paid-use time; dispatch chooses according to current resource state, queues the captured native effect and commits resource consumption. Tests execute48 base/up×charge×field combinations through actual ActionQueue/Effects, mutate Strength/Dexterity between prepare and execution to detect recalculation, check4 native-failure resource rollback cases and4 resource0→2/field-created-after-prepare cases. This is not wired into the public03/06 host, adds no registered definitions, and retains the host Snapshot/terminal/choice responsibilities. Existing03/06 modules and contract remain frozen. Pending independent review.

## Separate exact-arrow retrieval queue proposal

retrieval-card.lua implements only first ganyu_lab_03 from draw or discard, moving the original instance with native CardActions.toHand while checking hand capacity BEFORE source removal. It neither shuffles nor presents hidden piles. The isolated ActionQueue tests cover both upgrade variants and zones, source-order and instance identity, NoDraw not blocking retrieval, full-hand no-op, absent-match no cross-zone search, duplicate UID rejection and host Snapshot rollback after movement. This is not shared C.play integration or natural reward coverage. The target arrow definition in the fixture identifies the actual future ganyuCard shape but is not played by these retrieval tests. No shared file or already-frozen03/06 module changed; pending independent review.

### Effect-based retrieval increment

The same retrieval dispatcher now optionally accepts selector=block or charge, only from draw. It consults combat.cardDefinition for the actual base/up instance and matches direct native block or ganyuCard charge, never broad role tags or conditional block. Four real-variant fixtures swap the relevant effect between base and upgrade and verify the first matching original UID is moved while remaining order stays unchanged. Other selectors/zones are rejected; absent selector retains the reviewed first-arrow behavior. No separate retrieval engine, hidden choice interface or source-pool change was added. First-arrow c5e562a passed scoped independent review; this optional selector increment awaits review. Conditional capture target/completeness fixes are followed by integral native amount checks in b2de2e3d; callbackFloat deliberately remains fractional.

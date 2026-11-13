# 钟离接入正式 Lua 引擎：第一条可执行切片

本轮实时 GitHub develop 与 `git fetch origin develop` 均核为 `903bf2a31e91f10fb24763ab4cea23d586d0bb83`。Backlog CLI 缺失，未伪造认领。只改钟离目录；不改 CharacterProfiles、OriginalV4Profiles、共享注册、Actor、调度器、数据根或冻结 V4。

## 已经做了什么

- `export.mjs` 从已审75张JS候选母表生成 `catalog.lua` 和覆盖清单，不另造数值表。映射 damage/block/draw 原生操作，weak/vulnerable 映射 applyStatus，counter 映射既有 flame_barrier gainStatus；保留 cost/type/target/exhaust/selfRetain/upgrade。
- `bridge.lua` 显式接收调用者选择的可执行ID列表，深拷贝源data后追加定义。拒绝空列表、重复、已有ID冲突、未知或缺少native operation的牌。混合支持/不支持的批次整体拒绝，原输入不动。不是自动角色注册入口。
- 16张已有通用操作牌：01、02、05、07、09、10、12、13、14、15、34、37、45、59、61、69。全部以真实 `abyss_combat` 的 `new/canPlay/play` 执行基础和升级，共32次。测试独立固定期望断言伤害、格挡、状态、抽牌、付款、弃置/消耗；另核4张保留、16张不足能量、敌目标非法和重复出牌原子拒绝。
- 引擎源未mock、不用JS模拟器代替、不注入替代受伤函数。`run.mjs` 绑定6个主要真实引擎源与精确基线并保存SHA256及实际输出。使用仓库已安装Fengari执行，不需要游戏GUI。

## 尚未完成，不应当做成75张游戏接入宣传

59张缺自定义操作的牌不进入native可出牌表。`coverage.json`逐ID列 missingOps。初始遗物也拒绝“已接入”声明：持久jade的受伤吸收、清理、cap与battle-start hook尚未实现。默认初始牌组含03/04，故本片**不能启动完整钟离角色**。

下一阶段真实共享接点：
1. Actor受伤的临时Block→持久jade→HP，覆盖多段、零伤、反击、死亡、其他受伤来源及跨战清理；不能拿普通Block或Barricade冒充jade。
2. 正式action队列的支付/预检与失败回滚，构建jade/pillar条件和付款，不能在付费后补失败。
3. owner-end柱固定伤害→存活时repair→敌行动，Power移区与拆除保留实例，死亡清队列符合正式合同。
4. 59张映射完成后再接完整角色/初始遗物/奖励/商店池和UI。71普通只是研究池，稀有度不能当正式规则。原作命名/人物/平衡/人审HOLD保持。

本次读取 `abyss_original_v4_profiles` 确认雷电/胡桃经冻结role及其独立op解释器；钟离不能伪装成其中role。通用桥仅作为真实引擎验证步骤，不改该体系。

## 重放

```
node scripts/build-lua-data.mjs
node experiments/characters/zhongli/native/export.mjs
node experiments/characters/zhongli/native/run.mjs
```

需正常安装仓库 `fengari-node-cli`；本环境复用已有受信仓库依赖目录，通过 NODE_PATH 指定，未下载软件。首轮导出误传textFor对象而非ID，在运行前报unknown card；修正后生成。未运行全量CI、官方导入、ready或设备测试。没有PR/合并/发布，也不把此片标为原生75交付。

## Schema hardening after independent review
The initial exporter only checked operation names. Review reproduced ignored tuple metadata, an ignored onExhaust hook, and a negative damage value; that compiler was not fail-closed. The follow-up now rejects unknown card keys, accessors, non-plain records, sparse or decorated arrays, non-binary tuples, unsafe/negative numbers, invalid enums and non-boolean flags before mapping. Valid-shaped unsupported operations remain explicit blocked inventory entries. `node --test experiments/characters/zhongli/native/schema.test.mjs` covers these regressions and the unchanged 16/59 split. No candidate values, generated definitions or shared engine files changed. This is still only an offline opt-in bridge, not a released character.

## Ordinary-enemy-hit checkpoint (not wired)
`jade_checkpoint.lua` is a pure scalar prototype, not a monkeypatch or Actor hook. It consumes 0..20 jade only for explicitly classified ordinary enemy-to-player attacks, at an assumed post-Block checkpoint. Retaliation, direct HP loss, environment and instant kill do not consume it. Invalid context/negative/fractional/NaN amounts reject. Amount domain is conservatively limited to signed 32-bit nonnegative values for this Lua runtime; no assertion of arbitrary JS safe-integer parity.

Actual develop `abyss_actor.lua` consumes Intangible/Block first (671), then `modifyIncomingAttack` (685) applies Buffer, Heart cap, attacked reactions, Torii and Tungsten before HP loss. A checkpoint before that stage spends jade before Buffer/Torii; one after it reverses that opportunity cost and changes reaction inputs. Neither integration order is silently chosen here. Source-side/kind classification must be supplied by a reviewed Actor call site, not inferred from a card label. The scalar prototype is tested across 11,193 block/remainder combinations plus excluded-path/invalid-input cases; it is not a real native damage integration test. Shared Actor and all production hooks remain unchanged pending coordinated contract review.

## Explicit native lifecycle driver (offline, not automatic integration)
`lifecycle.lua` clones a real Combat state and installs only character-local fixture state. `start(state,battleId,withRelic)` grants the candidate relic's 3 jade once to a fresh single-enemy live battle; an already initialized state rejects. A new battle requires a fresh `Combat.new` state and resets pillar/repair. `install(state,kind,strength)` is an explicit setup operation, NOT a paid card action: it uses the real PowerSchedule membership with strongest-wins pillar 1..6 / repair 1..3, no stacking or immediate tick. `removePillar` calls real Schedule.remove and clears that membership, but does not implement card discard/exhaust/Power UID ownership.

`ownerEnd(state,sequence)` requires a sequential external phase token, clones before work, executes the pillar through actual `Actors.damage(...,fixed=true)`, then repairs only if both sides remain active. A duplicate/skipped token or ended battle rejects. Repair is capped at 20. This driver never calls Combat.endTurn or enemy AI and is NOT attached to EndTurnPowers.prepare. The caller must supply genuine phase events; the token is not a substitute for engine phase validation. Existing Schedule ordering does not determine this driver's explicit pillar-before-repair order: that ordering remains a candidate contract to integrate deliberately, even if repair was installed first.

Unlike the JS mathematical model, real fixed Actor damage retains native Intangible, caps and reaction semantics. This slice uses those contracts rather than bypassing them. `lifecycle.test.lua` runs 36 base/upgraded pillar/repair × enemy HP/Block combinations against real Combat states, plus once-only relic/fresh battle reset, Schedule strongest-wins/removal, illegal/terminal input immutability and an Intangible pulse counterexample. It does not establish full triggered queue ordering, legal card payment/pausing, source card zones, multi-enemy selection, the unresolved jade absorption insertion point, or production-character registration. All remain HOLD. Shared engine files remain unchanged.

## Queue integration contract candidate
`queue_adapter.lua` now supplies a pure one-action `plan(state)` and in-place `dispatch(state,effect,queue)` for a host-owned real ActionQueue. The one trigger inserts pillar then repair explicitly regardless of installation order; sequence/stage markers reject duplicate or out-of-order actions, repair still cleans up its pending marker after a lethal pillar. A pause after the pillar resumes only repair, not the pulse. The host must retain the cleanup repair action at terminal boundaries. No shared dispatcher has been changed.

`zlInstall` is an effect-stage operation delegating to `lifecycle.applyInstall`, which is deliberately in-place and requires host whole-command snapshot rollback. It must run only AFTER the engine's successful payment, NOT after a truthy play return (which can mean paused). Tests use a plainly labeled energy-payment fixture and the actual ActionQueue; they do NOT claim native Combat.canPlay/play payment integration. The host owns UID movement, pause/rollback, and any precondition checks before payment. Acquisition-order, lethal cleanup, pause/resume, duplicate-token rejection and host rollback fixtures pass. Lifecycle validation now rejects false/string as well as out-of-range repair instead of treating false as missing. All production admission gates remain HOLD.

## Six Power card intent inventory and real snapshot probe
`export-power-plans.mjs` derives six Power candidates (21/31/48/51/55/67), both versions, into `power_plans.lua`; these are unregistered intents, not newly admitted native cards. `power_plan.plan(state,uid)` resolves upgrade identity from the hand instance, rejects pending host actions and duplicate identities, and returns a detached ordered effect plan with base cost/target/Power disposition requirements. It does not spend energy, perform canPlay, move cards, or apply effects. Insufficient energy is deliberately left to the host's dynamic cost/payment checks. No fake payment wrapper is introduced.

The queue regression now additionally uses actual `abyss_snapshot.capture`, installs a pillar, fails on an invalid second Power, restores, and verifies original player/status/hand/card/character-state references and contents. This proves the Snapshot primitive with the isolated queue driver, not public Combat.play automatic rollback. Character status metadata now satisfies actual Actor Power definition validation; strongest-wins still requires custom `zlInstall`, never ordinary intensity gainStatus. Direct ownerEnd rejects an outstanding queued continuation. Shared lifecycle/effect integration remains owned separately.

## Shared paid-dispatch handoff (not yet connected)
`card_effects.lua` exposes the agreed `dispatch(combat,state,effect,queue)` for exact `zhongliCard` installPillar/installRepair effects, rejecting unknown keys/kinds/values. `prepare(state,uid)` binds a detached definition/effect list to the live hand UID and its upgrade flag; `canUse` is only character preflight, not authorization/payment/target validation. Shared Combat must rerun its normal checks and execute only at the paid effect stage. Generated six `power_candidates.lua` proposals set experimental=true for the host's queued path but remain outside the ready catalog. Tests explicitly prove current shared Effects rejects their opcode; no silent registration or fake C.play integration. Actual Queue/Snapshot tests cover these installation effects only, not other effects in mixed cards or full card disposition. Installation prior to terminal continuation and later effect failure stay under the host transaction.

## Isolated jade storage operations
`jade_resource.lua` adds gainJade/spendJade preflight and in-place effect operations against the character-local jade field. Gain caps at 20; spend rejects insufficient balance before mutation and rechecks after preflight, so a stale earlier check cannot authorize overspending. Both require live single-enemy combat and strict 0..20 integral input. The host must preflight before energy payment and execute under its snapshot; no energy/HP/Block/card zone is changed by this module. It deliberately does not register a card effect or intercept any damage. 882 scalar cases plus actual Combat-state Snapshot restore pass. This prepares resource cards without guessing the unresolved absorption/reduction order; it does not make those cards publicly playable.

### Empty-reserve rebuild
The same isolated resource endpoint now supports `emptyJade` for candidates 20/62: only a live jade value exactly zero grants the supplied amount; residual jade (even 1) makes it a no-op. Preflight does not capture the condition, so a preceding gain/spend changes eligibility at actual execution. 441 input combinations, repeated application, intervening gain/spend and malformed quantities pass. This never refunds or charges energy; a real paid no-op remains the host card transaction's responsibility. No card admission, absorption hook, or balance value was changed.

## Native modifier order evidence
`jade_order_probe.lua` now demonstrates the unresolved placement using real native Actor damage and deliberately constrained fixtures. At hit5/jade3 with Torii, pre-modifier spending produces 1 HP loss/0 jade while post-modifier arithmetic predicts 0 loss/2 jade. Buffer at hit3/jade3 keeps Buffer if jade is spent first, versus consumes Buffer and keeps all jade if Buffer precedes jade. Thus this is not merely rearranging equivalent math. The post option is arithmetic, not a fake rewritten event stream; the pre option lowers base only in zero-Block/no-scaling fixtures. `jade-order-results.json` records all five cases and exclusions. Ordinary candidate semantics do not decide these new modifier interactions; no shared hook is installed or order approved.

## Resource card paid-stage handoff: 03/04
`resource_cards.lua` provides detached experimental definitions and live-hand UID/base-upgrade preflight for 03 (2 energy, gain12/16 jade) and 04 (1 energy, spend6 jade then ordinary damage14/18). These exactly preserve candidate values. The first resource effect is dispatched in place; it never charges energy or moves a UID. Shared preflight must reject insufficient jade before energy payment and the resource effect rechecks at execution. 84 identity/version/reserve combinations plus actual Queue/Snapshot exercise the role contract only. Shared owner has scheduled this after its current integration batch; no public payment admission exists here.

04's 14/18 is the existing ordinary damage base, NOT fixed final HP loss. Host queued-play normal use-time capture, modifiers, target binding, death interruption and `useCard` completion must remain authoritative; do not calculate final damage in this module or assume dropping jade changes unrelated damage snapshots. Both sides/target must be live at initial admission. If an intervening trigger ends combat, the host's terminal policy controls whether the resource effect runs; once an effect has legitimately spent jade, a later target disappearance must not create an ad-hoc refund. Any actual command exception rolls back under the whole host snapshot. These interleaving cases require public tests when shared admission is added, and are not claimed verified by the role-only tests. No absorption ordering is needed for these storage operations.

### Public resource acceptance is prepared, not executed
`public-resource-paid.spec.lua` is a pending shared-admission test, not a payment wrapper. It requires real C.play 03→04 within the ordinary 3-energy budget (no refill), insufficient-jade/invalid-target atomic rejection, normal ordinary Strength/Weak/Vulnerable/Block damage, cap20 still paying energy, lethal completion and exact original UID discard. This spec has not passed against a registered 03/04 host; shared owner is still implementing an earlier batch. Mixed-effect pause/exception snapshots must additionally be verified by the shared host's transaction tests before release.

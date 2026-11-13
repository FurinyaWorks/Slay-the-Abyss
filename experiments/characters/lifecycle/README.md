# 四角色 Lua 生命周期接续

基线：`develop 903bf2a31e91f10fb24763ab4cea23d586d0bb83`。只做隔离候选证明，不注册正式职业，不修改共享 Combat，不宣称 75 卡或官方设备验收完成。

## 刻晴 owner-end seam

`keqing-owner-end.lua` 把纯 reducer 包成现有 `abyss_end_turn_powers.prepare` 的 extension，保留 Act3 membership/planner，不替换原 Constricted。extension 是调用栈对象；保存的动作只有 op/turn，状态不保存函数。资源只在实际 action 被执行时提交，未到此阶段的暂停和终局不能提前清资源；重复或跨回合动作拒绝。

冻结 reducer 原件来自刻晴 `c13beefe88ff687ffadf9dee377d443755437ad1` 的 `experiments/characters/keqing/resource-lifecycle.lua`。本目录 fixture 完整复制用于可复现实验，SHA-256 `bfe8e578a88f75b15211716bfa0555296cb7166f7678b8524c87a2dac8f80632`，不是第二份正式实现。

定向测试：

```sh
node --test experiments/characters/lifecycle/keqing-owner-end.test.mjs
```

验证真实 Power planner、ActionQueue、Snapshot、Combat/Actor 组合：
- 计划不消耗，action 到点提交；Act3 Constricted 原 source 身份及真实扣血保留。
- pause/repeated run/abort/resume，资源和 pending choice 原引用还原；继续后只执行一次。
- action 后的注入失败恢复资源、turn marker、能量和队列，允许恢复后重试。
- 死亡、末敌死亡时不运行资源动作；过期 turn 和重复动作拒绝。
- 普通旧角色不带 marker，未注入任何资源；现有 Combat.endTurn 可正常执行。

**验证边界**：fixture 自己装配队列 handlers 与命令 snapshot。没有修改 `ordinaryOwnerEnd` 的固定 Act3 参数，也没有声称覆盖真实 UI 取消或生产 continuation 路由。正式集成还必须连通该参数、动作分发、事务准入、保存读回，并在真实公开命令上验证暂停恢复；不能把此 seam PASS 当完整生产接入。旧角色检查是基线烟测，不是源码变化的差分回归。

## 已协调的阶段合同

| 角色 | 作者冻结点/边界 | 必要约束 |
| --- | --- | --- |
| 甘雨 | 远端 `f6775209e4e4f67adc08993c456d78731fc643d4`，分阶段 planner 待独审 | `bankBeforeDiscard` 只存蓄并清余能；`stormAfterDiscard` 才减 tick、伤害。中间可能弃牌/虚无/抽牌暂停或死亡，不能提前耗冰雨。全命令回滚覆盖两阶段。 |
| 刻晴 | 远端 `6a6f4f2188f89bc569621c2ad9531134a87b1fda` 含上述 reducer | `resolved` 只在成功付费且整张卡真正完成时 exactly-once。`Combat.play` 返回 true 也可能暂停，不能作为完成事件。owner-end 才清附魔/过期雷楔。 |
| 钟离 | 作者 local `1aaa14d32ae808f5d9adea7bf2f801143ddffd7f` lifecycle 待审 | 柱伤→双方仍存活→修补，是显式顺序，不由两个 Power 获取顺序决定。付费安装及队列接口尚在制作；jade 与 Buffer/Torii/Tungsten 的相对伤害时序未定，不能擅接。 |
| 魈 | 作者正制作独立 Lua planner | 面具实际 owner-end 扣 HP→存活才 guard→减时长→自然到期储能；自然到期不得触发主动退出钩子。需真实 loseHp 规则与 Schedule 移除，不以直接改 HP 冒充引擎完成。 |

共享层由统一集成 owner 独占，各作者仅修改角色模块。付款前拒绝不得变更资源，暂停不可重复付款/资源扣除，异常须还原同一图的原引用。正式职业注册、正式候选和设备/用户集中实测仍遵循原门禁。

## 真实公开命令接线候选（后续切片）

`src/lua/abyss_character_owner_end.lua` 仅接受显式 `characterOwnerEnd='keqing'`、`experimentalMechanics=true` 且非 originalV4 的实验状态，要求明确 owner-end marker；没有构造器、职业选择、卡池或正式资源注册。无该字段时返回原 Act3 extension。`abyss_keqing_resources.lua` 是上面冻结 reducer 的相同源码，供共享层调用；fixture 保留原始快照身份。

`ordinaryOwnerEnd` 与事务准入复用该 extension；动作沿原 effect dispatch 执行。公开 `Combat.endTurn` 只对候选状态在遗物阶段之前捕获完整 snapshot，避免已执行遗物/重置卡费与后续资源错误产生半提交。暂停是合法成功，保留原队列；真实 `chooseCard` 的既有 snapshot 保护后续调用。此切片不安装付费牌、角色资源初始化或 UI 入口。

```sh
node --test experiments/characters/lifecycle/keqing-public-end-turn.test.mjs
```

公开命令测试覆盖两回合实际结算、真实 Codex 暂停/重复 EndTurn 拒绝/错误 token 拒绝/失败后恢复原 pending 和队列图/成功续接、遗物先执行后的异常完整还原、资源已提交后敌阶段异常还原、Constricted 先致死及 Omega 先胜利不耗资源。Constricted 测例显式将候选 marker priority 设为 106，让已定义 priority105 的 Constricted 在前；这不是批准正式角色的 Power priority。

旧角色差分使用精确 develop 原 Combat 与 effect dispatch，在同一其余源码上比较 3 类遗物×2回合的完整有序事件及 actor/pile 图（不是只比较哈希或最终 HP）。不是全量 CI、官方导入或所有角色验收。付款完成 hook、正式角色资源的保存初始化、其他三角色正式接线仍未完成。

## 001/002 真实 paid UseCard 接线候选

显式 `Combat.new(...,{candidateLifecycle={kind='keqing',relicEnabled=true|false}})` 才初始化本场资源和 owner-end marker；每个新战斗新建资源，不是职业注册。标记牌需要 `keqingCandidate=true, experimental=true`，当前只允许直接 damage/damageAll/block 与中断压力测试用 scry。未标记攻击在刻晴候选中拒绝，避免混入尚未适配的攻击后静默漏算附魔。普通非候选角色不受影响。

`abyss_keqing_paid_cards.prepare` 在原 QueuedPlay 付款后捕获整牌入场附魔，并在原引擎逐段伤害快照前加每段 +2；只在真正的 `useCard` 完成动作中消费旧附魔一次。它不以 `Combat.play` 返回 true 作为结束（该值也可能是合法暂停）。队列、付款、手牌转移、选择及整体异常回滚仍由原 Combat 管理。

```sh
node --test experiments/characters/lifecycle/keqing-paid-usecard.test.mjs
```

验证 KQ001 6/9 和 KQ002 5/8 两面、费用一次、无能量/无目标拒绝不变、新战资源隔离、末敌死亡仍按共享 UseCard 完成，以及源 Sharp Hide 在 UseCard 前致死不消费。Scry+双段是显式合成压力夹具，不是给 KQ001 增加新设计：真实 pause 保留未消费附魔，恢复后两段各 +2 而整牌只扣一次；恢复期间或初次命令在完成后故障，真实 Snapshot 还原能量、伤害、手牌、pending/actionQueue 和资源原引用。旧角色差分也加入每回合一次真实出牌。

**未实现/不应冒称完成**：003 setup/recast 的清楔/伤害/设楔顺序、004 引爆、初始遗物首次设楔 +4 的卡内反应/致死策略、75 卡、完整存档 ABI、正式注册。遗物 flag 初始化不等于遗物触发已接入。原 JS 来源没有卡内反应模型，不能把 `Resources.resolved` 一次性结果当作 003 的逐步正式时序；当前只交付无此歧义的 001/002。

## KQ003 staged paid candidate (not formally enabled)

`keqingCandidate=true, keqingStage='003'` uses a canonical single damage face
(5 base / 7 upgraded) and the actual paid queue. The frozen pure planner is
copied from character snapshot `765268f28f22d7f73ef797d9b4082e168839ead8`.
Each stage is bound to turn, real limbo UID and accepted-use ordinal from the
engine's combat use history. Payment and history are owned by the existing
snapshot; rollback removes that ordinal and every action generated from it.
Setup queues captured damage then wedge creation. Recast consumes the wedge,
queues captured release damage, then records a deferred refresh. The actual
UseCard boundary consumes the old infusion once, applies a refresh only if its
stage executed, and queues the initial relic's fixed 4 block only after a
completed setup. No post-return wrapper is used. Different uses of the same
UID receive different ordinals; phase cursor rejects stale or duplicate stages.

**Terminal semantic HOLD:** existing host allow rules are unchanged. The new
resource op is not retained after victory, so a setup killing the last enemy
does not create a wedge or fire its relic. Recast kills do not execute deferred
refresh, while retained UseCard still consumes old infusion. Player death
stops subsequent resource actions and completion. This is intentionally NOT
claimed equivalent to the isolated JS model's after-whole-play outcome check,
and blocks formal registration until the product contract is decided.

`keqing-staged-usecard.test.mjs` runs real C.play, the 12 base/upgraded × old
infusion × setup/recast combinations, fixed/repeat relic, controlled same-UID replay with a new accepted
use ordinal (not a natural acquisition test), terminal boundaries, damage-reaction death, complete paid rollback, and
synthetic real Scry pause/resume/failure rollback at a staged boundary. The
synthetic interruption is test-only and is not an extra ability on KQ003.

## Ganyu 03/06 paid-only vertical slice

The initial paid-only slice used explicit
`candidateLifecycle={kind='ganyu',relicEnabled=false}` and did not wire banking
or storm ticks. The later lifecycle section below supersedes that limitation. Only candidate chargedShot/charge definitions marked
`ganyuCandidate=true, experimental=true` are accepted; there is no class,
reward pool, starter relic or ready-catalog registration. Source role modules
are copied from reviewed `57e5707f` (resource require path alone adapted).

Both public C.play and automatic card resolution apply the same candidate
eligibility and active-target gate. Real payment and limbo UID happen before
preparation. A turn/UID/accepted-use-bound `ganyuPaidStage` invokes the role
adapter under the existing complete-command Snapshot; source damage/bloom
remain actual native queued effects with use-time normal damage capture.
The consumed charge is not silently refunded when later reactions kill the
player, but an actual exception restores the complete original graph.

`ganyu-paid-usecard.test.mjs` runs the author's 14 public C.play cases plus
native damage failure, actual Scry continuation and resumed failure rollback,
free automatic use and native/unmarked rejection, target lifetime validation,
extra-metadata rejection, real thorns stopping queued bloom, and no-candidate
constructor compatibility. Synthetic pause insertion is test-only, not an
additional Ganyu skill. No bank/storm, relic or complete-character claim.

## Xiao x01/x04 paid-only vertical slice

Explicit kind `xiao` initializes the per-battle resource, first-entry relic flag
and private xiao_mask Power definition. Reviewed role modules are copied from
`3c72f61e` unchanged; only x01/x04 canonical definitions/effect records are
accepted by the host gate. Other role plans/data remain unreachable through
this candidate admission. There is no ready catalog, class or reward registration.

The same actual-instance `cardId` gate and HP prerequisite cover manual and
automatic uses. Real native loseHp occurs before maskCommit; the queued role
commit and actual relic draw are protected by the shared whole-command
Snapshot. Turn, accepted-use ordinal, UID and cursor guard the private stage.
Inactive selected targets fail preflight; targets invalidated after acceptance
are skipped like native damage rather than refunding a successful paid command.

The author's public C.play base/upgrade/payment/HP/UID/relic/exception tests
run against src modules (no experimental package-path shadowing). Additional
real-queue checks cover autoplay rejection, resumed Scry faults, exact aliases,
extra metadata, dead/escaped targets, post-use powers and target invalidation.
Synthetic pause/invalidation actions are test-only, not authored character skills.

**Lifecycle boundary:** owner-end mask loss/expiry and reserved-energy turn-start
are not wired by this batch. Intangible uses the native loseHp reduction (2 to
1), differing from the JS proposal. These remain explicit design/integration
HOLDs; this is not a complete playable character or lifecycle approval.

## Zhongli zl21/zl31 paid-install vertical slice

Explicit kind `zhongli`, `relicEnabled=false` initializes an isolated candidate
record (`jade=0,lastOwnerEnd=0`) and private pillar/repair status definitions.
The host accepts only these two canonical Power effects, from actual instance
UID/upgrade identity, in an active single-enemy battle. The reviewed 28dc5f81
`dispatch` endpoint is extracted unchanged apart from its lifecycle require
path; its hand-only planner/preflight wrapper is not used as payment authority.
The corresponding lifecycle module is copied unchanged. Shared admission owns
dynamic costs, manual/automatic gates, and complete-command snapshots.

Real C.play spends two energy, installs through the actual Power Schedule,
and uses the existing Power disposal boundary (does not put the instance into
discard/exhaust). Strongest-wins refresh preserves one schedule slot. Tests
cover base/upgraded faces, actual second-UID paid reuse, unpaid/invalid UID
rejection, automatic free play and native/unmarked rejection, strict metadata,
post-install failure and Scry continuation rollback retaining external aliases.
The controlled energy refill in a repeat-install test is fixture setup, not a
claim of natural card acquisition.

Owner-end pillar→repair execution, Jade interception and starter relic are
NOT wired by this batch. `relicEnabled=true` is rejected. No ready catalog,
formal character registration or full lifecycle approval is implied.

## KQ004 dynamic wedge finisher

`keqingStage='004'` accepts the precise native placeholder damage face
4×2 (upgraded 5×2); extra effect fields or another hit count fail closed.
The copied c1677216 pure plan generates two captured same-target hits followed
by a **live-wedge gate**. Only when that third stage actually executes does it
inspect current wedge presence, consume it, then enqueue captured native AoE
4 (upgraded 6). Every hit uses the same entry-time infusion bonus; only the
source UseCard completion consumes one old infusion. No new infusion or relic
is granted. Captured payloads are additionally compared against detached saved
captures, including target and all-enemy amounts, before they can execute.

The author's 24 public scenarios plus real reaction deaths, source final
victory behavior, automatic free plays, actual Scry pause/resume/failed-gate
rollback and corrupted/replayed stage rejection are covered. Tests that flip
wedge/Strength during a synthetic pause are explicit controlled fixtures for
execution-time gate and use-time damage capture, not authored extra actions.

**Terminal HOLD remains:** when the first hits end combat, the current host
skips the resource gate and retains the wedge; retained UseCard still consumes
old infusion. If the gate executes and a later burst reaction kills the player,
the wedge stays consumed but UseCard consumption is skipped. These observed
host policies are not declared equivalent to the isolated JS post-play model.


## Ganyu actual end-turn lifecycle

The explicit Ganyu candidate now accepts either boolean relic option. Its
whole public C.endTurn command uses the same complete Snapshot boundary as
Keqing, including relics before the normal resolver; actual Codex pauses keep
the existing continuation. Other actors/Act3 retain their original routes and
order. No new global/formal character registration is introduced.

After existing player-end powers/cards finish, a queued bank action snapshots
unused energy into charge (only with its starter relic), clears energy, and
records that turn. Native ethereal exhaust/discard and their actual hooks run
next. Only if combat survives does a separate queued storm action decrement
the field once and enqueue native AoE, before enemy actions. Death or victory
before a phase prevents that phase, rather than retroactively awarding it.
The existing pure resource guards enforce bank/tick sequencing and duplicates.

Tests include the author's five actual public commands, an exhaust-draw witness
requiring n=1 on the original turn with the original dazed instance already in
exhaust, bank/exhaust and late next-turn failures restoring full aliases,
pre-bank death, discard-trigger victory skipping tick, storm-reaction death,
and a wider parent-owned Snapshot capability consumed exactly once. The shared
03/06 role capture ABI is also updated from independently reviewed 66ee41b3:
integers only, complete known-enemy map, no metatable or unexpected enemy IDs;
real C.play corruption probes restore the initial graph.

This wires lifecycle for explicit experimental state; it does not populate the
full 75-card pool or approve final character balance/terminal design choices.

Ganyu Ice Cream compatibility correction: a disabled starter relic advances the
bank phase marker without modifying energy. Native Ice Cream therefore retains
2 unspent energy into the next turn (5 total), exactly as the unmarked baseline.
The enabled candidate consumes all remaining energy even at charge cap (3 next
turn), matching the source candidate's documented overflow discard. This is a
candidate compatibility assertion, not final balance approval for the combination.

### Zhongli public owner-end candidate

The explicit single-enemy, relic-disabled Zhongli candidate now executes the
installed pillar/repair pair through ordinary owner-end extension scheduling.
First installation records the legacy owner-end acquisition list as well as the
strict Power schedule. The pair anchors to pillar when present and always queues
pillar before repair, independent of acquisition order. Existing Act3 callbacks
are delegated unchanged. Only a correctly bound pending repair cleanup can run
after termination; it never gains jade unless both actors remain active.

Public tests cover 24 paid-install/base/upgrade/order/HP/Block combinations,
real Codex pause and failed resume, faults after actual pillar damage and in the
following start turn, and full public-object alias restoration. A controlled
native HP-loss injection between pillar and repair tests dead-source cleanup;
it is not a claim that fixed pillar triggers Thorns. The separate actual Thorns
test confirms native fixed-damage non-attack behavior. No jade damage interception,
starter relic, multi-enemy expansion, catalog registration or final balance
approval is added. Full CI has not been run.

### Xiao defense and active exit paid candidates

The canonical gate now additionally admits x02 (native block) and x06 (zero-cost
active mask exit plus native block and exhaustion). Canonical candidate IDs with
missing candidate markers fail closed even when all effects are ordinary block;
manual and automatic entry share that rule. x06 cannot drop its exhaustion flag.
Public base/upgrade tests use real constructor/draw entities and payment/UseCard,
check Schedule removal, empty exit and fault rollback. Additional automatic
normal/override/unmarked cases and a controlled real-entity Scry arrangement test
resumed exit rollback and exactly-once retry. No owner-end or start-turn hook is
newly enabled for Xiao, and the Intangible HP-payment design HOLD remains.

### KQ043 native intermediate discard continuation

Experimental skill KQ043 uses strict `keqingStage='043'`, `target='SELF'`, and one
`keqingDiscard` effect containing only its base/upgraded block value 4/7. Its
candidate source base cost is 1; the real host remains authoritative for dynamic
costs. Paid preparation expands to native draw1 → requestDiscard1 → block, with
normal use-time block modifier capture. Ordinary direct draw/discard/block still
fails the pre-existing `discard_must_end_card` rule; no global restriction was
relaxed. Revealed choices cannot be cancelled into a pre-draw state: invalid
choices, replayed tokens, further plays and end-turn refuse without mutation.
Errors before revelation restore the full payment/draw/shuffle preimage; errors
after revelation restore the paused choice, paid UID, RNG and public aliases.

Actual trigger probes establish Tactician TOP energy before block, and Reflex
BOTTOM draw after the completed UseCard while pendingPlay still awaits queue-tail
cleanup. No Draw/empty and one-card hands follow native automatic discard. A
controlled draw-time native HP-loss injection verifies terminal suppression of
choice and block. Use-time block capture follows the host contract; it is not a
claim of equivalence with the research engine if intervening reactions change
Dexterity/Frail. That interaction remains a design HOLD. No formal registration
or full-CI result is claimed.

### Zhongli 03/04 paid resource candidates

Explicit single-enemy Zhongli now admits canonical zl03 (2-cost jade gain12/16)
and zl04 (1-cost spend6, then ordinary damage14/18). The actual original 3 energy
is sufficient for the pair; the author spec does not refill between them. The
host checks resource sufficiency before energy payment and the copied reviewed
jade reducer checks again at effect execution. The native attack retains original
use-time modifier capture, Block, reactions and terminal disposition. Storage at
cap remains a paid no-op. Incoming jade absorption is still not hooked.

The shared adapter does not call the role's hand-only preparation from an already
paid context. It binds real pending/cardInUse UID, turn and use ordinal and compares
a detached saved resource effect before dispatch. Tests include gain/spend and
after-native-damage faults, public graph aliases, automatic admission, actual
Thorns death without resource refund, and a controlled real-entity Scry window
between payment and spending. A failed resumed spend restores the revealed pause;
a deliberately changed insufficient balance is rejected again before consumption.
No formal registration, multi-enemy support or incoming mitigation policy is added.

### Ganyu 05 paid field-to-lifecycle loop

The explicit candidate accepts the reviewed `ganyuStorm` namespace with only
amount4/6 and turns2. The shared paid stage validates the actual upgraded face,
binds pending/cardInUse UID, turn and accepted-use ordinal, and compares a detached
payload before invoking the reviewed storm adapter. There is no immediate damage.
Actual subsequent C.endTurn calls execute the existing bank/discard/storm phases
and expire the field after two ticks. Lower-strength paid refresh keeps the higher
amount while refreshing duration, matching the candidate pure planner.

Public tests exercise base/upgraded two-tick loops, insufficient energy/replayed
UID, the actual starter-relic constructor option, natural next-turn refresh,
setup failure and a controlled real-entity Scry pause with resumed setup failure,
public alias restoration, and free automatic admission/rejection. The 03/06 paid
payload now uses the same detached equality guard; existing paid/lifecycle tests
remain required. These are opt-in definitions, not formal class/catalog release;
prior balance and dynamic reaction HOLDs are unchanged.

### Xiao public mask end and reserved-energy start

The explicit Xiao candidate now delegates actual ordinary owner-end mask actions
to the reviewed `70ac4c35` adapter, preserving Act3 planning. The host includes
this candidate in its full end-turn Snapshot boundary. Real HP loss occurs before
surviving guard, duration decrement and natural-expiry storage; lethal payment
never grants those rewards. The exact `eaae00b0` start adapter (energy only, not
later CalmDraw) runs after base recharge/onEnergyRecharge actions and before the
normal draw. Reserved energy is cleared and turn-stamped once through the real
queue. No new mask abilities or Calm cards become available.

Actual public x04→three end-turn tests distinguish base expiry survival from the
upgraded extra lethal turn at starting HP8. Additional tests explicitly seed
expiry/guard with test-only status definitions (not acquired production cards),
then observe real before-enemy guard and next-turn energy-before-draw. They cover
Codex reveal/resume failure, next-turn failure, post-HP-payment reward overflow,
start-energy overflow, duplicate start rejection and lethal/no-reward boundaries.
Whole-command rollback preserves HP, resource and public aliases. Native
Intangible still changes the nominal 2 HP loss to 1; this research-parity/balance
HOLD is intentionally retained, not bypassed. Formal character registration and
full CI remain outside this slice.

## Zhongli 20/62 paid empty-jade slice

Explicit candidate-only zl20 (9/12 empty-jade) and zl62 (6/8 empty-jade,
then native draw 1/2, mandatory exhaust) now reuse the existing paid UID wrapper.
Nonempty jade is a legitimate paid no-op. Native draw, hand cap, empty draw/discard,
and UseCard exhaust remain engine-owned; no incoming-damage absorption is added.
The author matrix runs 24 cases (two cards × two faces × three jade
levels × two hand sizes). Additional real C.play checks cover post-draw failure
rollback including RNG/pile aliases, Scry revealed-boundary failure/retry, no
energy/missing exhaust, and manual/automatic mutated-op/tail rejection. Test pile
rearrangement and synthetic Scry insertion are controlled fixtures, not natural
card acquisition claims. No class/catalog registration or full CI is implied.

## Keqing 044 bounded inspect candidate

044 is a strict experimental skill/exhaust face (`keqingInspect` 3/4), not Seek
or Scry. After real payment it offers only the top 3/4 draw UIDs, top first,
selects exactly one into hand, and leaves every other draw instance in original
order. Empty draw, NoDraw, or full hand at effect execution skip without shuffle;
a single available card moves automatically. Public `C.choosePile` continues the
same paid queue with token/generation and complete ordered pile graph checks.
Selection-time NoDraw/capacity or graph changes reject rather than regenerate an
offer. A revealed choice cannot be cancelled or replayed; faults restore either
the pre-payment boundary (before play returns) or the already-paid offer boundary
(on choose), including original pile, pending, RNG and queue aliases. This is a
candidate-only mode; no formal character/reward registration or balance approval.

## Zhongli 19/24 resource search candidates

Only two additional canonical specs are admitted: 19 costs the source catalog's
2 energy, gains jade 6/8, draws 2/3, exhausts; 24 costs 1, spends jade 3, draws
3/4, exhausts. Ordinary dynamic cost remains authoritative. Both reuse the
existing paid stage and native draw/UseCard; no new resource opcode or absorption
is introduced. Public tests cover 24 resource/upgrade/hand scenarios and four
empty-pile cases, NoDraw, real FNP/DE exhaustion, a post-DE fault restoring the
whole pre-payment graph and aliases, Scry resume failures and automatic gates.
Explicit test power injection and pile fixtures are not claims of natural power
acquisition. Formal registration and incoming-jade interception remain closed.

## Zhongli 16/57 paid native defense candidates

16 spends jade 6 then uses native block 16/21; 57 spends jade 3 then native
Weak 3/4 on the validated living enemy. Both source costs are 1 (ordinary dynamic
cost remains authoritative). The sole target condition is now keyed to canonical
ENEMY targeting, covering Weak as well as the earlier attack. Exact native tail
shape is required. Tests execute 84 jade/face scenarios, zero-energy and target
rejections, Dexterity/Frail, Artifact consuming Weak without refund, post-native
fault rollback, Scry/resume balance recheck and automatic gates. Controlled native
life-loss injected after spend verifies terminal interruption without refund;
this is not an invented natural reaction for shield/Weak cards. Jade incoming
absorption and formal registration remain disabled.

## Ganyu source-bound ordinary 22 candidates

`abyss_ganyu_native_definitions.lua` is the exact generated definition file from
reviewed b0c9ca7f (source hash/version retained). The explicit
`abyss_ganyu_native_cards.definitions()` factory adds experimental markers only;
it never mutates the global card/reward/class catalog. Both manual and automatic
admission now receive the real instance and validate its canonical ID, upgraded
face, exact effects/type/target/exhaust/selfRetain and Ganyu candidate state.
Ordinary dynamic costs remain engine-owned. Preparation runs after real payment,
checks limbo UID, and returns the native effect sequence unchanged to QueuedPlay.
There is no bonus resource or after-return completion callback.

Author native suites are adapted to the explicit factory and
candidateLifecycle={kind='ganyu',relicEnabled=false}: 50 ordinary/retain cases,
8 modifier/exhaust/NoDraw and 2 real failure/alias cases. Extra tests cover 44
free automatic plays, 44 noncandidate refusals, malformed definitions, paid
prepare rollback and terminal native outcomes. FNP/DE tests explicitly register
native exhaust power order, not just untracked status fields. Printed costs in
these source definitions are tested, without replacing dynamic-cost semantics.
Terminal damage-then-block remains native; damage-then-draw may stop at victory.
No natural rewards, UI selection, production registration or balance approval.

## Explicit Ganyu Run propagation

Run.new(data, seed, {experimental=true, candidateLifecycle={kind='ganyu',
relicEnabled=false}}) now preserves a private validated context; true starter
relic is also accepted. This first Run slice supports only Ganyu, rejects formal
character/profile mixtures and competition runs, and never infers role from a
card ID or deck. Each actual startEncounter validates/clones the context into
Combat.new, resetting battle resources rather than carrying the old combat graph.
The opt-in start command has a whole-Run Snapshot around creation/publication;
default Run startup remains the unchanged path.

Tests use explicit fixed reward fixtures (not natural pools), claim an upgraded
card, preserve master deck UID across later battles, then execute Run.play so
permanent data and terminal reward publication share its real transaction.
Failure after real finishCombat restores the original Run/combat/config/deck and
resource references. Start creation failure also restores original aliases.
No new save format, production character selector, natural reward registration,
or blanket approval of all 75 cards is implied.

## Zhongli explicit single-enemy Run

The same private opt-in context now also admits kind='zhongli' with
relicEnabled=false only. Encounter creation rejects multi-enemy fights before
battle publication, preserving the existing limited paid/lifecycle boundary.
No jade absorption or starter relic is enabled. Real Run commands pay for
03/21/31 over consecutive turns, then a fixed upgraded 04 reward keeps its master
deck UID through two further battles. Every new battle resets jade, pillar and
repair Power state. Run.play failure after actual reward publication restores
the original entire Run/combat/config/deck/resource graph, and startup failures
restore the original context. This is explicit fixed-deck/reward validation,
not automatic production class or natural-pool registration.

## Xiao explicit Run propagation

The private Run context additionally accepts kind='xiao' and an actual boolean
relicEnabled. Existing 01/02/04/06 card gates are unchanged; the remaining source
bridge definitions are not thereby enabled. Fixed rewarded upgraded 01 retains
its master UID across three actual battles. New battles clear mask, reserved
energy and used-starter state while retaining the selected relic option. True
Run.play lethal reward-publication faults and candidate start faults restore the
original whole graph. A controlled fixed starter/hand fixture also executes
paid 04 entry, actual Run.endTurn mask payment, and paid/free06 exit/exhaust.
Native Intangible blood-cost and native shield differences remain design HOLD;
this change does not introduce natural reward pools or formal class registration.

## Ganyu seven conditional paid cards (explicit experiment)

Adds source-bound 17/19/35/32/41/42/45 through
`abyss_ganyu_paid_cards.conditionalDefinitions()`. The source definitions are copied
unchanged from the reviewed conditional compiler (SHA256
`e884c631205f9685e71347bf1a12f6d15e2b0a27e9d09e0cdf38c194a6dd71b4`).
The reviewed role adapter captures NORMAL damage/block at accepted use time,
selects the branch from execution-time resources, and runs native queued effects.
The host binds canonical live card ID/base-upgrade face, paid UID/turn/ordinal and
detached capture payload, with the existing full command Snapshot. It does not
recompute modifiers after a choice or move resource consumption outside the queue.

Targeted actual tests: 84 public C.play combinations, 14 fixed-reward Run.play
chains, native-damage failure full-graph rollback, real Scry continuation with
live-resource/frozen-modifier checks, aliases/retry/replay, and automatic admission.
This extends Combat support to 32 Ganyu cards, not 75 or a registered character.
Fixed rewards are not natural reward-pool evidence; source starter/catalog work is
separate. Proposed types, balance, ordinary terminal semantics and formal release
remain HOLD. No full suite or production registration is claimed.

## Zhongli dynamic encounter safety restriction

The single-enemy experimental lifecycle cannot handle a later split/summon.
Actual large acid/spike slime entry is now explicitly refused with
`unsupported_zhongli_dynamic_encounter` before relic opening or Combat creation.
The Run remains unchanged and the requested encounter is not silently replaced.
A second guard checks the actually constructed actors before first-turn effects,
covering source/prepared encounter replacement under the whole-Run snapshot.
Native split metadata and known summon effect operations are rejected as well.
This is a safety restriction, NOT multi-enemy completion or a complete ordinary
map: pillar target semantics and dynamic multi-enemy lifecycle remain unresolved.
Ganyu and ordinary Run behavior are not subject to this Zhongli-only restriction.

## Explicit Ganyu starter launcher

`require('abyss_ganyu_starter_run').new(data, seed)` constructs the experimental
Run from a private generated starter source, not caller-supplied metadata. It
uses HP60, energy3/draw5/maxHand10 and the source ten cards (01×4,02×4,03,04).
Definitions enter the existing catalogue legally with `ganyu_candidate` color and
real `ganyu-XX` source IDs. No STS source identity is fabricated and all four
formal 75-card provider contracts are unchanged. No post-constructor card
injection is used by the launcher.

The inherited Burning Blood is removed. The bank-unused-energy starter effect
is represented by the existing explicit `relicEnabled=true` experiment option
and provenance metadata; it is NOT an inventory relic with removal/replacement
support. No menu character, natural reward pool or formal registration is added.
Actual constructor/start/end/play tests cover all four starting card kinds,
bank-funded shot, no inherited victory heal, cross-battle resource reset and HP/
deckUID carryover, private input isolation, formal catalog counts and an exception
after actual Run construction. Card hand placement remains an explicit test
fixture, not a natural draw guarantee. Source types and balance remain HOLD.

## Xiao x05 source starter paid slice

The canonical paid gate now includes x05 (base6/up9 normal single-target damage;
while masked, base+4 group damage). It reuses the existing reviewed first-eight
bridge/dispatch, not a new execution wrapper. A target that becomes inactive
before an unmasked stage is skipped without refund or retargeting. The source
starter factory in the acceptance fixture uses HP70, ten source cards and the
existing virtual starter relic; no formal character selector is registered.

Actual source-starter Run tests cover base/up × real paid x04 entry/no mask,
public x05 payment and original UID disposal, invalid/unmarked refusal and
whole-Run exception recovery. Host tests add 16 automatic-admission combinations
and a real Scry continuation whose native group damage failure restores the paid
revealed graph/aliases and retries once. This raises the admitted Xiao set to
01/02/04/05/06, not all75; native HP/Intangible differences and balance remain HOLD.

## Keqing explicit Run and source starter

Run candidate context accepts `kind='keqing'` with a strict boolean relic switch;
no role is inferred from card IDs. `abyss_keqing_starter_run.new(data, seed)` uses
the reviewed source-starter module (0da3c2b5, source89d898c): HP60, energy3/draw5,
hand limit10 and ten unupgraded one-cost cards (001×3,002×4,003×2,004×1).
It clears inherited Burning Blood and enables the existing first-successful-setup
fixed4-block virtual relic. No inventory relic entry/removal/replacement or
formal class/natural reward pool is introduced. The source types remain HOLD.

The actual Run test performs setup/recast/burst, checks the original one-cost
payment and single fixed4 trigger, carries upgraded reward deckUID and HP through
three encounters, resets infusion/wedge/relic usage, and tests stage, reward
publication and late Combat initialization exceptions against the whole Run
snapshot and original aliases. Hand placement and fixed rewards are explicit
fixtures, not natural deck draw or reward generation evidence. Existing terminal
resource behavior and balance HOLDs remain unchanged.

## Keqing006/007 paid defense stages

`abyss_keqing_paid_cards.defenseDefinitions()` exposes two explicit candidate
skills (cost1, SELF, no exhaust): native block5/up8 first, then an actual queued
resource stage. 006 consumes an execution-time wedge for a second block5; 007
consumes one execution-time infusion for block4. Without that resource the first
shield still works and the card is paid/discarded normally. Skills do not incur
an additional attack infusion decrement and neither action triggers setup relics.
Both shields independently use ordinary native Dex/Frail block capture; second
shield modifiers are captured at use time, while resource availability is read
when its queued stage runs. This timing is explicit host behavior, not a claim
of equality with JS models lacking intervening reactions; design remains HOLD.

The stage binds accepted ordinal/UID/turn, detached action and captured payload;
manual and automatic admission validate real card ID and strict boolean upgrade.
Actual tests cover16 base/up/resource/modifier combinations,12 automatic cases,
real Scry boundary/failure/alias retry, controlled native death after first block
(no resource consumption or extra relic), and four fixed-reward Run.play chains.
No natural reward pool, full75 registration or production menu is enabled.

### Ganyu explicit finite reward domain (2026-11-13)

`abyss_ganyu_reward_run.new(data, seed)` is a closed opt-in experimental launcher.
It keeps the source-bound HP60/10-card starter and virtual starter equipment,
prepares all 32 already-admitted definitions before Run construction, and routes
CardPool reward generation to 30 source-rarity-eligible cards (2 basic excluded;
10 common, 19 uncommon, 1 rare). Formal color catalogs and source reward/shop
pools are unchanged. This is not formal character registration or shop support.

Sampling retains each rarity roll and offset transition, but draws without
replacement from that rarity's remaining candidates. An exhausted rarity skips
that slot, without a rarity reroll or substitution. A boss rare-only offer may
therefore contain one card, including with Question Card. A zero-card result
raises `experimental_candidate_reward_empty`; Prismatic raises
`experimental_candidate_prismatic_unsupported`. The provider never mutates Run
RNG directly, and public Run callers retain their existing transactions. These
are explicit experiment limitations, not source-game sampling or final balance.
The marker routes all existing CardPool entry points (combat/event rewards,
extra Prayer Wheel groups, Tiny House/Orrery and Dream Catcher rest callbacks);
it does not change independent shop inventory generation or random transforms.

The generated-reward test uses 12 fixed seeds and never edits generated identities
or upgrade bits: real victory sampling, close/reopen, claim, persistent deck UID,
next battle and real Run.play. Victory and next-hand placement are fixtures;
observed distinct IDs are reported rather than claiming all30 were sampled.
Focused boundary tests cover rare short offers, finite common exhaustion,
zero/Prismatic rejection, repeatability, whole-Run publication rollback with RNG
and object identities, formal pool equality, and caller-source preservation.

### Keqing reviewed-eight equal-weight research acquisition

`abyss_keqing_reward_run.new(data, seed)` adds only the reviewed source-native
005/009/019/034/052–055 definitions before real source-starter Run construction.
It explicitly opts into `keqing-reviewed-eight-v1`; starter and other paid cards
are not silently added to its reward allowlist. Definitions retain special/HOLD
rarity and exact reviewed source semantics (070c116d), including upgraded values
and 055 exhaust. The complete source object is checked before each offer.

This research-only domain samples equal-weight identities without replacement,
up to the requested reward count or eight available identities. It does not roll
or change rarity offset and does not fabricate common/uncommon/rare. Boss offers
use this same explicitly limited domain, not a false rare classification. Upgrade
bits use the existing act chance after identities have all been selected. Short
offers, zero-offer failure and Prismatic rejection use the explicit experiment
contract; formal catalogs, reward/shop pools and default Runs remain unchanged.
The shared CardPool routing also reaches previously scoped relic/event callbacks.

Tests exercise eight fixed seeds' genuinely generated identities, actual claim,
permanent UID and next Run.play (controlled victory/hand placement), full-source
flag rejection, bounded exhaustion, zero/Prismatic failure, post-sampling whole
Run/RNG/alias restoration, repeatability and formal pool preservation. This is
not official rarity, natural map balance or a complete 75-card release.

### Ganyu resource draw30/33/43 paid continuation and explicit35 domain

These three reviewed uncommon definitions use the same paid UID/turn/play ordinal
and detached-payload binding as the prior Ganyu slices. Resource conditions are
read at actual custom-stage execution: 30 consumes full charge, 43 consumes one,
33 observes but does not consume the storm. Resource consumption precedes native
draw; NoDraw, hand capacity and empty piles do not refund resource. Native queue,
reshuffle RNG, 33/43 exhaust and FNP/Dark Embrace remain engine-owned.

`abyss_ganyu_draw_reward_run.new(data,seed)` is a new closed experimental launcher
with35 reviewed definitions and33 source-rarity-eligible rewards. The existing
32-domain launcher is unchanged. The finite same-rarity/short-offer/zero failure
and Prismatic-refusal policy is reused, not a formal pool/rarity change.

Targeted checks include144 actual public C.play resource/face/draw-limit cases,
6 fixed-offer permanent UID→next Run.play cases, six genuine reshuffle failures,
revealed Scry continuation and live-resource decisions with full alias rollback,
36 auto/strict-gate cases, and controlled pre-stage death. Generated acquisition
uses12 fixed seeds without replacing offers; encountered IDs are reported, not
claimed to cover every new card. Source derivation is reviewed dfaba927 draw ABI
and8b0bf853 generated definitions. Fixed offers/hand placement/death injection are
explicit fixtures, not ordinary gameplay balance certification.

### Zhongli source starter and virtual battle-start jade3

`abyss_zhongli_starter_run.new(data,seed)` is a closed experimental launcher:
source60HP/3energy/5draw/hand10,01×4/02×4/03/04, no inherited Burning Blood.
01/02 now have strict marked native paid admission, preserving ordinary damage
and block.03/04 retain existing reviewed resource stages. Source provenance is
zhongli-mechanics-0.41.0 model/battle digests embedded in the private manifest;
all content remains HOLD, not a formal class or reward-pool registration.

Explicit Zhongli lifecycle equipment now accepts a strict boolean: true creates
exactly3 jade in every fresh combat, false preserves previous0 behavior. This
models ONLY the already-defined battle-start part of virtual zl-relic01. There
is NO jade damage absorption, no inventory replacement/removal integration and
no implied Buffer/Torii ordering decision. Native incoming damage still changes
HP while jade is untouched. Single-enemy/dynamic-growth admission remains closed.

Tests cover source10UID composition, real3-energy03→04, normal01/02 faces and
strict manual/auto rejection, true/false initial resources, cross-battleHP/reset,
postnative and post-init wholeRun rollback, formal75×4 and caller preservation.
A fixed harmless enemy additionally permits all10 source deckUIDs to be naturally
drawn/paid across recharge/reshuffle without moving cards or granting energy;
that is an execution/identity proof, not survival balance. An actual11th instance
proves native hand10 truncation. The former relictrue refusal test is intentionally
replaced by malformed-type refusal; existing false-mode regression remains.

## KQ039/049 native support and reviewed-ten research rewards

`abyss_keqing_support_reward_run.new(Data, seed)` is a separate closed experimental
launcher. It retains the source starter and adds KQ039/049 to the reviewed-eight
catalog and equal-weight research offer domain, marked `keqing-reviewed-ten-v1`.
The old reviewed-eight entry and formal reward/shop pools remain unchanged.
Both new cards preserve source `special`/HOLD metadata, not invented formal rarity.
The ten-card domain samples identities without replacement, caps oversized offers,
rejects zero offers and Prismatic, and checks full source definitions before issuing
rewards. Boss offers are research offers, not an approved rare-card distribution.

The paid gate admits only canonical KQ039/049 base/upgraded native effects, real
boolean face and candidate markers. It does not generally permit nextBlock or
escapePlan on other Keqing candidate cards. Costs still use the native dynamic
cost path. KQ039 uses ordinary block now and native captured next-turn block;
KQ049 uses native drawWithFollowup, granting the captured normal block only if
its actual draw is a skill. NoDraw and an empty pool grant no such shield.
Skill play does not consume attack infusion or wedge. No new global turn flag
or effect handler is installed. Source projection is the reviewed 3c3547ef module
from candidate 89d898c; modifier timing is host native behavior, not new balance
approval.

Targeted test entry: `keqing-support-usecard.test.mjs`. It covers native modifiers,
one-time delayed shield, post-native shield/install rollback with original aliases,
strict manual/automatic gates, four actual obtain-to-natural-draw paid acquisitions,
and eight controlled-victory generated-offer claim-to-next-Run.play paths. The
latter place the claimed card in hand and grant energy solely to test settlement;
they are not natural-map or all-ten acquisition coverage. The initial test fixture
incorrectly removed the source card from the end of hand when arranging a draw;
it was corrected to select a non-source UID, without weakening the assertion.
Formal registration, UI selection, natural full-run balance and device acceptance
remain HOLD.

## Ganyu retrieval 10/25/39/48 and isolated 39-definition domain

`abyss_ganyu_retrieval_reward_run.new(Data,seed)` is a new closed experiment,
39 executable definitions / 37 eligible rewards. Old 32/30 and 35/33 launchers
remain separate. All four source cards are uncommon, cost 1 / upgraded 0;
10 discards normally, 25/39/48 exhaust through native UseCard.
The source definitions are byte-identical to reviewed d7a98e72
(SHA256 `03594a785902256166298afe0d6673e1419a411ff4a86ead5ada974838646ecd`).
Reviewed retrieval ABI SHA256
`b1e5cc16718f13b0ecff0e207cdde27925943da3c38a987733aa8cb8cef1fbab`
is copied with only the queued-card import moved to the shared module.

Retrieval scans the current selected zone in its existing array order. 10/25
select the first ganyu_lab_03 in draw/discard; 39 selects the first direct
storm definition; 48 selects the first direct charge definition. It moves the
original instance to hand, preserving UID/upgraded state and all remaining order.
It is not native draw: no draw RNG, onDraw trigger, reshuffle, or NoDraw veto.
Payment may free a hand slot; capacity is independently rechecked when the paid
stage actually executes. The source card remains in use and cannot retrieve itself.
No new generic selection API or hidden-pile UI is added.

The native paid host retains strict source face/effect/marker/exhaust validation,
immutable detached payload, paid UID/turn/play ordinal, terminal interruption and
whole-command Snapshot including revealed Scry boundaries. Tests distinguish
controlled full-hand pile fixtures from an actual Scry pause followed by a full
hand at execution; the latter uses extra constructed UID instances, not obtained
rewards. Transaction tests inject faults after real toHand and after resumed
retrieval, restore the original references, and retry once. Fixed-offer eight Run
cases cover both faces; generated 12-seed cases do not replace reward identities,
but use controlled victory and acquired-card hand placement, not natural-map play.
The first combined wrapper expected the wrong Run PASS label despite its eight
Lua cases succeeding; the wrapper marker was corrected before the final rerun.

Reward sampling reuses the reviewed same-rarity finite provider: short rare boss
offers, no cross-rarity fallback, explicit zero-offer/Prismatic failure, full
source comparison, and unchanged formal reward/shop pools. New cards are not
in the old 35 domain. Explicit Lua acquisition is not formal UI/class registration,
full 75-card coverage, natural-run balance or device acceptance.

## KQ008/018/025 strict conditional paid stages

`abyss_keqing_conditional_attacks.definitions()` projects candidate 89d898c into
three exact `keqingConditional` carriers. 008/018 cost 1, 025 cost 2, all single
target attacks without exhaust. 008 selects damage 5/8 or upgraded 8/11 from the
wedge **when its stage executes**, without consuming/refreshing the wedge. 018
hits twice for 4/5, then grants ordinary block 3/4 only for entry infusion zero.
025 hits for 10/13, then another 7/9 only for entry infusion positive. The entry
infusion bonus +2 applies to every native hit, and the existing UseCard completes
one whole-card infusion use. These are not post-return wrappers.

Each stage carries immutable UID/turn/play ordinal/cursor, original target ID,
and snapshotted normal damage or normal block payload. 008 captures both native
modifier results at use time but chooses the branch from live wedge state; 018
and 025 capture the entry-infusion branch. This distinction is deliberate and
not a claim that the original JS models arbitrary modifier/reaction timing.
Native hits remain separate queued actions; dead targets do not redirect and
native reaction death stops the remaining custom stages and UseCard completion.
Last-enemy victory skips later custom stages but retains native UseCard, as in
the earlier host slices. These terminal differences remain design HOLD.

The new closed `abyss_keqing_conditional_reward_run.new(Data,seed)` has a separate
`keqing-reviewed-thirteen-v1` equal-weight special research domain. The old eight
and ten domains are unchanged. Three definitions keep source pending/HOLD rather
than inventing formal common/uncommon/rare. Existing finite unique sampling,
short offers, zero/Prismatic rejection, whole-source drift checks and whole-Run
settlement rollback are reused. Tests separately cover 72 public matrix cases,
6 Scry live/entry variations with alias rollback, native reaction/victory behavior,
21 automatic gates, six real obtain-to-natural-draw Run acquisitions, and eight
controlled-victory actual generated-offer claim-to-next-Run.play chains. Generated
cases use hand placement and energy fixtures after claiming, and do not establish
all-thirteen natural acquisition or balance. Formal menus, pools and device
acceptance remain unchanged/HOLD.

## Ganyu storm family 18/31/59, explicit 42/40 research domain

`abyss_ganyu_storm_family_reward_run.new(Data,seed)` adds the reviewed source
family to a new `ganyu-reviewed-42-v1` domain: 42 definitions, 40 eligible rewards
(common 10, uncommon 28, rare 2, plus two starter-only basic cards). Old 32/35/39
launchers keep their original domain. Rare boss offers can still be shorter than
requested; source rarities are unchanged and Prismatic remains explicitly refused.
The source definitions match reviewed fb49814f SHA256
`561c773173d921d72a368cd94b681ca7c37dd91dfe1046951eea406877d32a25`.
Existing shared storm setup ABI and owner-end are reused without modification.

18 costs 1 and creates amount 2/3 for three ticks; 31 costs 2 and creates 6/8 for
three ticks, exhausting normally; 59 costs 2 and creates 3/4 for two ticks, with
native self-retain while unplayed. Each face has narrow ID/marker/exact-effect and
retain/exhaust validation. A newly permitted numerical storm shape does not grant
an arbitrary card identity admission. The original 05 two-tick face gate remains.
Setup does not immediately damage, does not spend charge, and retains the existing
max-strength/max-duration refresh policy. Extending an older stronger field with
a weaker card is source behavior under review, not an approved balance result.

The paid host owns original UID/turn/play ordinal, detached source payload, full
command Snapshot, native UseCard disposal and actual exhaust hooks. Targeted tests
cover six full-duration public lifecycle cases, twelve refresh/NoDraw/FNP-DE cases,
six fixed-offer Run UID cases, six real installation failures and Scry resumed
refresh failures with alias restoration, thirty-six automatic gates, and post-native
exhaust draw faults. The 42-domain generated twelve-seed chain uses unchanged real
offers but controlled victory/hand placement and must not be described as natural
map play or all-forty acquisition coverage. Formal shop/reward color pools, menu
registration and device acceptance are unchanged; all source/refresh balance HOLDs
remain explicit.

Storm-family transaction fixture initially set exhaust-hook statuses without native
Power history, so the expected Dark Embrace fault was not reached. The fixture
was corrected to call Exhaust.rememberPower for both powers, preserving the real
hook and reached-marker assertions; this was not a runtime card defect.

## Ganyu 14/75 mixed defensive storm experiment

The closed `abyss_ganyu_defensive_storm_reward_run.new(Data,seed)` extends only
its own `ganyu-reviewed-44-v1` domain: 44 executable definitions, 42 eligible
rewards (10 common, 30 uncommon, 2 rare). Older 32/35/39/42 domains and formal
reward/shop pools remain unchanged. Both new source cards are uncommon 3-cost
skills: 14 ordinary block 8/11 then storm 3/4 x2; 75 ordinary block 10/14 then
storm 4/6 x3 and native exhaust. Generated definitions remain byte-identical to
reviewed be6a9a46, SHA256 63f30031b9adcd7061d1b5bfe193feb410601093e6d086ebf1884b03f6a6bc1f.

Known IDs require exact face/type/target/retain/exhaust/effect order and ordinary
candidate flags. The first block remains a native queued action captured at use
time (Dexterity/Frail), followed by the existing UID-bound immutable storm stage.
Live field maximum-strength/duration refresh is unchanged and remains design
HOLD. Native death after the shield prevents the later custom setup. No new
opcode or owner-end rule is introduced. Whole-command and revealed-pause
transactions preserve original references and RNG on failure.

Tests distinguish 24 controlled public matrix cases and four fixed-offer Run
cases from twelve actual sampled-offer claim-to-next-play chains. The sampled
chains use controlled victory/hand placement and do not establish all-pool
natural acquisition, survival balance, formal UI or device acceptance. The
first new pause probe hooked an inactive dispatch layer and failed to reach
Scry; it was corrected to insert a real Scry action during preparation, before
native block execution, rather than changing runtime behavior to satisfy it.

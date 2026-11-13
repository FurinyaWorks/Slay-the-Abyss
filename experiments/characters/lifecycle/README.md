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

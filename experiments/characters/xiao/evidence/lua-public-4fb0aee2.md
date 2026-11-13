# Author acceptance: real public owner-end and energy start

Shared exact commit: `4fb0aee28d772907f47b6d346a712f52248c1217`.
Archived independently into a workspace directory; generated native Lua data.
Both scripts resolve src/build modules only, not candidate experiment modules.

Executed unchanged author `public_owner_end_test.lua` (previously red at shared
4da6e475):
```
PASS PUBLIC base expires and survives HP8; upgrade extra duration kills after three end turns
PASS PUBLIC endTurn failure restores mask life resource and aliases then retries once
```
Executed shared `experiments/characters/lifecycle/xiao-public-end-turn.test.lua`:
```
PASS PUBLIC base expires and survives HP8; upgrade extra duration kills after three end turns
PASS PUBLIC endTurn failure restores mask life resource and aliases then retries once
XIAO_PUBLIC_LIFECYCLE_TRANSACTION_PASS
```
No traceback. Uses explicit copied candidate definitions and a native no-damage
fixture enemy to isolate life economics, not formal catalog registration or balance.
The existing x04 upgrade negative outcome now reproduces through actual C.play and
C.endTurn, not only an isolated reducer. Real command failure/alias restoration and
retry assertions, previously unreachable in the red run, have now executed.
Shared scope selects reviewed owner-end and startEnergy only; no Calm hook or public
registration of subsequent cards. Intangible changes native life payment and remains
an explicit semantics/balance HOLD. This is targeted author acceptance, not full CI,
source/human approval, or independent review of the shared changes.

# KQ003 staged pure plan for shared integration (HOLD)

`staged-starter-plan.lua` does not execute effects or change resources. `plan(input,contract)` requires a paid-play snapshot `{turn, uid, playId, upgraded, infusion, wedgeUntil?}`. `playId` must be the host's unique accepted-play identity, not a reusable turn+card pair. `contract` comes from `starterResourceProbe().contract`. It returns owned tables with a binding, the old-infusion/bonus snapshot and ordered action descriptors:

- No wedge: `rawDamage(setup)` → `setWedgeUntil(turn+1)`.
- Wedge present: `consumeWedge(1)` → `rawDamage(release)` → `deferInfusion(2)`.

Raw damage excludes infusion. The host applies the frozen old-infusion bonus exactly once per damage segment through its normal attack pipeline. `deferInfusion` writes only the matching pending-play context when that action actually executes. At accepted UseCard completion, the host spends the old attack charge once, then applies the context's actually reached deferred infusion override. The plan does not preload a pending override, mutate the resources, execute relic block or call the earlier whole-card reducer.

`validateAction(action,binding,expectedStep)` rejects unknown keys/opcodes and stale turn/UID/playId/step or invalid operation values. It validates one descriptor; it is NOT a secure replay ledger, payment validator or full queue implementation. The caller must compare against the stored immutable plan, own the cursor, bind the accepted target, and capture every resource/context/cursor/queued-effect mutation in the existing transaction. On pause keep the same context; rejected resume restores it. A repeated old descriptor cannot be admitted simply because its schema still validates. Reuse existing pending/command ownership, not a second parallel token system.

One pure Lua test covers 12 face/wedge/old-infusion combinations, exact ordering/values, unmutated inputs, output alias isolation and stale turn/UID/playId/invalid UID/extra-field rejection. No Combat file was changed. This is intended to replace inference from the research wrapper's post-return updates, not to advertise that formal wiring is complete.

Terminal policy remains unverified: a final-enemy kill or lethal card reaction may prevent later set/defer/UseCard stages under the host queue's gates. The planner deliberately does not force continuation or grant the relic after death. The integration owner must define/test these gates and the first-setup relic's queued placement against the approved gameplay contract before claiming complete KQ003/004 or relic support. Human/source/balance and formal registration remain HOLD.

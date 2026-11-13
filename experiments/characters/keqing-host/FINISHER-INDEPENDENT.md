# KQ004 public host validation (candidate HOLD)

Exact host: daec119b5556fe7adc9a48c565b55b93ea4843d4. No shared source changes.

Executed independent public C.play runner: 24 base/upgrade × infusion 0/1/2 × wedge/no-wedge × selected target survival/first-hit death cases. Added 8 cases: two slot-two target deaths with remaining enemy burst, four base/upgrade × victory/thorns-player-death, and two base/upgrade Scry pauses directly before the live wedge gate.

At the synthetic pause, two hits are already committed and energy paid; removing the live wedge cancels burst without rewinding hits. A deliberately thrown error after the gate restores values plus resource/pendingPlay/actionQueue identity; retry completes once and duplicate resume rejects. This injection is a queue stress fixture, not a new card effect or legal player resource action.

Separately reran the host author's keqing-finisher-usecard.test.mjs, including the earlier after-first-hit live-wedge flip and captured amount checks. Two targeted test files passed individually; no full suite or GUI run.

Observed current host terminal gates, not approved gameplay: killing the last enemy skips resource gate but completes UseCard and spends old infusion. Player thorns death skips completion and retains old infusion and wedge. The isolated post-return adapter has different terminal behavior and must not be copied into the dispatcher. No claim of formal character registration, source/naming review, balance, or human acceptance. Relic does not trigger merely consuming a wedge.

## Source-cost correction

The earlier 7def0ebe fixtures manually supplied cost2 although the frozen 75-card candidate's KQ004 cost is1. Those results remain evidence for a cost2 supplied catalog, not default-source payment. This follow-up corrects both independent fixtures to cost1 and literal remaining energy2, and reruns all24+8 public paths. The shared dispatcher was not changed: native host dynamic cost adjudication remains in charge. The inherited integration-owner test still uses its old cost2 fixture and is not claimed as source-cost confirmation. No terminal policy or balance approval follows.

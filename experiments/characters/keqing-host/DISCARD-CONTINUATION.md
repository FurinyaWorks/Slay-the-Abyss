# KQ043 integration boundary and available host continuation

Host daec119b5556fe7adc9a48c565b55b93ea4843d4, no shared source changes.

The actual public C.play rejects a direct KQ043 draw1 → requestDiscard1 → block4/up7 definition with unsupported_effect:discard_must_end_card, before payment or mutation. This test deliberately omits character admission markers to isolate the core schema restriction. It is not an implementation of KQ043.

The host already supports genuine mid-sequence discard continuation through native Concentrate: its dedicated plan expands requestDiscard → energy2. Two base/upgrade public C.play controls actually pause with energy still3 and cardInUse retained. Invalid token refuses; an injected exception after queued energy restores the entire paused graph and pendingDiscard/card identity; valid retry reaches energy5 once, and repeated resume refuses. This is a native zero-cost control, not proof of KQ043 payment or draw RNG behavior. Initial attempt to hook nonexistent C.gainEnergy failed as a fixture setup error; the executed version hooks actual C.applyEffects and throws only after energy.

Suggested shared-owner implementation, not approval: strict dedicated KQ043 stage emits original draw → requestDiscard → block order, retaining ordinary queue continuation and chooseDiscard rollback. Do not globally loosen the end-of-card schema or move block before selection. Snapshot block modifiers at whichever existing host rule applies, explicitly test rather than assume.

Required KQ043 actual tests after integration: one paid energy before draw; newly drawn card eligible; no premature block; NoDraw/full hand; insufficient remaining hand automatic discard; source excluded; invalid/stale/duplicate UID token; discard-trigger queue ordering before block; throw after draw/before choice and after selection/after block; original RNG/pile/instance identity restoration at corresponding transaction boundary; duplicate resume; death during draw/discard reactions and terminal gate behavior. Visible choice can expose information and cannot be cancelled into a pre-draw state for fair play. Candidate 043 and broader production/human/balance gates remain HOLD.

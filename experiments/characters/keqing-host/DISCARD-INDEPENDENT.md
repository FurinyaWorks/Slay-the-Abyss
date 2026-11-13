# Actual public KQ043 validation, candidate HOLD

Host frozen b508d302320168acf8ddfb4d5a021f11a5d89fd1. Only three fixture/document additions, no shared source edits.

Independent C.play/chooseDiscard matrix actually passed 8 base/upgrade × NoDraw × Dex3/Frail cases. Each checks paid energy2, block0 during revealed selection, source excluded, newly drawn UID eligible when draw succeeds, no cancel via empty list, source/duplicate/stale-token refusal, no extra play/endTurn during pending choice, exception after real block restoring values and hand/pendingPlay/pendingDiscard/RNG/queue/cardInUse identities. Retry resolves once, duplicate resume refuses, seven distinct UIDs conserved. This tests restoring the already-revealed boundary, not undoing information or rerolling the draw.

Two additional base/upgrade cases use actual C.draw to reach hand10 in a twelve-card deck. Playing source opens one slot; draw fills it back to10 without exceeding cap, newly drawn card is selectable, final hand9 and twelve unique UIDs conserved.

Separately reran host keqing-discard-usecard.test.mjs successfully. Its actual reshuffle failure before choice, NoDraw zero/one-hand automatic completion, dynamic block modifier capture, Tactician TOP before block, Reflex BOTTOM after UseCard completion, and draw-reaction death checks remain the host author's fixtures, not ten additional independent cases.

Normal block is captured at use time before draw; later modifier changes do not recalculate. This host policy is not a proven equivalence to an arbitrary dynamic candidate or approval of gameplay/source/human/balance gates. Synthetic exception injection is testing transaction behavior, not a player cancellation feature. No GUI or full suite run, no formal character registration.

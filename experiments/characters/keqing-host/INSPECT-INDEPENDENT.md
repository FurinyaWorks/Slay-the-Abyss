# KQ044 bounded public selection: author cross-check (HOLD)

Frozen host 5e04d6d813ec42ae91a2682d7a3b705441475595, no shared source edits.
Actual C.play and C.choosePile tested 33 base/upgrade selections covering draw sizes1–6 and every available top3/top4 position. This uses controlled arrangements of existing UID instances, not natural rewards or shuffle probabilities.

The test checks top-first public candidate IDs, exact selected object in hand, original remaining draw order and object identities, unchanged RNG, one energy paid, source exhausted once, empty/source/invalid-token/generation refusal and inability to replay/end turn while pending. Single remaining card is automatic. Every completed path checks all15 original combat UIDs, card IDs and upgrade flags across four piles.

Eight additional base/upgrade paths cover empty, NoDraw, a hand initially full10 that opens a slot on play, and a thrown fault after actual selection completion. The fault restores the already-paid/revealed boundary, including hand/draw/discard/exhaust/pendingPlay/actionQueue/RNG/pendingPileChoice/cardInUse identities; retry succeeds once. No cancellation or reroll is introduced.

This is bounded host technical validation, not GUI information-hiding proof, all reaction combinations, save/load, natural acquisition, formal character registration, source/naming approval, balance or human acceptance. Selection-time full/lock changes and automatic free-play gate remain covered by the separate owner's suite, not attributed to this independent test.

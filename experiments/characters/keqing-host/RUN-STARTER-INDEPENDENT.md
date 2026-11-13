# KQ actual starter Run: independent author validation (HOLD)

Exact shared host6600204fb60a2cbaa3c5e277d32b8276a5861408. No shared edits.
Actual abyss_keqing_starter_run.new(data,42) starts60/60 HP,10 permanent cards and no Blood relic. Run.startCombat/play/endTurn/leaveCombatRewards execute three consecutive cultist_solo encounters. No player/enemy HP, hand order, draw order or resource fixtures are changed. The deterministic policy chooses only visible hand cards in003/004/001/002 priority. All three fights win in4 turns, carrying HP60→59→58→57; each reaches live setup and one-time fixed4 relic. Each battle starts with clean wedge/infusion/relicUsed; endTurn clears infusion. Every command boundary checks a bijection between all permanent deckUid owners and combat cardId/upgraded values.

These are fixed repeated encounters, not traversed map nodes, randomized encounter selection or a balance sample. Rewards are skipped in the first two encounters. In the third reward room, an explicitly constructed upgraded KQ003 offer is claimed through real Run.claimCardReward. Its permanent UID and upgrade survive into the fourth actual encounter and naturally draw into hand without rearrangement. This proves fixed-offer acquisition identity, not registration/probability in the natural reward pool.

The fourth encounter injects an exception immediately after real Paid.dispatch for that upgraded instance. Run.play restores whole values and deck/combat/resource/hand/queue/RNG identities; the upgraded action retries successfully once. This is synthetic stage-boundary fault evidence, not all hooks/terminal reward faults. The owner's separate late-init and reward-publication tests are not counted as independent coverage here.

No complete75 integration, GUI character selection, save/load, formal equipment item, source-name approval, terminal gameplay policy or human/balance approval is claimed. Initial relic remains an explicitly labelled virtual candidate lifecycle effect.

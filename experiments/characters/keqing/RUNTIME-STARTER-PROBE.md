# Full starter runtime probe (isolated, HOLD)

This successor extends the reviewed small resource wrapper with KQ004's two target hits followed by conditional wedge-consuming AoE. Both faces derive from the candidate definition. Existing infusion adds its bonus per hit, including the AoE, and is charged once for the entire attack card. Payment, actual damage/status/block ordering, enemy turns, draw/shuffle and card zones remain the real Lua Combat implementation. A temporary copied definition is restored after execution. No production source, character registry or reward pool is modified.

## Evidence

`node --test experiments/characters/keqing/runtime-{bridge,resource-probe,starter}.test.mjs`: 6 tests. New coverage includes strict exporter negative inputs; base/upgrade × wedge present/absent × two live enemies with infusion, independent numeric expectations, invalid target and insufficient payment without input mutation. Real initial deck is 3×001, 4×002, 2×003, 1×004. Twelve fixed seeds × four actual enemy turns run a visible fixed priority policy: all four card identities are actually drawn and played, recast and detonation paths are reached, and ten instances remain conserved. No card is injected and draw order is not rearranged in this full starter witness.

The witness deliberately increases player and enemy HP to 999 to keep four turns available. It demonstrates acquisition/execution reachability, not natural win rate, fair enemy pressure, balance or a user playtest. Earlier draw-lock test has a separately disclosed controlled-hand fixture. These are not held-out policy evaluations.

## Unfinished contracts

Starter relic is NOT wired. Saved-state schema, formal resource/status view and actual character selection remain pending. Extra enemy actions, queued effects after a lethal hit, formal powers and all unsupported card operations require separate tests and integration. The isolated wrapper is not production registration, a full 75-card runtime bridge, or human/source/naming/balance approval. All G0–G9 gates retain their existing HOLD state.

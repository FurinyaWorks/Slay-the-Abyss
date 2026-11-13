# Author independent public x02/x06 acceptance

Shared exact commit: `4da6e4755aea1216bd94929b84e50857b6336a07`.
Archived to a separate workspace directory, generated native data using
`scripts/build-lua-data.mjs`. All require paths are src/build only. No experimental
role implementation is ahead of shared source in module lookup.

Unchanged author assertions from `public_defense_exit_test.lua`:
```
PASS PUBLIC x02 real paid block and x04-to-x06 real exit schedule removal and exhaust
PASS PUBLIC empty exit still exhausts; failed real exit restores whole paid command then retries
```
Shared `experiments/characters/lifecycle/xiao-defense-exit.test.lua`:
```
PASS PUBLIC x02 real paid block and x04-to-x06 real exit schedule removal and exhaust
PASS PUBLIC empty exit still exhausts; failed real exit restores whole paid command then retries
XIAO_DEFENSE_EXIT_TRANSACTION_PASS
```
This is actual C.play with canonical candidate definitions in an explicit test
catalog, real UID/cost/discard/exhaust and host fault rollback. The shared suite
also checks automatic entry, unmarked/corrupt definitions and Scry continuation.
It is not public owner-end or normal-start hook acceptance, formal release,
source/name approval, or proof of all 75 cards.

## Current x04 risk recheck
On role snapshot `d750d1cf` (current JS model unchanged), the exact existing test
`upgrade extra duration is documented negative life outcome, not free benefit`
passed (1 test). A separate direct reproduction with initial HP 8, only x04 in
hand and three model end/start steps gave:
- base: HP after card/end1/end2/end3 = 6, 4, 2, 2
- upgraded: 6, 4, 2, 0

The upgrade negative survival case is still present, not just a stale historical
warning. This is the JS no-enemy-attack comparison. Shared owner-end is not yet
registered, so this result must not be described as a public Lua three-turn
integration test. No card values were changed and the risk remains HOLD.

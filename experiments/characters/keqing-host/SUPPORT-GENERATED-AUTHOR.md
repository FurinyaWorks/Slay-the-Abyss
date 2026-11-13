# Actual support reward acquisition (limited author evidence)

Host: 08d5ee044bea6becd069048f66699aadc94bef7e, closed `abyss_keqing_support_reward_run.new(D, seed)`, explicit research marker `keqing-reviewed-ten-v1`. This is an equal-weight finite experimental domain preserving special/HOLD, not an approved rarity distribution or production pool.

Predeclared bounded sequence: seeds 42 through 49; stop after both support IDs are acquired and played. Only visible offered IDs determine selection (first unacquired 039/049). No search outside the interval, no replacement offers, RNG resets, HP changes, enemy changes or hand/draw rearrangement. Each seed starts the actual 60 HP source starter and wins a normal cultist encounter through public Run.play/endTurn. Policy sees only hand and prioritizes 003,004,001,002.

Actual serial execution: Node 1/1 PASS, 13.7 s; no fixture correction required.

| Seed | Actual offer | Claimed |
|---|---|---|
|42|052,053,034|none|
|43|052,005,053|none|
|44|053,005,055|none|
|45|005,053,055|none|
|46|019,039,034|039, unupgraded|
|47|034,054,049|049, unupgraded|

Six actual first-combat victories, nine distinct IDs observed, two support IDs acquired and paid in the next battle. Seeds 48/49 were not executed because the stated stopping condition was met. Runs without a support choice are discarded as independent trials, not counted as reward skips or continuation.

Before claim, leaving/reopening preserves the exact offer/RNG; the actual claim preserves RNG and creates one permanent UID. The next encounter uses the original shuffle. Only visible KQ002 cards are played while waiting for the acquired instance. Every successful tested play/endTurn checks all 11 permanent deckUid owners against combat cardId/upgraded, with unique combat UIDs and complete ownership.

- 039: actual one-energy payment, immediate block4, next turn block4 with next_turn_block cleared, following turn block0. Native modifiers are absent here; modifier evidence belongs to the owner suite, not this test.
- 049: actual one-energy payment; the newly drawn instance was KQ002, a skill, yielding block4. The assertion derives the condition from the actual returned hand delta after draw, never choosing an action from hidden order.
- Both skills leave infusion/wedge unchanged; source Data is unchanged.

Not covered by this slice: upgraded generated acquisition, 049 attack/non-skill outcome, all ten reward IDs, statistical uniformity, full-map balance, modifier/NoDraw/full-hand/terminal/fault interactions, production UI or human approval. Prior owner and role tests remain separate. This is actual generated acquisition, but the repeated fixed encounter and deterministic selection are controlled research, not a human natural-build approval.

Command: `TMPDIR=/workspace/scratch/c1a4970a76e0/keqing-tmp node --test experiments/characters/keqing-host/support-generated-author.test.mjs`

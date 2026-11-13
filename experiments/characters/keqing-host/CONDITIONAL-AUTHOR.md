# Conditional paid cards: author evidence (HOLD)

Exact host: 9481c7f85c3966a3bce4a16ac2fd8d926c6f2647.
Source: candidate 89d898c407e35db85b0bd053d92e6dfa9a4b549a, KQ008/018/025.

Serial test actually passed 1/1 in 14.0 seconds without fixture changes. No simultaneous large test was started.

## Literal source matrix

36 controlled base/up × infusion 0/1/2 × wedge absent/present cases, two living enemies, 100 HP target. Expected outcomes use literal values rather than Combat.attackAmount/blockAmount as their own oracle. No modifiers in this matrix.

- 008: cost1; no wedge 5/8, wedge8/11; entry infusion adds2 once to the one hit.
- 018: cost1; raw total8/10 without infusion,12/14 with infusion. Only entry infusion0 grants block3/4.
- 025: cost2; total10/13 without infusion,21/26 with infusion (two separately infused hits).

Assertions include no damage to other target, whole-card infusion spend exactly1, wedge unchanged, no initial relic trigger, expected block and payment. These controlled placements prove ordinary paths, not pause-time live wedge switching, modifier parity or terminal rules. Those owner tests are separate, not counted as author coverage.

## Real generated acquisition

Predeclared bound seeds42–57, stopping when all three target IDs have actually been claimed and played. Normal actual 60 HP source starter wins a fixed cultist encounter through public Run commands; visible hand policy prioritizes003/004/001/002. No HP/enemy/hand/draw/resource edits or replacement reward offers.

|Seed|Actual offer|Claimed|
|---|---|---|
|42|018,009,053|018 unupgraded|
|43|008,054,034|008 unupgraded|
|44|018,005,009|none|
|45|008,052,055|none|
|46|055,039,053|none|
|47|039,025,034|025 unupgraded|

Actual denominator: six victories/offer generations, eleven distinct offer IDs, three acquired IDs. Seeds48–57 were not run because the stopping condition was met. Unselected independent runs are abandoned, not asserted as successful reward skip operations.

`abyss_keqing_conditional_reward_run` uses `keqing-reviewed-thirteen-v1`: equal-weight finite research domain retaining special/HOLD, not formal rarity. Actual Run.claimCardReward adds the permanent instance without consuming more reward RNG. Next battle uses its original shuffle, only visible KQ002 defense is played while waiting, and actual Run.play pays source cost. Every tested successful action checks all11 permanent deckUid owners against combat cardId/upgraded and unique combat UID. Source Data remains unchanged.

Limits: no upgraded generated acquisition, no full13 offer coverage/statistical distribution proof, no full-map balance or human play, no GUI/production registration. This author slice does not repeat owner pause/fault/terminal/auto tests or claim those as independent coverage. Source naming, human approval and gameplay terminal differences remain HOLD.

Run: `TMPDIR=/workspace/scratch/c1a4970a76e0/keqing-tmp node --test experiments/characters/keqing-host/conditional-author.test.mjs`

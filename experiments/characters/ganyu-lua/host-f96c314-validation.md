# Generated experimental rewards: author verification

Exact shared host: `f96c3147eb6a620b0a60a1b53e466d5b18d3dda0`, separate workspace `git archive`. API `require('abyss_ganyu_reward_run').new(D,seed)`. No shared edits.

Executed after rebuilding Lua data:
- Original `public-generated-rewards.test.lua`: PASS 12 actual generated rewards → claim/deck UID/upgrade preservation → next battle `Run.play`; 21 distinct offer IDs observed. No reward identity or upgrade injection.
- Shared `ganyu-reward-pool.test.lua`: PASS source32/reward30, finite rarity depletion, boss short offer, zero and Prismatic rejection, whole-Run/RNG rollback, strict definition/flag rejection and formal pool boundaries.
- `public-reward-context.test.lua`: PASS two actual `boss_guardian` victories at floor16, with/without Question Card, each offering only rare05 and successful claim; Dream Catcher after a prior boss uses normal rarity context and the candidate marker, produces and claims an actual candidate reward; injected fault after real rest sampling returns `false, transaction_failed`, preserves the complete Run plus original nodeFlow/cardRng references, and retries successfully.
- Shared paid03/06 and storm05 definition files compared byte-identical to the previously reviewed source generators.

The new host was rerun; old `b581688` normal-path results are not used to waive its definition-admission defect. During supplementary test development the author initially selected an absent encounter, then omitted guardian's required floor16, and expected an exception instead of the existing permanent transaction's false return. These were fixture/assertion mistakes, corrected before the entire supplemental script passed. No engine correction was needed for these mistakes.

Controlled victories, post-reward hand placement/energy and a deliberate camp node fixture isolate execution and ownership; these are not natural draw, full campaign, balancing, or all30-ID coverage. Basic01/02 remain starter-only. Source rarity is unchanged (10 common,19 uncommon,1 rare reward candidate); shortages yield short offers under this explicit experiment, not the formal rules. Formal reward/shop/colorlessShop sampling tables remain unchanged; metadata legitimately includes extra candidate definitions. No official character/menu registration, human approval or real relic inventory lifecycle is implied.

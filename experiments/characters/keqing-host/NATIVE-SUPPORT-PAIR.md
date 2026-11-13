# KQ039 / KQ049 integration handoff (HOLD)

Host: 69f09b117bd73003669b5152312f2c3929e8a466.
Source: candidate 89d898c407e35db85b0bd053d92e6dfa9a4b549a, mechanics.mjs KQ039 / KQ049.

`native-support-pair.lua` returns fresh fixed definitions only. It does not install cards, mutate data, set hook flags, change a reward provider or register a character. Pending source rarity is represented as `special` plus HOLD, never assigned a formal rarity.

- KQ039: skill, SELF, 1 energy, non-exhausting. Base ordinary block 4 then nextBlock 4; upgrade 6 then 6.
- KQ049: skill, SELF, 1 energy, non-exhausting. Native escapePlan draws one actual card, and grants ordinary block 4 / 7 only if the actual drawn card is a skill. No preview of hidden draw order. Native use-time modifier capture is the existing host policy, not proof of all reactive parity with the JS candidate.

## Actual compatibility result

The four base/upgraded real Run.play admission tests **reject** with `keqing_candidate_effect_unavailable`, preserving the full Run value graph, hand reference and energy. The current Keqing paid whitelist lacks nextBlock / escapePlan. Thus this factory is integration preparation, not two newly playable shared cards.

Current explicit Keqing lifecycle already sets `experimentalMechanics=true` in abyss_character_owner_end.init; factory code does not add data.experimentalKeqingNative or any other global flag. The initial test assumption that the starter left this flag nil failed, and was corrected by reading that actual initializer. This differs from the older generic, non-Keqing Run test that required an explicit dataset flag. Existing generated Data contains next_turn_block; its availability is asserted. A future shared installer must validate its canonical dependency or supply it without silently changing ordinary characters.

Owner integration request: narrowly admit the fixed source-bound pair under explicit Keqing candidate admission, maintain ordinary modifier/native draw semantics, then verify actual payment, next-turn clearing, NoDraw/full hand, draw-trigger death, transactional failure and source UID acquisition on the integrated host. Do not simply remove their candidate markers or broaden every unknown effect. Shared owner owns admission/provider changes; this branch changes neither.

The test deliberately places the acquired instance in hand solely to expose the current gate. This is not natural offer or draw evidence. Historical reviewed native adapter/Run tests are separate evidence, not proof these definitions currently bypass the gate. Source naming, formal balance, human approval, production loader and reward expansion remain HOLD.

Run: `TMPDIR=/workspace/scratch/c1a4970a76e0/keqing-tmp node --test experiments/characters/keqing-host/native-support-pair.test.mjs`

# Xiao independent fifteen-card research domain

Base shared 8f39b5b4. Four new private modules only; no shared CardPool/Run/Combat
or architecture routing changes. Module validation is NOT generated Run rewards.
Closed API: abyss_xiao_exhaust_reward_run.new(data,seed), no extra options.
Domain: xiao-reviewed-nonbasic-fifteen-v1.

Source: candidate cards.json SHA256
1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa.
New static source x20/x21/x22 all uncommon, costs0/1/1, exhaust true/false/false.
Their base/upgraded effects retain unmaskedDraw2/3, exhaustDamage3 cap18/24,
exhaustBlock2 cap10/14. This mirrors the approved technical paid slice, not
approval of candidate rarity, names, strength, character provenance or visuals.

The catalog reuses the original twelve source definitions and appends exactly
three static entries, independently comparing full Bridge definitions. It does
not dynamically derive its claimed source from Bridge. New classification is
common4/uncommon9/rare2; all four basic cards remain excluded. Original twelve
provider/catalog/factory/source files and domain remain unchanged and mutually
reject foreign domain markers. Formal four color pools remain75 each.

Provider selects without replacement within rolled category, preserving skipped
empty category slots rather than rerolling. Short offers are valid, zero cards
fail explicitly, Prismatic is rejected. cardRng is cloned, all identity choices
precede upgrade rolls. Closed factory calls Starter once on a private input copy;
source collisions/drift and constructor failure never mutate caller input.

Focused test: xiao-exhaust-reward-source.test.mjs, single256MB process. Checks
4/9/2, all15 source upgrade drift, new base/up cap drift, metadata/duplicate drift,
finite20-slot samples, zero/illegal counts, Prismatic, cloned RNG, formal pools,
Starter once, real constructor fault and preserved old12 domain. It does NOT
prove shared Run routing, real settlement/claim/next-battle paid or natural offers.
Those are the integration owner's subsequent slice and separate author/review gates.

Author result: first module run passed1/1 (10.97s); after adding explicit cap and
invalid-count probes plus required old-domain markers, final1/1 passed14.26s.
No failed test run or runtime correction in this slice. No full CI or GUI run.

## Shared Run follow-up

The owner is adding only an explicit `xiao-reviewed-nonbasic-fifteen-v1` CardPool route plus architecture classifications. Four reviewed source/provider/factory modules remain unchanged. A new actual Run test samples real identities/upgrades, verifies their published RNG/offset and upgrade list, claims permanent UID, checks claiming does not consume card RNG, then pays that acquired identity in the next fight. Sampling/zero/Prismatic/drift and post-obtain errors must restore the complete Run graph and references. Its 999-damage victory and hand/energy placement are controlled fixtures, not natural survival or all-fifteen coverage. Shared validation and independent/author results remain pending until reported.

Owner shared validation: new provider+actual Run wrapper passed 1/1 (49.07s), followed serially by old twelve-domain provider+Run wrapper 1/1 (45.68s). Architecture passed 422 modules/2225 edges. Both suites first passed without fixture or runtime repair. These results do not replace the separate independent shared review or pre-registered natural 41–52 author witness, which are pending at freeze.

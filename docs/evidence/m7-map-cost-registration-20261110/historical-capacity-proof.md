# Windows17 capacity diagnostic

Read-only result for the published Emerald800 costs. No tests, Full run, repository edits, or uploads were performed. Reproduce with:

    node /tmp/map-cost-capacity-proof.mjs /workspace/scratch/c1a4970a76e0/m7-map-emerald-cost

## Finding

A scheduling-only fix is mathematically impossible under the fixed costs, serial JS phase, exclusive long Lua phase, two-worker short Lua pool, 17 Windows shards, and 60,000 ms reserve.

- Complete unique inventory: 800 JS files and 1,410 Lua fixtures (647 exclusive, 763 short).
- JS plus existing first-shard gate: 19,071,882 ms.
- Exclusive Lua: 7,852,637 ms.
- Short Lua: 5,325,660 ms total, requiring at least 2,662,830 ms of two-worker elapsed capacity.
- Conserved normalized work: 29,587,349 ms.
- Capacity below the target with the reserve: 17 × (1,800,000 − 60,000) = 29,580,000 ms.
- Capacity deficit: 7,349 ms before imbalance. Even perfect scheduling gives 29,587,349 / 17 + 60,000 = 1,800,432.294117647 ms. The integer-millisecond lower bound is 1,800,433 ms.

For any shard i, C_i ≥ J_i + E_i + S_i/2. Summing this inequality and applying max(C_i) ≥ average(C_i) proves the bound for every reassignment or ordering with the same execution constraints. It does not depend on the present greedy algorithm, and it permits unrealistically perfect division of short work, so any indivisibility or pool imbalance only increases the result.

The current unchanged planner reproduces Windows 1,801,318 ms and POSIX15 1,137,160 ms. Thus there is at most 885.706 ms of scheduling slack above the Windows lower bound, less than the 1,318 ms needed. The worst existing Windows shard is 12: JS 1,121,876 + exclusive Lua 457,462 + max(short workers 160,082, 161,980) + reserve 60,000 = 1,801,318 ms.

A discarded diagnostic simulation preserved exclusive assignments and reassigned shorts in the unchanged safety-weight runtime order to the shard with the smallest predicted new completion time. It reduced the forecast to 1,800,853 ms, still 853 ms over. No scheduling implementation is recommended or included: the lower bound rules out solving this gate that way.

## Historical contract sensitivity

A live planner replacement has nonlocal contractual consequences even if it improves current placement:

- `tests/ci-complete-calibration.test.mjs:559-569` imports the live `shardLuaScripts` for frozen Actor inputs and requires the exact Windows result 1,714,151 ms. Further frozen inventories also assert exact maxima (for example lines 645-680, 910-945, 975-1010). A current-only source inverse would not by itself preserve these runtime numerical witnesses.
- `tests/lua-shards.test.mjs:29-38,80-86,183-185` require exact small-case assignments, not merely coverage. Its original 1,114-fixture experiment also requires at least 5% improvement and under 1,000 ms spread.
- `tests/helpers/lua-timeout-policy-source-inverse.mjs:10` authenticates the complete current runner hash `57e1ad1d74a0fb53bc54c9512569f9e22d7630940106cb053f94ff1b25102703`. Arbitrary scheduler edits stop that projection, as intended.
- `tests/helpers/ci-lua-runner-inverse.mjs:40-45` additionally authenticates the exact historical scheduler block. `tests/helpers/ci-lua-calibration-inverse.mjs:12` authenticates a complete prior runner. Do not update old expected digests or numerical observations to accommodate a new algorithm.
- Registering the seven floors alone grows 33 to 40, preserves every original floor, and changes the current forecast. The current assertions at `tests/ci-complete-calibration.test.mjs:1095-1118` require an explicitly authenticated new outer epoch while retaining the original 33-floor/forecast evidence.

The newer advisory/hard-timeout distinction in `docs/CI.md:133` does not make the original 1,800,000 ms target pass. Report the overrun honestly; do not call it a successful target fit or a Hosted proof.

## Exact cost and input identities

The companion JSON contains every shard load, inventory-name hashes, the seven current test source hashes, exact floor values, source evidence digests, full timing/planner/worker/shape digests, and original-floor preservation result. Current source hashes identify the diagnostic checkout; they do not strengthen the provenance of earlier standalone measurements.

Seven retained complete-file floors:

- `tests/ci-complete-calibration.test.mjs`: 13573 ms; current source SHA256 `1cc24f4d5199797a0896bacab184ca90e1f12a3cb950f231e12d9ccf562f8aa0`.
- `tests/ci-host-timing-calibration.test.mjs`: 17143 ms; current source SHA256 `232d52a69b5d9fa5e3430f1c26ba326e500a36c91002ed18d2457b137744e565`.
- `tests/ci-runtime.test.mjs`: 12019 ms; current source SHA256 `6430c52b9e645923f546b13ebcc07ef710325bcc9168ecb1dacf491262441c6d`.
- `tests/ci-windows-shape-expansion.test.mjs`: 11162 ms; current source SHA256 `3c4140685f365fa069dfefd54658a8e5ce85c667863e63076baf4ce151ed9bc6`.
- `tests/class-potion-orb-source-inverse.test.mjs`: 10864 ms; current source SHA256 `694446ee9ef3cc4b9b7eda37a651996e3e50cd77a627976215d6401cd5853986`.
- `tests/defect-integration-source.test.mjs`: 16574 ms; current source SHA256 `ec04dcb0596ee72083aae0049fc5ce2b2216ab051f2bf03948f98b3a22d1b79e`.
- `tests/watcher-actor-source-inverse.test.mjs`: 21870 ms; current source SHA256 `804a98f450d5c0c0797219fbfe718cb3c011d120002eb0033bbcb39e823d0464`.

Diagnostic artifacts:

- `/tmp/map-cost-capacity-proof.mjs`: SHA256 `7cff09279e48d0624a62a7da5b9ff957d2a351ff9775ce0fff19e5c19c5b5173`.
- `/tmp/map-cost-capacity-proof.json`: SHA256 `8c3297e5055fdc86b24e29e11de7fee7d5814b38515af26ce30b7208522f1888`.

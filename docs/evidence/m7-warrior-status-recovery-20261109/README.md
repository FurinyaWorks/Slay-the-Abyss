# WarriorStatus preparation recovery

Base: `1eb288472d7b33b7450eec97a624ca2ffa526f39`, the verified squash of PR #576.
Published source slice: `d7d0c299bbfaef70510e617211be547d8daa0c64`.
Its tree `e34ee0f00f4806a99f9fe82db27d2c114eeb6310` exactly matches locally reviewed source commit `707fe95cee42448259d855e1fd2cf41a646c03e2`.

The earlier unpushed workspace and logs were lost when the cloud environment restored an older snapshot. This delivery reconstructed the retained final source and tests by their recorded SHA-256 values, then ran new checks on the actual post-#576 base. It does not reuse or claim the lost execution evidence. The Git CLI lacked authentication; the official connected GitHub tools published the same verified tree.

## Production change

Only `src/lua/abyss_warrior_status_cards.lua` changes production behavior structure. `withCards` now coordinates indexing, native card preparation, reused status lifecycle validation, and Power preparation. Validation order, replacement positions, whole-graph copy, alias/cycle handling, partial copied state on errors, and exact error bodies remain covered. Seven private helpers and the entry point have explicit CC15 protection; the original CC36 implementation is rejected by the same gate.

Full-source measurement: 338 modules, 1929 dependency edges; 5604 to 5611 complete AST/CC measurements. `withCards` CC36 to 5; helper maximum 11; functions above CC30 33 to 32 and above CC15 209 to 208. SCC sizes remain 68/11/2. No SCC reduction is claimed.

## New verification

- 68 exact graph differential cases, six real semantic mutants, and all eight missing/excess CC controls: 3/3 tests.
- Independent supplementary malformed-input/order/copy probe: 26/26 exact matches.
- Original WarriorStatus gameplay regressions: 29/29.
- Existing Lua static/responsibility tests: 20/20.
- Source and CI contracts: 11 Warrior tests plus 99 Formation, calibration, integration, and projection-cache tests; no failed, cancelled, or skipped tests in final runs.
- All historical source archives, cost forecasts, receipt assertions, and budgets remain frozen. New live 52-owner / 802-JS inventory is checked separately from the historical 51-owner / 800-JS state; 1410 Lua fixtures remain covered.

## Limits and next gate

This remains a draft pending independent final-HEAD identity and hosted required checks. No local Full was repeated, and no hosted Full success, actual game import, device test, or merge is claimed.

The unchanged 10,000 ms unknown-JS planning value is an estimate, not a timeout. Preparation runs took 11,690.153 ms and 4,760.712 ms. Source-contract runs took 33,242.203 ms and 26,460.887 ms. Both slow and fast observations are retained. The static complete-inventory forecast is Windows 1,795,233 ms against 1,800,000 ms and POSIX 1,130,140 ms against 1,200,000 ms. The Windows 4,767 ms modeled margin is smaller than the observed source-test underestimate, so it does not establish runtime budget safety. Do not inflate thresholds or select only fast samples.

PR #579 owns unified integration separately. This slice does not edit that branch or overlap its Warrior production source. Shared source-epoch/CI adapters require an explicit fresh combination review when integrated with other pending changes.

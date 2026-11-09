# Independent TreasureSource responsibility review

Base: develop 1eb288472d7b33b7450eec97a624ca2ffa526f39.
Result: no production correctness blockers found within reviewed scope.

## Reviewed scope

- Production TreasureSource diff: item relic-only validation extracted without predicate changes; collection retains exact row order and error precedence; pair identity, extra canonical equality and returned fields remain identical.
- Static responsibility roots include all six relevant public/extracted functions. Current implementation adds no anonymous helper callback outside those roots; unchanged canonical comparator remains byte-identical.
- Behavioral runner, pinned predecessor fixture, 14 named semantic negative controls, edge matrix, and actual-tool complexity tests reviewed.
- Run integration read at abyss_nodes.lua modernTreasurePair / treasureSource / treasureChoiceSource. These consumer bytes and owner/token logic have no diff from the stated base. Runtime owner sweep is coordinated by the integrating agent, not rerun here.

## Verification

Independent reviewer ran 20 focused cases against separate before and after VMs. Each produced 40 matching checkpoints. Checked malformed-before-boss versus boss-before-malformed, duplicate-slot versus boss precedence, boss-before-missing-pair and later duplicate refusal, missing key before malformed extras, empty/shared trace, shared extras, fresh return object, protected metatable false, invalid cyclic input, repeated trace-row aliases, maximum slot and gold, and oversized gold rejection. Every case asserts unchanged input graph and exact public return arity.

Independent checkpoint stream SHA256 (identical before/after):
b6c1529f1f74664b5d5ee52cbba8320d1f9ebfad2cd59efaa42a9a9bb78470c7

Evidence: review-edges.lua, review-before-graphs.jsonl, review-after-graphs.jsonl in this directory.

Reviewed existing final logs rather than duplicating broad tests: behavior-final.log 16/16, complexity-final.log 3/3. Actual measurements reported there: M.pair 8 (previous 35), item 11 (previous 19), relicItem 9, collectItems 11, linkedPair 14, matchingExtras 8. Complexity negative cases exercise each root and nested anonymous callbacks, absent/duplicate diagnostics, and shifted AST coordinates.

## Evidence qualification and remaining scope

The graph observer traverses all reachable fields at each checkpoint, but stable=true emits changed definitions only. These are reconstructable full-state graph streams, not standalone full snapshots per checkpoint. Describe evidence accordingly. No production code change is needed.

No Full, live platform/device test, upload, commit, or production/shared-file edit performed. Source-epoch/CI integration review is owned separately and excluded from this approval. Backlog CLI command was unavailable in PATH; no Backlog changes were attempted.

## Reviewed SHA256

- src/lua/abyss_treasure_source.lua: 9abc146584d55b7c32afc96fd42862bc2844539e4eda7d6902dc49a7d1e70e92
- scripts/check-lua-static.mjs: e727aa790f5afdb8ac829b3566382adb501a839851baffacd9ce5bf4829cf692
- tests/treasure-source-responsibilities.test.mjs: ee5dc0c867607ba41a68bab225c430fdb11bce48e9a99b0b65073c903fdd6909
- tests/helpers/treasure-source-vm.mjs: a2de3eb48d47d28062a47f1facaafa6b8c323d1104daf8d9671ddd04f05ca146
- tests/helpers/treasure-source-edges.lua: 55b7d43da6a4345a68c2c7d4c4d84eb64965607b09bc36cee07712cb7c6eb7f6
- tests/treasure-source-complexity.test.mjs: cfb901c47bddcf21ecd79e7365724f32098b237c3e45b78472aaf8d744de746c
- tests/fixtures/treasure-source-before.lua: 44ae73c0d996c4f336d18f225a44466c73db6db85921f1eca28c00865f8601da

Predecessor Git blob: 59c934e1dcf59569f9d8152506aa963e2d601bba.

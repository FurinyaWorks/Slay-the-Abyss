# Timing consumer inventory

Search scope: tests/*.test.mjs direct ci-test-timings.json literals, ci-shards.mjs imports and originalPlanningSource calls; planning/CI-source helper imports were also checked for proof.path indirection. Raw line inventory: ci-timing-callsite-inventory.txt. Helper list: ci-timing-helper-inventory.txt.

## Exact historical source consumers, explicit Emerald outer boundary now present
- ci-complete-calibration: historical disk reader plus complete hash-bound original planner with only timing-read and relative-import relocation; new actual-current contracts bypass it. 45/45 passed.
- ci-runtime: historical readFileSync outer projection; current timing JSON check and live planner retained; one known current floor added. 13/13 passed as part of 20-test related run.
- ci-host-timing-calibration and ci-windows-shape-expansion: historical readFileSync outer projection, original frozen hashes/budget assertions retained. Both complete files passed as part of 20-test run.
- watcher-actor-source-inverse and class-potion-orb-source-inverse: only each historical planning input gains the exact outer projection; production-source consumers retain current public source epoch. 10/10 passed.
- defect-integration-source: proof.path indirect timing read now explicitly enters the same outer projection. 4/4 passed.

## Live planner or unchanged Lua-only data; no historical timing identity to project
- lua-shards: current planner coverage/safety and independently frozen original inputs; passed in 19-test shard run.
- lua-workers: reads Lua costs, untouched by JS local floor. Not rerun in this slice.
- battle-drag-click-compatibility, competition-roster-prepared-ui, game-ui-class-choices-partitions, pr325-absorption-discovery, ui-regression-partitions: use live jsShard only to assert exact inventory coverage, not frozen shard assignment or timing identity. Existing inventory unchanged. These complete behavior files were not rerun for this CI-only review.
- quick-feedback: reads timing.lua for advisory estimate, unchanged by JS floor. Not rerun.
- ci-impact: writes its own synthetic fixture timing JSON; no live timing-source projection. Not rerun.
- ci-runtime-preview-lfs: copies real timing JSON into isolated current runtime sandbox; no frozen timing identity. Not rerun.
- ci-posix-shards and ci-windows-shards: live current plan coverage; passed with lua-shards in 19-test run.

## Other planning-named tests
- defect-utility-planning, silent-tactics-planning, watcher-flow-planning, m7-core-final, watcher-actor-boundary concern gameplay Lua planning, not CI timing JSON. No additional timing projection required.

The shared source inverse helpers remain byte-for-byte frozen. Their current-input callers listed above use the one exact new outer inverse. This is a static direct/known-indirection audit, not a claim that every transitive consumer or Full was executed.

# PR #579 source-contract repair

Base: 0f382e9e8464eb474c61ac042656ca2c2cd3463e.
Worktree: m7-source-contract-repair; branch repair/m7-linked-source-contracts.

## Root causes

- preIntegrationSource ran pure CI projections before current raw-source authentication. Stasis/Wheel config was reduced to frozen 7821a7f4 config (5b86c210...), then no longer authorized the current owner closure. The original expected e50c2b19... assertion failed; merely updating expected still failed the preserved raw-owner probes (green.log, 26/29).
- The watcher/potion suite read today's raw sources through only sevenRefactorEpoch. Newer config must first pass the current sourceEpoch's full owner closure to its independently authenticated watcherFlowPrior target, then enter localSeven.

## Repair

- Authenticate via preGameUiExtractionSource before pure CI/planning inverses. This restores the original e50c2b19... output AND the current raw-owner validation. Original art-feature suite is untouched; original ready-art assertions and all frozen hashes remain intact.
- Compose watcher current -> watcherFlowPrior -> localSeven, checking complete predecessor binding equality and fresh owner failure paths.
- Added an explicit historical GameUI positive through native/query/lifecycle identities with exact output hashes, LF/CRLF, exact seven-owner read sequence and each-owner drift rejection.
- Added stable-entry linked-owner fault tests and distinct unknown-entry passthrough tests. Missing root input must pass through, not be hashed as a string or misclassified as an authenticated linked-owner fault.

No production Lua, archive, beforeSha, budgets, timeouts, or protected host helper changed. No remote writes or Full run. Backlog CLI unavailable in PATH/node_modules; attempted overview and execution instructions.

## Evidence

- red.log / red-minimal.log: original reproduction.
- green.log: deliberately preserved failed expected-only attempt, proves raw-owner probes catch bypass.
- projection-diagnosis.log / after-order-diagnosis.log: exact boundary hashes before/after ordering fix.
- historical-green.log: explicit frozen historical positive passes.
- watcher-pr372-green.log: 8/8 before final extra unknown-root probe.
- final-targeted.log: final three assigned suites.
- consumer-closure.log: bounded nine-file consumer validation, includes pure CI no-live-read contracts and art/perf/retirement/native/GameUI consumers.
- import-consumers.txt: static reverse-import inventory, 146 modules / 88 test files. The bounded run does not claim all 88 tests or Full are validated.

## Final recorded status

Commit: 3ab8cfcf92fdabc590c3de4e019ece8ec6ac8411.
Assigned suites: 30/30 pass (118.5s), including every original assertion.
Bounded consumers: 88/90 initially. Missing generated art data resolved by build:data, build:ui and build:theme; full ci-complete-calibration rerun is 53/53 PASS.
Remaining GameUI consumer: default-heap SIGABRT/OOM, not marked passed. First original baseline case independently passes. A sequential baseline/candidate full-file pair is recorded separately with default Node heap and no timeout/heap increase, using os.wait4 resource accounting because /usr/bin/time is absent.

Paired untouched 0f vs candidate GameUI full-file outcome: both default-heap OOM/SIGABRT. Baseline 41.761s / 2,396,144 KiB maxRSS; candidate 41.256s / 2,377,908 KiB maxRSS. Same Node v24.22.1, heap_size_limit 2,348,810,240 bytes, no NODE_OPTIONS; preceding host loadavg 1.28/1.69/1.03. No limit changed. This reproduces the local validation blocker on the original base and shows no candidate-only memory growth in this sample; it is not a passing test or hosted-platform proof. Per-run GC stacks, stderr and os.wait4 CPU/RSS receipts retained.

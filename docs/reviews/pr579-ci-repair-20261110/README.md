# PR #579: targeted repair of Quality 42760162623

This evidence starts from PR head `0f382e9e8464eb474c61ac042656ca2c2cd3463e`, whose original develop base was `1eb288472d7b33b7450eec97a624ca2ffa526f39`. The original [Quality run](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42760162623) failed. Its successful Quick feedback and Licenses runs do not supersede that failure.

## Original failure evidence

`official-failure-logs.json` binds all eight failing regression jobs to their job/run/head, URL, original UTF-8 bytes and SHA256. Each `job-*.log.gz` is a deterministic gzip of the complete tool-returned log, retaining its BOM, CRLF, failures and slow samples. No excerpt was substituted. The two failed aggregate jobs summarize these failing shards; their status is not represented as a separate test failure.

- Windows rules 2/18 and POSIX 6/15: current ready-art architecture config failed to restore the required older GameUI config.
- Windows rules 16/18 and POSIX 13/15: the same incorrect feature config projection, plus an invalid reader rejected by the final M7 entry rather than the required GameUI entry.
- Windows rules 3/18 and POSIX 12/15: Watcher/Potion tests entered an old six-owner contract without first authenticating the complete newer owner epoch.
- Windows rules 7/18 and POSIX 12/15: the Actor policy fixture omitted the already-required `upgradeStasisHeld` function.
- Windows rules 18/18: whole Host seed 6, checkpoints 28–30, exceeded the unchanged 30-second child-process limit after checkpoint 30. This is a separate performance failure, not a source-identity failure.

## Actor repair

The fixture now includes `upgradeStasisHeld` in the existing required-owner list. Its own function and nested callback both undergo the original CC15 acceptance, exact CC16 rejection, missing measurement and missing entry checks. No production policy, source or threshold changed.

`actor-fixture-red.log` reproduces the actual missing-owner assertion. `actor-fixture-green.log` covers the complete responsibility-complexity file and Stasis owner-boundary file: 21/21 passed. The independent reviewer additionally ran the 19-test responsibility-complexity file alone; that result overlaps these 21 and is not added to the total.

## Source admission repair

The preserved raw-owner negative probes exposed a real ordering error. `preIntegrationSource` applied pure CI/planning inverses before current source admission. For architecture config, this stripped the Stasis/Wheel entry token into an older epoch, bypassed fresh current-owner authentication, and stopped at the wrong historical config. Authentication now runs first. The original art-feature test file and the original ready-art equality/negative assertions remain unchanged; both again require the same frozen GameUI `e50c2b19...` identity. An initial expected-only draft failed the original raw-owner probes and was discarded; its failures are retained.

The Watcher/Potion suite now composes the authenticated current epoch before the independently frozen seven-refactor epoch. Added tests bind the complete predecessor, exercise every fresh raw owner with warmed drift/missing/throw faults, and separately verify unknown root values pass through without linked reads. A missing-root draft initially hashed `undefined`; the corrected test keeps a valid entry token while faulting the linked reader, preserving the existing unknown-input contract.

No production Lua, frozen archive, original before-source identity, CI inventory or timing budget changes are part of this repair. Added frozen GameUI tests independently preserve the old positive path and all seven linked-owner drift rejections.

## Host event transport repair

The implementation keeps event JSON in JavaScript instead of encoding it as a Lua byte string, concatenating those strings in Lua, and decoding them back to JavaScript. Each event is still observed immediately with the same graph traversal and identity maps. The original checkpoint flush order, all 35 checkpoints, scenarios, windows, event counts, full equality, gzip framing and fixed size/time limits are unchanged.

The failing seed 6 / 28–30 sample was reproduced locally (new side 30,086ms timeout). The repaired pair passed in the original budget (old/new 23,493/25,385ms including decoding). An independently repeated original-old side took 23,237ms, so these timings cannot establish a stable speedup. The three complete decoded outputs are byte-identical: 44,529,985 bytes, SHA256 `07bd0eaa83ee9bc5ea6facca489b5c89d2ab8c24b9603cf4d860ce0dd72c668e`, with three TRACE and three EVENTS records. Seven cheap graph/collector regression probes passed. Original timeout, slow receipts and an accidentally started then interrupted extra filtered test are preserved rather than counted as successful validation.

The [Host evidence directory](../pr579-host-event-transport-20261110/README.md) describes the commands and limits. This is a targeted Linux result, not proof that the Windows job or Full will pass.

## Validation and current base

The final three source-admission suites pass 30/30. A bounded nine-file consumer run initially passed 88/90; generated art data was missing in one case and the complete calibration file subsequently passed 53/53 after the original builds. The remaining complete GameUI source consumer aborts at the local default heap. A sequential untouched-0f/candidate pair both reproduce the OOM: 41.76/41.26 seconds, peak RSS 2,396,144/2,377,908 KiB, unchanged Node 24.22.1 heap limit 2,348,810,240 bytes. This is a validation limitation, not a passing result. The static reverse-import inventory has 146 modules / 88 test files; the bounded tests do not claim the whole closure or Full. See [source repair evidence](../pr579-source-contract-repair-20261110/repair-summary.md).

While this repair ran, develop advanced to `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04` through #592. Its 14 changed paths remove Sprint scheduling rules; the only overlap with this PR is `docs/MILESTONES.md`. A local synthetic merge is clean, with no production Lua or source/CI contract change from the new base. The combined tree passes guidance, backlog verification and 48/48 task/roadmap tests. This temporary local merge object is not a feature-branch history change and was not published. Final review and hosted validation must bind the new current base, not reuse the old 1eb combination.

## Scope and remaining validation

Only the existing PR's failing test contracts and Host tracing implementation are being repaired. Potion Text and V4 Display private candidates remain separate. No new claim, production gameplay change, owner transfer, budget increase, omitted test, manual Full dispatch or GUI action is part of this repair. Full Windows/POSIX success, merge authorization and actual merge remain separate gates for the eventual published head.

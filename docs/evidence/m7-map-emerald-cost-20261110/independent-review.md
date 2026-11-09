# PR #591 Map Emerald: independent cost-evidence review

## Conclusion

**PASS, scoped to the four complete-file measurement gaps and this evidence-only continuation. Overall admission remains BLOCKED.** This is not a ready-to-merge review, timing-registration approval, new Hosted Full result, or permission to change capacity or gates.

Measured identity: HEAD `d6974c64cf082773878a47936f1bd488035da6d5`, BASE `1eb288472d7b33b7450eec97a624ca2ffa526f39`, tree `45f3708d4d82bdaef7ef800d09a0c6e3724c945d`. These local Git identities were checked directly. Publication and current remote/CI state require their own readback; this review does not independently recertify the earlier Hosted run.

## Scope and verification

The reviewer read the recorder, the four complete test files, the existing planner and worker safety implementation, the current Emerald source-epoch contracts, original cost receipts, repository guidance, and this continuation's README/manifest. No production, test, helper, timing-map, timeout, threshold, worker, shard or workflow changes were made. No complete test file, Full suite, or raw Lua fixture was rerun by the reviewer.

- The recorded commands each select one complete file with `node --test --test-concurrency=1`, both reporters, and no name/skip selector. Raw logs and static declarations agree on 4 + 3 + 5 + 5 = **17 passing tests**, with zero failures, cancellations or skips. Commands are serial in the recorder and their timestamps do not overlap. This does not establish that the shared machine had no other workload.
- All compressed/uncompressed log digests, native JSONL digests, totals, process statuses, and reported source identities were verified. Native file summaries are retained separately from the much larger Node-total and outer-process measurements. Rounding `ceil(max(wall, Node total))` gives **17,143 / 11,162 / 10,864 / 21,870 ms** respectively.
- Eight independently recorded before/after snapshot files have identical compressed and uncompressed bytes. Their complete tracked inventory has **8,234 paths: 8,059 concrete hashes and 175 explicit nulls**. Null is absence, not an input hash. It covers neither untracked/generated files nor node_modules. The concrete test, helper, timing and planner inputs checked against Git match the measured HEAD.
- The shared persisted snapshot and all 16 original-to-persisted path mappings match their source bytes. All 17 entries present in the continuation manifest at review time verified, including the revised README and the added Backlog/guidance/doctor logs. The report and audit result added by this review must be included when the publisher regenerates that manifest.
- The only tracked path that differed between measurement snapshots and the later audit checkout was TASK-74.20's Backlog bookkeeping. It was already disclosed as dirty at measurement and was subsequently updated. The snapshots therefore prove within-command stability, not that the entire measured checkout was clean HEAD or that all later bookkeeping is part of the measured state.
- All 15 persisted receipts referenced by the original `ci-cost-observations.json` verified. Its two paired before/after observations agree with the corresponding current concrete inputs. Earlier standalone observations remain explicitly supplemental without pre-run binding. The larger 13,573 ms calibration observation is retained conservatively rather than replaced by the shorter paired observation; the 16,574 ms Defect standalone observation is not promoted into a new strict current-input receipt.

The added logs confirm Backlog scope and guidance success. Doctor retains five duplicate-ID groups and 93 legacy archive-location warnings, with no repair applied. The revised README correctly distinguishes a separate evidence-branch publication from a new PR code HEAD and does not claim that branch as a Full-certified merge candidate.

## Planner cross-check

The review independently built the greedy weighted bins and compared them with the unchanged exported `partition` and `shardLuaScripts` results. It checked exact sorted inventory equality, total cardinality and uniqueness, not only set size. Every one of **800 JS files** is assigned exactly once on each platform; every one of **1,410 raw Lua fixtures** is assigned exactly once on Windows. POSIX does not run raw Lua.

The original 17/15 shape, first-shard initial load, 60,000 ms reserve, two-worker short-fixture pool, 10,000 ms exclusive safety boundary, existing costs and original targets are retained. No existing local floor is reduced. The independently reproduced results are:

| Planning input | Windows ms | POSIX ms |
| --- | ---: | ---: |
| Current committed timing map | 1,799,118 | 1,134,372 |
| Seven conservative complete-file observations | **1,801,318** | **1,137,160** |
| Headroom versus original targets | **−1,318** | **62,840** |

The supplied `forecast.json` matches. This remains a planning model, not an actual Hosted measurement, an isolated benchmark, or proof of comprehensive repository cost calibration. Five small adverse controls confirmed that the audit rejects a wrong log digest, a missing JS entry, a duplicated Lua entry, a null substituted for a required hash, and native-summary-only coverage of whole-process cost. These are audit controls, not additional gameplay or CI test executions.

## Unresolved and safe next step

1. The four previously missing complete-file observations are now supported. **The seven conservative costs have not been registered in `scripts/ci-test-timings.json`.** Evidence completion and registration are different deliverables.
2. A timing-map-only edit is not a safe isolated change: `preEmeraldMapCiSource` authenticates exact complete timing bytes, while the current calibration contracts preserve every previous floor and the exact current floor count/forecasts. Registration needs a separately reviewed, truthful contract integration that preserves historical assertions and accounts for any newly introduced complete-file cost. This review does not authorize bypassing those bindings or weaken them to accept arbitrary drift.
3. The Windows model exceeds the original 1,800,000 ms target by 1,318 ms. Repository wording that distinguishes performance targets from execution guards does not silently remove the explicit prior independent block. Keep the overrun visible and preserve overall BLOCKED until the outstanding integration/admission decision is explicitly resolved.
4. Retain the weaker provenance of prior standalone logs. No fresh strictly pre-bound Defect complete-file measurement is claimed.
5. Publishing this reviewed evidence on a separate same-repository evidence branch and linking it from the existing draft PR can preserve the existing PR code HEAD and avoid an unnecessary repeat Full. Verify the publication identity separately. Neither that evidence commit nor this report transfers earlier Hosted success to a different code HEAD, constitutes a ready-to-merge approval, or authorizes merging, queueing, expanding shape, relaxing assertions, changing workers or thresholds, or modifying protection.

Machine-readable audit result: `independent-audit.json`. The evidence-only recommendation leaves the original production/behavior/source review unchanged and does not replace it.

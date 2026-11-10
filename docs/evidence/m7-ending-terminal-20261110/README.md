# Ending terminal CI registration

Base: ab65ed3b5b4240eb653af4651a13c1b8c72b2e04. Recovered production slice: 57b277154ef1239fae4bcc4420607e01464f612c. No hosted or Full pass is claimed.

## Complete local observations

The three new files ran separately: behavior 14/14, source 11/11 and complexity 3/3. Each receipt records the command, interpreter, complete TAP output, wall time and before/after superset input manifests. `inputSha256` identifies raw compressed manifest bytes. Manifest `sha256` identifies raw file bytes; `lfSha256` is separately labeled where available. Captures include helpers, source, fixtures, generated Lua, tools, dependencies and historical evidence, but are not an OS-wide dependency trace.

The first behavior run passed 14/14 in 27,752.824ms but `.gitattributes` changed during the capture. It is explicitly unstable, retained as attempted evidence, and not presented as same-input validation. The stable rerun passed in 22,608.061ms. The planning floor conservatively retains the slower complete success at 27,753ms. Source uses 18,865ms. Complexity completed in 1,049.912ms and retains unknown10s without adding a local floor.

The four adapted CI consumers then passed complete individual runs: complete calibration 44/44 (13,687.042ms), host 4/4 (10,842.060ms), Windows shape 3/3 (10,382.245ms), runtime 13/13 (13,099.934ms). Their complete observed costs are added as local lower bounds. One earlier complete-calibration attempt failed at module loading because of an export spelling error; its raw log and input receipt are retained and not imported as a cost or successful validation.

Those complete CI measurements precede the final cost registration and final helper inventory assertions. Their manifests describe exactly those execution inputs, not the later helper/timing bytes. The final helper contract was separately run after registration and passed 2/2; final independent review is handled separately. The receipt does not claim a new complete historical source-test run merely because its old source bytes are projected for historical assertions.

## Historical and current boundaries

The CI inverse accepts only complete matching normalized bytes and preserves full predecessor bytes. It is imported only by the four CI test consumers and the new CI contract. Shared integration source readers, linked-owner authentication, integration-ci-epochs and copy closure are not modified by this CI registration. Historical Formation800 and earlier inventories, source receipts and assertions remain frozen. The new independent contract authenticates the current exact 803 JS / 1,410 Lua inventory and uses live costs.

Hosted costs, all old local floors, unknown10s, worker safety, two workers, original Windows17/POSIX15 shape, concurrency12, 60s reserve, and original budgets are unchanged. Final planning forecast including reserve: Windows 1,798,303ms / 1,800,000ms (1,697ms headroom); POSIX 1,133,696ms / 1,200,000ms. This is modeled feasibility, not measured hosted runtime, and the Windows margin is narrow. No budget relaxation or matrix expansion is authorized by this evidence.

Final frozen-cost/helper validation: all four CI files ran together serially after registration and passed 64/64, zero failed/cancelled/skipped, 42,887.624ms aggregate. `final-ci-four.log.gz` retains complete TAP, and `final-ci-four-receipt.json` records raw log hashes plus after-run file identities. This aggregate is not a per-file cost observation and does not replace the earlier individual measurements or claim a before/after snapshot. Explicit LF attributes protect all current raw-hash-bound tests on Windows without weakening their raw-byte assertions.

## Production and source validation

`metrics.json` binds all338 production modules and complete before/after reports. `baseline-quality.json.gz` / `current-quality.json.gz` and architecture reports preserve the original machine output. The unchanged graph has1929 reference positions,1558 dependency pairs and SCC68/11/2; terminal CC39→5, helpers at most13; full-library >CC30 33→32 and >CC15 209→208. Existing identity CC17 and maximum61 remain explicit residuals.

`ending-tests-first.log.gz` preserves the original three-file28/28 pass, including831 complete graph checkpoints per VM and ten actual semantic mutants. It is not a per-file timing measurement. `original-responsibility.log.gz` preserves the original19/19 guard suite. `guidance-backlog.log.gz` records successful checks after restoring the baseline `.cursor` input omitted by sparse checkout. The first missing-guidance failure and five pre-existing Backlog duplicate-ID groups are recorded rather than treated as passes.

Independent technical review and its original logs are stored under `review/`. No same-candidate official import, ready, PC, phone, release or merged-commit validation was performed.

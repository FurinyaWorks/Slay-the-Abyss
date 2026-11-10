# Independent review: seed-42 Emerald fixture construction

Verdict: PASS for this narrow test-fixture optimization. No blocking findings. Exact reviewed input hashes and executed checks are recorded in `review.json`; subsequent edits require renewed review.

## Reviewed implementation

The fixture now builds one seed-42 RNG snapshot before installing dependency trace wrappers and deep-copies it for each scenario. The snapshot contains only a plain root table, a plain words array of two strings and a scalar counter. The existing copy implementation allocates a fresh memo and recursively copies table values. Its limitations for table keys/metatables do not apply to this snapshot. No scenario results, production draws, authorization decisions or VMs are reused. All original scenario and checkpoint code is retained byte-for-byte apart from the two explicit setup edits.

The historical fixture is identical to the original HEAD Git blob `e137d19eccee94692f6f166ebc60bf560bec5578` and the original paired-run input. The new inverse accepts only the exact current normalized fixture bytes at its one designated path. It leaves old, changed, non-string and foreign-path inputs untouched. Historical receipt projection is separate from the new controls, which receive raw disk reads. The original ten-test Emerald file, VM, observer, owner/source proofs, production files, CI budgets, timings and cost contracts are unchanged relative to HEAD.

## Independent narrow checks executed

- Ran both new registered fixture tests directly, without executing the complete calibration file.
- Confirmed separate same-VM map/RNG/words identities, template isolation, mutation isolation and pristine subsequent construction.
- Executed the three adverse fixture controls: shared snapshot, shallow words alias and incorrect initial words. Each is rejected with its intended diagnostic.
- Executed exact LF/CRLF, altered source, foreign path and non-string inverse controls.
- Confirmed the frozen fixture's exact Git identity and unchanged protected paths.
- Independently checked the paired receipt against current/old source bytes and all 14 uniquely anchored mutations. All 17 expected rows are present; checkpoint totals are 17,529 on each side; before/after stream sizes and hashes agree per row; every mutant differs from the old non-integration baseline. The inspected runner compares the complete serialized graph streams and creates/closes a fresh VM for every run. The paired runs themselves were not repeated by this reviewer.

## Boundaries and remaining validation

The parent owns complete Emerald and calibration execution with fresh input snapshots. This review does not claim those runs or a full repository pass. Local paired aggregate timing is exploratory: it includes old/baseline proof runs and cannot be treated as measured normalized CI capacity saved. Existing timings and budgets stay unchanged, and capacity remains BLOCKED. There is no production, runtime, gameplay, shared #586 proof or Hosted-admission claim.

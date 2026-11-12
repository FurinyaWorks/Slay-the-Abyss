# Current Golden Idol source and production integration review

Scoped verdict: no blocking findings in the production/source integration reviewed here. This is not approval of the still-changing CI adapters, a final candidate SHA, Full CI, GUI, import, ready, or device acceptance.

Baseline: 6a614fc82697750ddb408750e54f59f801c24f1e. Historical slice: f1481459c.

## Production and guard

- src/lua/abyss_golden_idol_event.lua:24-65 is byte-identical to the original reviewed slice. Before fixture is byte-identical to current baseline production. The independent AST probe confirms unchanged prepare/options, extracted intro body, and exact short-circuit health expression.
- Lines 25-30 preserve leave admission, Circlet fallback, dynamic Run lookup, acquisition before trap publication, and failure detail arity. Lines 33-34 retain repeated health reads and short circuit ordering. Lines 37-53 retain curse admission, callback partial mutations/failures, blocked-curse state, damage failure order, max-HP reduction then HP clamp, and final stage assignment. No snapshot, cache, exception suppression or rollback was introduced. The helper return at line 41 is consumed locally; public success and rejection returns remain two values.
- scripts/check-lua-static.mjs:97 and 265 add the four helpers plus M.choose to required CC15 measurement and whole-module admission. Existing unrelated policies remain unchanged. tests/golden-idol-responsibilities.test.mjs retains semantic, nested-function, actual pinned measurement and missing/duplicate/coordinate negative assertions.

## Source integration

- tests/helpers/combined-epoch/pre-golden-idol-source-epoch.mjs is exactly the whole baseline facade, preserving current component/room/joint UI chains. Runtime projector is unchanged from baseline.
- tests/helpers/golden-idol-source-epoch.mjs:8-20 verifies compressed and uncompressed current archive identities, authenticates the predecessor binding (including metadata), preserves prior metadata and historical targets, and adds the Golden Idol owner/target. Its currentTreeCommitted=false and collected-base role avoid claiming the refactored production is committed at baseline.
- Lines 21-35 reuse a deeply frozen graph through the existing validated runtime option. No new owner authorization cache exists. Wrapper raw-reader ownership, target validation and foreign input fallback remain intact. Current tests add live 80-owner LF/CRLF/warm-drift and malformed-reader checks without weakening historical tests.
- copy-integration-source-closure.mjs adds authenticated hashes for the current wrapper, frozen predecessor, adapter and new archive. The original Golden Idol archive remains byte-identical to the recovered slice.

## Independent evidence

identity-probe.mjs / identity-result.json: passed production and AST identities, baseline wrapper/runtime identities, all 45 historical evidence file byte identities, both historical archive identities, and historical old/new graph equality (a965a9a74bece6e0f66269f660ec40bac2f8ae435d1b4d89cc0b3fdf63cff5d4).

The preserved historical review/receipt remains valid for its explicitly bound 1eb working bytes only. Its 52-owner/802-JS figures and old full-file timings are not current integration acceptance. No old receipt was relabelled as current evidence.

Source-negative result is recorded separately after its independent live-owner probe completes. No duplicate source11 or Full suite was run.

## Limits and follow-up

Backlog overview/execution attempts returned command not found; no task state changed. Index still contained unresolved cherry-pick entries during review, which parent must resolve and bind to the final candidate. CI helper adaptation, current timing/inventory, current evidence receipt and final attributes remain outside this scoped verdict and need incremental review when stable. No production or test files edited; only reviewer artifacts written.

Independent live-owner probe outcome: incomplete, process killed with exit 137 during facade import; no result artifact and no assertion failure were produced. This does not invalidate the passed independent AST/byte probe, and is not claimed as a successful source runtime test. Parent-reported source11 execution is separate evidence; resource failure should be retained.

Incremental formation consumer review: tests/encounter-formation-source-epoch.test.mjs:153-155 only updates the current UI facade count 79→80 and adds exact final Golden Idol owner identity. Its per-owner order/warm-drift behavior and original 51-owner predecessor assertions remain unchanged. No finding in this bounded adaptation.

## CI incremental review (pending one correction)

Independent ci-probe.mjs / ci-result.json passed all nine exact current-to-6a source bindings against Git, LF/CRLF admission, BOM/lone-CR/drift/non-string/unknown-path rejection, complete 836 JS inventory and duplicate rejection, all 488 source-receipt input hashes, compressed/plain source log hashes, and exact prior timing JSON after removing only the added source floor. The 32448 ms floor retains max(historical floor, ceil(current 21629.418911 ms)); behavior remains unknown10000. Current tests use actual production planner for the new 836JS/1415Lua, 18 Windows/15 POSIX/Full38 workload and preserve prior assertions via exact baseline views. No production scheduler, workflow, concurrency, Lua worker, budget, or execution timeout changes were found. .gitattributes only adds authentication/evidence byte preservation.

Open finding: ci-complete-calibration-source-inverse.mjs adds eager preGoldenIdolCurrentCiSource at lines 64/145/163 before each function's supported-path gate. Unsupported path calls return intermediate historical bytes instead of original input: preCombinedGateSource(timings,live,'unknown'), preCombinedPlanningSource(gate,live,'unknown'), originalPlanningSource(gate,live,'unknown') all changed input in the independent reproduction. Parent referred correction to author; final approval withheld until bounded fix/negative checks.

## Final code-candidate incremental disposition

The unsupported-path finding above is resolved by explicit path conditions on all three new Golden Idol projections. Independent ci-boundary-probe.mjs passed 63 checks: original three counterexamples, every legal target with exact LF and CRLF constructed from normalized LF, one-byte changes, and unsupported paths under valid/invalid targets. Existing unknown-target behavior is retained: gate/combined planning reject authenticated unknown targets; originalPlanningSource preserves its pre-existing fallback, now tested against exact predecessor behavior. No intermediate new Golden Idol projection is exposed on unsupported paths.

Reran the lightweight ci-probe after archive refresh: all nine predecessor bindings, 488 input hashes, inventory, encoding/drift negatives and timing preservation passed. Reran identity-probe: production and baseline AST/bytes, runtime, all 45 old evidence files and old archives still match.

Final scoped code verdict: no unresolved findings in the reviewed production, complexity guard, source composition, formation consumer, CI adapters, current receipt, cost-floor and attributes candidate. See final-bindings.json for exact reviewed bytes and unresolved:[]. This supersedes the earlier pending-correction disposition, not its retained reproduction history.

The serial regression log was still growing when inspected; its successful partial lines are not counted as a full pass by this reviewer. Final docs/task edits, final commit identity and completed final-suite result must be checked by the parent separately. Full CI, GUI, import/ready/device and publication remain unperformed. The earlier source-import exit137 is preserved as incomplete and was not retried.

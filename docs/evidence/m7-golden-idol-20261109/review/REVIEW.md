# Independent Golden Idol boundary review

Verdict: no blocking findings in the reviewed working bytes. Binding manifest: bindings.json (base 1eb288472d7b33b7450eec97a624ca2ffa526f39). This is not a claim about unreviewed subsequent commits or full CI.

## Production responsibility review

- src/lua/abyss_golden_idol_event.lua:23-60: intro admission/acquisition, health validation, injury acquisition, and trap settlement preserve the old operation order. No acquisition callback is cached. Two-result returns, including nil failure details, remain two-result returns; callback extra returns were and remain discarded.
- Lines 32-34 retain short-circuit validation and every repeated property read. No cached health value is introduced. Event stage is resolved by the same repeated reads before branch dispatch.
- Lines 36-52 keep direct-call partial mutation observable on downstream rejection or throw. Helpers do not invent rollback or swallow exceptions. Public rollback ownership remains in unchanged abyss_nodes_events.lua:284-285 and abyss_run.lua:32-50. That outer transaction stages the complete graph and suppresses publication after rejection or throw.
- scripts/check-lua-static.mjs:97 and completeResponsibility selection budget the named entries and the entire module, including anonymous nested functions. Existing current/pinned-tool tests check missing, duplicate and displaced measurements as well as real over-budget mutants. No budget or oracle was relaxed.

## Independent adversarial evidence

Fresh adversarial.lua / run-probes.mjs exercise 907 checkpoints in each old/new VM. 18 stage/choice combinations receive 49 operation-failure settings each; throws occur through flow, run, event and dynamically resolved Run accessors, writes, and callback invocation. Another 25 cases change health on successive reads. Results capture packed pcall returns (including explicit arity), the exact error-object alias, all trace operations, and state after each failure.

Both complete graph files are byte-identical, SHA256 a965a9a74bece6e0f66269f660ec40bac2f8ae435d1b4d89cc0b3fdf63cff5d4. These probes supplement rather than duplicate the author's 98 graph comparison, eight semantic mutants and real complexity guards. Graphs, fixture, executable runner, and VM result metadata are retained here.

## Historical and current source contracts

- The frozen before Lua fixture is byte-identical to Git at the stated base, not merely equivalent parsed content.
- combined-epoch/pre-golden-idol-source-epoch.mjs is byte-identical to the base public facade. Encounter tests now intentionally import that frozen 51-owner epoch. Existing assertions remain intact.
- New public facade adds the Golden Idol outer epoch with 52 owners. It preserves predecessor metadata/target records, authenticates the changed predecessor, and labels uncommitted current production bytes honestly. Archive hashes and copied isolated helper hashes remain enforced.
- Source epoch review found no authentication cache or weakened owner checks. New tests cover actual LF/CRLF disk readers, missing/tampered owners after warm success, malformed reader/unknown target rejection, strict config token preservation, immutable proof metadata, and isolated closure loading.

## Limits

No Full suite, publication, merge, live computer interaction or gameplay validation performed. Backlog CLI was unavailable on PATH; attempted overview returned command not found. No task state was modified. Commit binding must be finalized against the parent's final SHA by comparing every file in bindings.json. Targeted epoch test output is retained as epoch-tests.tap; read its final summary for execution outcome.

Targeted execution completed: 22/22 Golden Idol and frozen Encounter epoch tests passed, zero skips/failures, 33.658 seconds.

## Follow-up CI adapter review

No blocking findings. Read-only verification, no test rerun. The new adapter accepts only exact normalized after hashes, retains non-string/foreign inputs, checks compressed/decompressed archive identity, and binds all six predecessor sources to actual raw base Git bytes. Current receipt verification independently checked all 385 declared input hashes successfully.

The timing delta adds only one ceil(32447.110123)=32448 ms local complete-file planning floor, explicitly not a hosted observation. Historical 800-file inventory and cost assertions are retained with exact predecessor source projection. The new live 802-JS/1410-Lua assertions use real current discovery, current planner and unchanged Full37/shard budgets. They authenticate the complete original Lua inventory, preserve old timing JSON after deleting only the new floor, and validate the full receipt/log identity. Historical planner wrappers retain the old known-platform behavior; live workload uses actual production planning functions. No execution policy, timeout, safety cost, unknown cost, worker count, concurrency or workflow shape change was introduced.

CI-adapter-related reviewed hashes were appended to bindings.json. The expanded .gitattributes list only enforces LF authentication for the new text fixtures and helpers.

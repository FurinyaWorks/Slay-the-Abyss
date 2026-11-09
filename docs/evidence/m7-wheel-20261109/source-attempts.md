# Wheel source validation attempts

- Initial complete-file attempt failed at Node's default heap limit. Full output is retained in source-initial-heap-failure.log.gz; this exploratory run did not capture before/after input identities or independent wall duration and is not timing-floor evidence.
- Second attempt retained a full input receipt and failed at the same default heap limit. Removing redundant deep copies alone did not solve the duplicate imported epoch graph.
- The isolated helper-copy proof was moved to a fresh Node process, comparing complete proof digests and historical projections, without changing heap limits or deleting proof coverage.
- Third attempt completed 4/5 tests. The negative linked-reader case incorrectly corrupted the requested source, which correctly remained opaque. The test now corrupts a separate linked owner.
- Final complete-file source run is recorded separately in source-final.log.gz and source-final-receipt.json. No prior attempt is treated as a passing floor.

## Later final-tree identity qualification

The successful source receipt's `inputsUnchanged` describes equality of its 1,035 captured paths immediately before and after that run. It does not mean every captured path still equals the later final tree. Subsequent behavior-test work changed `tests/helpers/wheel-event-vm.mjs` from SHA256 `327c6b896f6906e26d621c195adaa4d37867283b3b746488e55edee8a7ddc8ee` to `447b3a03f67f4ec253b8dff64a3112fa9dfcdaa6e702d80ecca30686507dcb30`. This is the sole later mismatch in that captured set.

The supplementary audit (`source-final-scope-supplement.json`, reproducible with `node docs/evidence/m7-wheel-20261109/audit-source-final-scope.mjs`) enumerates 20 transitive source-test modules, fixed URL data reads, all 134 isolated-copy manifest paths, and the bounded production/fixture readers. All 477 relevant paths retain their original run identities. The changed Wheel behavior VM is neither imported nor copied by this source test, and the generated isolated child only imports the copied source epoch. The receipt runner included the VM because it conservatively hashed all helpers and fixtures, not because this test executed it.

The original successful receipt and log are unchanged. Their 5/5 result and 23,093 ms wall measurement remain evidence for the executed source-test closure, not a rerun of the final whole captured tree. No cheaper rerun or retrospective replacement of captured hashes was performed. Stasis and integration receipts are separate runs.

## Final CI-helper correction supersedes the earlier inspection

After the preceding inspection, the exact historical CI shape adapter changed `tests/helpers/reward-query-planning-contract.mjs` from SHA256 `5ed5306daeb974afee9401f628062ccfdbfc05e8b4fb90c95c27356ff967aad1` to `2d13b4cae4a75b01e21535be6b6012505268bc029fc33de2b3daa0a260ce8b9b`. The successful Wheel source receipt now has two later captured-path mismatches; Stasis and integration each have one. The earlier one-mismatch supplement and script remain unchanged as records of that earlier inspection.

The current supplement is `source-successful-scope-supplement.json`, reproducible with `node docs/evidence/m7-wheel-20261109/audit-successful-source-scopes.mjs`. It resolves static imports, literal dynamic imports, the integration test's finite 16-case template imports, fixed data URLs, isolated-copy manifests and bounded production readers. Neither later changed helper appears in an executed import/read/copy path for these three source tests. No affected source suite was rerun solely to update overcaptured hashes.

Verified scope: Wheel source 477 paths / 20 modules; Stasis 482 paths / 22 modules; integration 475 paths / 74 modules. All relevant paths that were captured at run time retain their original hashes. The Stasis audit additionally found three transitive scripts not captured by its original receipt: `scripts/build-lua-data.mjs`, `scripts/build-original-v4.mjs` and `scripts/validate-data.mjs`. They currently match the fixed ef6b baseline, and the test only uses `luaString` to construct preload text, not their guarded build entry points. This is supplementary current identity, not retrospective execution-time capture; the Stasis receipt must not be described as a fully captured transitive closure. The integration audit checks the 134-file copy manifest as a conservative extra superset; that test itself does not execute the copy helper.

All three original successful receipts/logs and the earlier supplement are preserved. `inputsUnchanged` continues to mean before/after integrity during each execution, not equality with every later final-tree file.

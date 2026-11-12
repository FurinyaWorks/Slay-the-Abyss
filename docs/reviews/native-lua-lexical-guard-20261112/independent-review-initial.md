# Independent native Lua guard review

Reviewed against base 3a061a76b5eb917ac0f4213c01a9cbafd28d1824. No implementation edits performed.

## Finding
ADMISSION BLOCKED by one current source-proof diagnostic expectation. No implementation blocker found in the narrow lexical correction. The lexer processes source order, masks literal content, and replaces skipped comment bytes with whitespace rather than joining tokens. The original unsupported-API patterns, empty-source behavior, post-guard syntax callback and writer remain intact. Lexer errors are surfaced as Lua syntax errors. luaparse 0.3.1 is already a dependency; no package or lockfile change.

## Independent verification
- 64 valid Lua lexical probes passed: five long-bracket delimiter levels, mixed comment/literal markers, escaped quotes and newline, all CR/LF variants, comment-separated forbidden calls, allowed os/debug APIs, and direct method exclusions.
- Nine callback/malformed/empty input cases passed. Lexically malformed source is rejected even if a supplied callback mistakenly returns null.
- git diff --check passed. Only scripts/native-script-batch.mjs and tests/native-script-batch.test.mjs changed. Reviewed diff retained beside report.
- Targeted historical/current source-provenance contracts: 23 passed, 1 failed in 88.3 seconds. The current pre-component diagnostic expects scripts/official-backdrop-layout.mjs as first unsupported owner, but now correctly encounters the changed scripts/native-script-batch.mjs first. Both feature/history projections reproduce this. Supplying only HEAD batch bytes through the read seam restores the expected backdrop error, establishing causality without worktree edits. See source-contracts.log and source-proof-probe.log. Frozen historical tests all passed.
- Potential narrow remedy requiring scope expansion: update the current diagnostic expectation to the new first rejected owner, preserving exact observed actual hash and frozen expected hash checks. Do not modify archived witnesses or normalize the new source into historical acceptance.

## Boundary and risks
This remains an API spelling guard, not a complete security sandbox or semantic API resolver. Existing dynamic/bracket lookup and alias limitations are outside this patch. Official platform/device validation was not run and no release or merge approval is implied. The available native toolchain fixture uses the same Lua 5.3 parser contract; no installed official platform runtime was inspected. Backlog CLI was unavailable, so task metadata was not edited.

Reviewed hashes:
- scripts/native-script-batch.mjs: 54eae1798a02579aaae864c708798f0ad976b64c2f0021c26d9a721cedddeb5d
- tests/native-script-batch.test.mjs: 79c474f96bf869ca3e18de1f81baa7d78e8979b9baf566018380acf3cb49b4a3

Reviewed diff SHA256: 13129b0d53f674b650cce6c3cfd831c97618a1467c72e506ad990244060e4998.

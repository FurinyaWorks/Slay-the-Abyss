# Hosted checkout pack guard independent review

Status: PASS for the reviewed local source scope; not final merge admission. Base: `6a614fc82697750ddb408750e54f59f801c24f1e`. Reviewed code HEAD: `1e88a4c451bf39770e1eb5cbbb5d63bbb6f7c019` (tree `5fc7033e70d0f8422322775c6d1dbc9b3458fa72`). All five committed files match the independently reviewed working-tree SHA256 values in `independent-review.json`.

## Verified so far

- Independently reran the five selected tests (`hosted|lightweight|every Fast`), including the new workflow projection: all passed. This is not the complete test file and is not Full.
- Compared the complete self-hosted checkout step with the base: byte-identical. Original checkout action pin, exact SHA, depth 2, credential setting and timeout remain unchanged.
- An independent real three-object Git fetch produced zero retained packs without the env override and one 202-byte pack with the exact override used by the workflow. The process environment works without persistent Git configuration or credentials.
- Independent CLI error probe confirmed an unwritable summary destination returns exit 1. A `.pack` symlink is rejected. Existing new tests cover invalid/mismatched SHA, missing summary/no packs, non-regular packs, and strict >32/128 MiB boundaries including the rejected payload in the summary.
- Hosted preparation occurs before checkout, retains an empty-database prerequisite, and the guard runs after checkout but before setup-node/dependencies. Runtime filesystem errors fail closed.
- This measures retained compressed Git pack bytes after checkout, not network bytes or LFS payload. It does not cap bytes before the download, or cover later separate comparison-base fetches.
- `git diff --check` and direct network-policy CLI passed.

## Finding resolved

The new static policy checker accepts deletion or wrong value of preparation's `EXECUTION_ENVIRONMENT` binding. Initially both mutations returned `[]` despite disabling the `.git` prerequisite. Parent added the exact binding and negative controls. Independent retest now rejects both mutations; before/after evidence is retained. The actual reviewed workflow has the correct binding; this is a policy regression-coverage gap, not evidence that its current hosted run skips the check.

## Narrow projection helper reviewed

Parent reported a historical workflow digest test correctly rejecting the nine new workflow lines. The narrow exact reversible hosted-workflow projection helper now precedes the existing Draft projection. It inverses only the three complete unique additions; missing, duplicate and changed fragments remain visible. Direct byte-for-byte comparison proves the projection equals the base workflow. LF/CRLF, partial, duplicate, and unrelated drift controls pass. The complete ci-summary-runners test file passes 7/7, with original historical hashes untouched. Existing ci-downloads test bodies were independently verified as preserved verbatim. No unresolved findings remain in this local review scope.

## Limits

PowerShell is unavailable here: original self-hosted long-running workflow regression and real Windows preparation were not run. Local Node is v24.22.1 and Git 2.52.0, not the pinned CI runtime. No actual GitHub-hosted checkout action or required CI/Full was executed by this reviewer. The local committed code SHA is verified; remote head/base, required CI and branch protection were not verified. This document cannot authorize final merge admission or replace exact-head required CI.

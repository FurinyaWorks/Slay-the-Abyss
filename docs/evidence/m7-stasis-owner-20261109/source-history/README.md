# Stasis source-history evidence

All paths below are relative to the repository root. Collection base: `4a51905537fa223e5df4e5ee475152c8a6629af5`. The evidence directory is `docs/evidence/m7-stasis-owner-20261109/source-history/`.

`artifact-manifest.json` records every preserved input/output artifact, its stored SHA256, original uncompressed SHA256, sizes and compression. `history-manifest.json` binds all 16 edited/added history files and the four production/configuration inputs. `historical-replay-provenance.json` binds the complete original Actor/Powers/Stasis sources at the statusView original, lifecycle original and collection base. Powers and Stasis are identical at all three revisions. `original-summary.md` is the original working summary, preserved without rewriting its execution-local paths; this README is the portable navigation and reproduction guide.

## Actual executed results

| Run | Result | Node duration | Evidence files in this directory |
| --- | --- | ---: | --- |
| Complete new source epoch | 5/5 pass | 17207.999469 ms | `source-final.log`, `source-final-receipt.json.gz` |
| Complete Formation source epoch | 11/11 pass | 18022.917445 ms | `formation-final.log`, `formation-final-receipt.json.gz` |
| Selected current source-bridge consumers | 16/16 pass | 7969.686318 ms | `source-consumers.log`, `source-consumers-receipt.json.gz` |
| Selected frozen Actor/Combat/statusView replays | 4/4 pass | 31470.277237 ms | `actor-replays.log`, `actor-replays-receipt.json.gz` |
| Selected earlier epoch live-reader cases | 3/3 pass | 9481.321052 ms | `older-live-readers.log`, `older-live-readers-receipt.json.gz` |

Complete new-source wall time was 17550 ms; complete Formation wall time was 18469 ms. Selected-case runs are not complete-file timing evidence. Other independent validation may have been active; these are local planning observations, not hosted measurements or timeout changes.

The optional explicit Git-based developer helper `tests/helpers/actor-damage-parity.mjs` received **syntax validation only** (`node --check`). Its multi-fixture replay was not executed. `git diff --check` passed. No Full suite, broad all-epoch suite, user-device operation, publishing or commit was performed by this evidence worker.

## Reproduction

From a checkout containing the file identities in `history-manifest.json`, install the locked dependencies and prepare the normal generated Lua inputs required by the existing repository test runner. The exact existing `build/lua` input hashes are retained in each receipt. Inspect the matching receipt before interpreting a rerun as equivalent.

```sh
node --test tests/stasis-owner-source-epoch.test.mjs
node --test tests/encounter-formation-source-epoch.test.mjs
node --test --test-name-pattern='current source and configuration' tests/integration-source-epoch.test.mjs
node --test --test-name-pattern='complete frozen source matches|owner|statusView exact frozen' tests/actor-lifecycle.test.mjs tests/combat-lifecycle.test.mjs tests/actor-status-view-responsibility.test.mjs
node --test --test-name-pattern='seven-refactor exact outer epoch|live LF and CRLF raw owner reads' tests/seven-refactor-source-epoch.test.mjs tests/silent-final-source-epoch.test.mjs tests/defect-final-source-epoch.test.mjs
node --check tests/helpers/actor-damage-parity.mjs
```

`run-stasis-history.py` is the exact executed receipt wrapper, not a newly rewritten probe. It captured broad before/after source, helper, fixture, configuration and generated-input hashes plus command, exit status, wall duration and log identity. Its absolute worktree path documents the execution location. To reuse this wrapper elsewhere, create a local copy and replace only that root path with the new checkout; do not alter the archived original.

`build-stasis-epoch.py` is the exact final executed archive generator. Its complete predecessor-proof input is a reproducible generated duplicate, omitted from this committed directory. `predecessor-proof-identity.json` preserves its exact original compressed/uncompressed hashes, byte lengths and fixed-base facade identity; the original bytes remain locally in `/tmp/stasis-prior-proof.json` and `build/stasis-history/stasis-prior-proof.json.gz`. The generator verified full `git show` source equality before preserving the predecessor binding objects exactly. Its absolute worktree and `/tmp/stasis-prior-proof.json` input paths are historical execution locations; use local copies and equivalent relocated paths only in a disposable reproduction checkout. Frozen prior archives need not be regenerated. The packaging-only reconstruction script reads their immutable facade, verifies both its exact SHA256 and the complete generated proof SHA256/length, and only then optionally writes a new file with exclusive creation. It does not weaken or replace the archived executed generator.

```sh
# Verify the deterministic reconstruction without writing:
node docs/evidence/m7-stasis-owner-20261109/source-history/reconstruct-prior-proof.mjs
# Or write a verified fresh input (the destination must not exist):
node docs/evidence/m7-stasis-owner-20261109/source-history/reconstruct-prior-proof.mjs /tmp/stasis-prior-proof-reconstructed.json
```

Use that verified output with a relocated local copy of the archived generator. Original gzip identity is historical evidence; the generator consumes the verified uncompressed JSON. `import.log` records the successful 53-owner/339-path import probe.

## Failure and identity qualifications

`source-initial.log` preserves the exploratory 4/5 failure. The new test incorrectly treated a JSON trailing newline as foreign even though layout admission intentionally accepts it. The test was corrected to a non-JSON suffix; production and projection-runtime code were unchanged.

The first generator attempt rejected invented `mode`/`rawGitBlob` fields on older predecessor metadata. Its error was retained in the tool transcript, not a local log. The archived final generator instead retains each exact predecessor binding after comparing the full base Git text. No invented reconstruction of that missing log is included.

The broad `source-final` receipt identifies one changed file, `tests/helpers/actor-damage-parity.mjs`, edited while that run was active. That optional developer helper is not imported by the source test. The tested source/configuration/static-import/archive closure remained unchanged. Do not claim equality of the entire broad inventory. The CI evidence worker separately narrows the stable actual closure. All four other listed final receipts report no broad input drift.

## Preserved contracts

The full current source inventory has 339 paths; the changed raw-owner union has 53 owners. The exact pre-Stasis facade remains independently importable. The new outer epoch changes only Actor, Powers, Stasis and architecture bindings while preserving all prior targets, metadata and frozen archives. Tests cover every current source byte, LF/CRLF, JSON token/layout admission, fresh linked-owner reads after warm calls, opaque foreign input, unknown-target rejection and isolated helper-copy closure.

Historical three-argument Actor replays use complete matching prior Powers/Stasis modules. Current and mutant Actor runs keep current dependencies. Actor Presence's historical VM already freezes its full handwritten graph. Existing historical assertions were preserved; the Formation, Silent-final, Defect-final and Seven-refactor tests receive coherent authenticated predecessor inputs.

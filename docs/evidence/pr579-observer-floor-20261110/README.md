# PR #579 observer planning receipt repair

## Cause and scope

Full run 42775370334 attempt 1 failed the Silent, Defect, Formation and Stasis planning receipt checks on both platforms. The optional `writeEvent` argument and `_EVENT_WRITE` bridge changed the complete current observer source, but the historical receipt readers still hashed that current file as their earlier input.

- [POSIX job 129693019603](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42775370334/job/129693019603)
- [Windows job 129693019889](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42775370334/job/129693019889)
- Current complete observer SHA256: `c75f1ed7356d1c2163e096af5765922593ad0081a53fb5f261d401d1d743a62a`
- Prior complete observer SHA256: `a93fb46a50b261dea20156bd1d0c2dfdfe06c912b13966ccb9568e6fe9229b3f`

The test-only inverse authenticates the complete current source before reversing exactly those two edits, verifies the prior digest and exact forward reconstruction, and applies only through the historical reader. Raw-current identity is checked separately. Uniform LF and CRLF are accepted; mixed endings, missing, foreign, partial and drifted inputs remain unprojected. No runtime observer, production Lua, frozen source or receipt, historical digest, timing, budget or test inventory was changed.

## Local validation

These are separate outcomes, not an aggregate count of unique tests:

- Exact original four-case RED: 4 failures, all the expected observer digest mismatch, after local data/UI/map generation. The earlier run lacking generated prerequisites is retained separately as `red.log.gz`.
- Complete `ci-complete-calibration.test.mjs`: 54/54 passed, zero skipped.
- Focused strict projection: 1/1 passed. This repeats a case included in the complete calibration file.
- `pure-source-projection-cache.test.mjs`: 6/6 passed.
- Five current-observer runtime equivalence cases from `game-ui-host-result.test.mjs`: 5/5 passed; not the complete Host result suite.
- Six complete source/consumer files: 32/33 passed. The sole failure was the isolated worktree missing pinned Luacheck, not a failed source or behavior assertion. After copying the existing binary and verifying its configured SHA256 through repository setup, the affected Silent CC15 case passed 1/1. The original failed run and targeted recovery are both retained; no all-green rerun of that entire six-file batch is claimed.
- Independent hygiene: JavaScript syntax, guidance (`errors=[]`), and Backlog scope/owner/priority checks passed.
- Independent probes rejected all 6,065 single-character mutations, recovered the exact prior Git source, verified the current runtime source unchanged, and checked LF/CRLF, foreign paths and malformed inputs.

The six-file batch comprises `ci-host-timing-calibration`, `ci-windows-shape-expansion`, `class-potion-orb-source-inverse`, `watcher-actor-source-inverse`, `defect-integration-source`, and `silent-tactics-planning` test files.

## Evidence integrity and limits

`receipt.json` records uncompressed and archive SHA256 values. The two Hosted archives preserve byte-exact connector-decoded strings. They replace initial exports that added a terminal LF to POSIX output and normalized Windows CRLF; those initial exports remain recoverable in the preceding commit. All archives use deterministic gzip timestamps.

This is local source-contract validation on Linux. No full `npm run check`, new Hosted Full, rerun/dispatch, GUI, official import or device validation was performed. Local success does not replace required exact-HEAD Windows/POSIX CI or authorize merging. Publication and merge remain separate steps.

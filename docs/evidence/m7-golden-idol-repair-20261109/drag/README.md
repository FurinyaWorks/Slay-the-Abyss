# Drag historical replay diagnosis (no runtime repair landed)

Source: local b0277f2a, tree equivalent to PR #587 f1481459c2fb177c036eda1deb11a7ad2f18bd46. Linux Node 24.22.1; not hosted Windows performance certification.

## Observed failure

Quality 42581856147 / job 129043592318 / Windows Node 24.18.0 failed the original cases 8–15 at 30,102.3559 ms. STAGED 3988 ms, PROJECTED 4177 ms, BUILT 5196 ms; the private receipt recorded Lua start at 11970 ms from the parent call. Thus roughly 6.8 seconds precede the child-relative staging clock, and only about 18 seconds remain for Lua and cleanup. This particular job has no completed case output and last phase is Lua, not cleanup. #581's separately reported cleanup timeout is not evidence that #587 reached cleanup.

## Local measurements and adverse results

- Original raw slice: all eight original cases pass, total 27338 ms; STAGED351/PROJECTED467/BUILT1170 ms. This raw CLI uses its pre-existing heavy guard, not the explicit30s JS guard; elapsed time alone does not certify the latter.
- Explicit original30s CPU-profile run: timed out; last phase Lua11016 ms, BUILT1657 ms. The killed entry/Lua processes did not flush their CPU profiles. Parent/builder profiles are retained and cannot identify Lua CPU hotspots.
- Entry V8 statistical profiling under an external30s guard: terminated124; STAGED434/PROJECTED560/BUILT1445 ms. Profile includes substantial source-epoch initialization, but no claim of a complete or Windows CPU profile.
- Import-only measurement: historical-monster-ui-materialize imports in10424 ms; approved-battle-responsibilities adds494 ms. The former imports current combined sourceEpoch through game-ui-extraction-source-inverse.
- Narrow trial moved the approvedHistoricalBattleMonolith import from top level to its sole battle-refactor-render branch. Explicit original30s drag run still timed out, last phase Lua11030 ms; STAGED366/PROJECTED513/BUILT1438 ms. Trial reverted completely. No improvement established.
- NODE_OPTIONS --prof attempt was rejected by Node (exit9); raw error retained.

## Scope and result

Reviewed open #581/#582/#588 changed-file lists: no historical-monster-ui-entry, historical-monster-ui-materialize, or historical-runtime-root overlap. #582/#588 own scripts/test-lua changes; that file was untouched. Existing worktree/PR files were checked; only the trial helper was modified and restored. No production UI, frozen source/oracle, test body, assertions, timeout, worker, parallelism, cost floor, or downloader changed. No Full was duplicated.

No code repair is proposed from this investigation. Runtime source separation may be a useful follow-up, but requires preserving independently authenticated complete inputs and negative controls; bypassing current-source validation without that proof is not justified. The LF repair can proceed independently. All validation logs, including failures, are compressed here; the 9.2 MB raw V8 statistical profile is retained locally and its summary is archived here. Manifest hashes refer to uncompressed bytes.

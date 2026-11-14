# Release intent require regression

Base `31d11d23f92b3e98ee96380299692c6c456be407` is the reviewed Quick/name-guard candidate on #661 `f58958f8`. This slice does not modify the upstream PR branch or historic actor fixture.

The integrated feedback painter added `require('abyss_lowcost_art')` inside every actor paint. The exact Host route reproduced idle require calls 1500 instead of 900 in both before/after samples; final graph and visibility-write savings were already unchanged. Cache that immutable module reference at module scope, keeping the pose call at its original location. The module depends only on Theme and initializes weak-key state, not native controls.

First targeted reproduction failed at the original strict 900 expectation (19.83s). The production correction restored 900; the full test then reached a previously masked cold-host comparison: current actor renderer imports LowCostArt once, while the immutable historical before fixture predates it. Captured cold counts are before [867,253,1001,2062,0], after [868,253,1001,2062,0]. All other require/load/snapshot phase counts match. No new module load occurs; this is one lookup only.

The test now documents and checks exactly that cold import lookup, requires one current top-level declaration and no historical import, and checks complete phase alignment. All other phases, module-load/snapshot equality, idle 900, whole final graph equivalence, original fixture SHA and twelve LF/CRLF negative controls remain strict. No historic source, thresholds or CI selection changed.

Validation: build:data/build:ui passed. Full intent suite passed 14/14 with zero skip; architecture passed 349 modules/1978 edges. Independent review requested complete phase-array equality; final reviewed test run is recorded separately. Intermediate failing evidence is retained, not recast as passing.

This is offline Fengari/mock-native evidence, not official device or complete CI. Final integration still needs exact HEAD/BASE admission. Spent-counter art tint is an unrelated outstanding issue. Character experiments remain isolated. Two verified existing LFS PNG materializations are workspace-only and excluded from commits.

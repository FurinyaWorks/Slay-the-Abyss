# Quick native opening fixture repair

Input: PR661 `2b7f872e5777942918e139028cb3e79cb1f95e16`, develop `9f2f44e4`. Scope: only `tests/lua/game_ui_classes_failure.lua`, within the already approved TASK-108 opening transition integration. No production behavior, profile or source proof was edited.

The native confirmation call now starts an asynchronous opening preparation. The old fixture read `ui.run` immediately and cancelled the transition in its combat setup. On the exact current default build it failed with nil `run`, exit 1 (negative.txt). This was reproduced locally, not inferred from an old source run.

The fixture now drives the public `OnUpdate` scheduler, with a fixed 80-update bound, until Run/map publication plus transition and native-page readiness finish. It fails if the UI is disabled. It neither assigns Run nor bypasses/cancels the cover. Existing seven diagnostic/combat assertions remain; an eighth negative control proves a permanently covered page fails within the bound.

`build:data` and default `build:ui` passed. Repaired raw Lua entry passed 8/8, 11149 ms, exit 0. Actual native trace records ready at 0.35s and transition end at 1.75s. No full suite or GUI ran. This is an integration handoff patch, not merge admission: the fixture is registered in `integrated-ci-source.json.gz`; the original integration owner must regenerate its current source identity using the existing generator, retain all historical views, independently review and run the required exact-head CI. This small branch deliberately does not create a parallel source layer or claim frozen-source CI passed.

# Release/menu combination handoff (not admitted)

Exact parents: PR661 fbb455a502f436390a539f4d4f3181fb084be472 and PR663 ebe050dfd70caa9fc276aaa06c9a6bedbd77da0a; develop9f2f44e4. Neither original PR branch is modified. Earlier release-transition candidate7931 is not reused.

Four textual conflicts were resolved by retaining both architecture registrations, current release milestone entries plus navigation107, both repository identity test contracts, and the minimal red title layout with the Continue control styled using the same approved Start/Quit treatment. Continue is one existing 64-unit row above Start; no background redesign. It participates in the same hover/press animation and off-page cleanup; unavailable Continue clears feedback.

TASK107 navigation is preserved: the prior card-art107 belongs to closed unmerged research, not the current task set. Future restoration of that research must allocate a new ID, not overwrite navigation. No unplayed characters are integrated.

Validation: build:data and default build:ui passed; session navigation and mandatory choices passed (13.06s/10.68s). Initial third composed fixture tried the release-hidden legacy exit on an empty menu; it now tests the actual reachable titleQuit and single platform settlement. Additional native path uses actual OnStart/OnUpdate and generated V25 controls: prologue completion, title return, cancelled new game and continued original Run/map, without a second prologue or settlement. The final third entry passes5.52s. Intermediate test setup failures (default layout under V25 theme and capture through fixture facade rather than actual GameUI) are preserved, not production claims. Three-button hover/cancel/off-page tests pass698ms; restoring old release animation makes the new Continue assertion fail197ms. Architecture passes351modules/1988edges. No complete suite, GUI or device acceptance ran.

This candidate is a behavior handoff/backup, NOT merge admission. New composition and changed fixtures still require the existing integrated source/CI generator to bind current owners while preserving historical views, normal independent exact-head review and required CI. No frozen historical archive was rewritten or parallel source gate added. CI queued on either original PR is not evidence for this combined tree.

Stored console logs normalize only tabs/trailing whitespace for repository hygiene; results and failure messages are unchanged.

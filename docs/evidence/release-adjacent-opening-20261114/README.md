# Native deck opening fixture repair

Base: #661 fdfca5bf3f74718ccce560b249a22a5b1bd20370. #663 remains ebe050df; prior combined backup 2a187810 is not merged.

The real native boot now advances its existing public OnUpdate, bounded to 80 updates of .05 seconds, and requires the published Run/map plus both opening and page gates clear before accessing the deck. No production code or old sort/input/deferred-cell assertions changed.

Validation: all 3 deck-browser-reveal-reuse tests pass, including 100 sorts and real native delayed-grid paths. Replacing only the test with exact base reproduces nil run in boot (negative exit 1). Build data/UI completed. First local attempts were blocked by sparse experiments, unmaterialized LFS pointers, and missing default theme; exact LFS OIDs were fetched and verified, not substituted. Logs here normalize whitespace only.

Background follow-up is NOT fixed or included: a trial of the same real opening wait publishes Run and completes the transition but page readiness fails with requested art owner unavailable. Its wrapper preloads four scoped modules, not the matching portrait assets; further scoped-profile investigation is required. The trial was reverted. No assertion was relaxed to hide this.

Not Full, not merge admission, not device verification. Frozen history/current CI source identity needs the existing integration chain to incorporate this fixture, followed by exact-head review and normal required CI.

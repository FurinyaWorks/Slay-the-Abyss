# Release integration low-cost fixture repair

Base: PR #661 `f58958f84a9f36c12918b8f851176da7648a8b1d`.
Code candidate: `f52bbfbe` (cherry-picks of independently reviewed name guard `88faeb00` and default-profile fixture `0a5e7147`).

Hosted Quick 43574439868 / job 132385493921 fails in the default build at lowcost_art.lua:9 with nil pool. This candidate exercises default fallback without installing an official pool and retains the separate official 88-relic/42-enemy assertion. The optional-name guard is still absent from #661 and is retained as a separate small commit for the known shop regression.

Current-base verification: build:data and build:ui pass; tests/lowcost-art.test.mjs 3/3 pass, zero skipped, 11.85 seconds. Replacing only the Lua fixture with exact #661-base bytes makes the newly added default-entry test fail (exit 1, nil pool); restored afterward. Negative's test selection is only a deliberate mutation probe, not the passing suite.

Two existing LFS portrait PNGs were materialized from the previously verified identical local media, not committed. Prior receipts in lowcost-shop-name-guard-20261114 and lowcost-default-profile-20261114 remain historical evidence for their original bases, not this integration run.

Local only: publication remains blocked by unapproved renamed-repository writes. No remote write attempted. Not full Quality, not native/device validation, not release admission. Spent-counter art tint remains an independent unresolved behavior issue; source closure and final exact-head CI remain required. No character implementation included.

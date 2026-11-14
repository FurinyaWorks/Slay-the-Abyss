# Quick default-profile fixture repair

Base: `88faeb00ad76fe9b67c290798702a99418e28840`, the reviewed optional-name
lookup guard candidate based on PR #654. This slice changes tests only.

The real Quick Lua discovery entry runs a default build, which intentionally
has no official artwork pool. The fixture now tests that default contract:
no pool, safe optional rendering fallback, visible relic, and actual detail
open/close. Official theme data still requires a pool and executes all original
88 relic / 42 enemy rendering, cache and reentry assertions. The JavaScript
official test still demands its full sentinel, so a missing official theme
cannot silently take the default branch and pass.

Validation: build:data and default build:ui passed. Existing lowcost-art JS file
passed 3/3 with zero skips in 7.69 seconds, including the real runLua default
entry. Restoring only the old Lua fixture and selecting the default-entry test
failed on nil pool, exit 1, in 1.93 seconds; the fixed file was restored.
Logs normalize indentation and trailing whitespace only. Existing reviewed
portrait PNGs were materialized locally by exact recorded SHA256, not changed
or committed. No full suite or hosted Quick rerun, device check, or release claim.

Independent read-only review: /root/delivery/review_quick. Final commit is saved
locally only: new repository-name write approval remains blocked. No attempt
was made through old repository aliases or another route. Remaining #654 tint,
source/inventory and final integration gates are not repaired by this slice.

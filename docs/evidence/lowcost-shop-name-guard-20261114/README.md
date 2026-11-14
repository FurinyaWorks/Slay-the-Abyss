# Optional low-cost art sibling lookup guard

Base: PR #654 `181e4cde61532e13bac912119aca3dc503a4170b`.
Scope: do not concatenate absent/non-string/empty icon names before the protected
optional Art sibling lookup. Legacy/default controls safely retain the original
image; named official controls keep the original rendering path.

## Verification

- `build:data` and default `build:ui`: passed.
- Full `power-shop-boundaries.test.mjs`: 8/9 passed, including all four independent
  old/current behavior fixtures and the previously failing `shop_card_identity`
  (60.81 seconds). The remaining current-source identity test fails on the base's
  changed `config/architecture.json`; source receipts/inventory are NOT repaired
  or weakened here. Combined first run was 9/11, 130.55 seconds, not a green suite.
- The first official lowcost test did not reach Lua: local LFS PNG pointers caused
  `Invalid selection budget avatar96`. The two existing portrait PNG sources
  were locally materialized from an existing checkout and checked against their
  exact `selection-budget-v1.json` SHA256. No artwork changes are committed.
- `lowcost-art.test.mjs` then passed 2/2, 6.35 seconds: 88 relic / 42 enemy artwork
  coverage, original cache/reentry/gesture tests, and added invalid-name and
  missing/throwing sibling lookup cases.
- Negative control restored ONLY the old guard in the isolated worktree while
  retaining the new tests: 1/2 failed on boolean-name concatenation, exit 1.
  The fixed source was restored immediately afterward.
- Independent read-only reviewer: `/root/delivery/review654`, no blockers.

## Boundaries

This is a repair candidate for the existing PR, not a new release approval.
The default Quick `pool=nil` fixture issue, spent-relic color regression,
source/inventory closure, full CI, final develop integration, and actual official
client/device validation remain outside this slice and are not claimed passed.
No character experiment, policy override, new test-file discovery, or gate bypass.

Attached text logs normalize indentation and trailing whitespace only; the first-pass
file is a summary excerpt. Complete original logs remain available locally.

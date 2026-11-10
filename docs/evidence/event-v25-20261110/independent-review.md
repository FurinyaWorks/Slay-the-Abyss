# Event V25 independent review

Reviewer: /root/map_review. Read-only production review against feat/map-v25, 2026-11-10. Exact ten-file SHA256 identities (including supplementary preview/fixture files) are in reviewed-sha256.json. No production files or desktop input were modified by this reviewer.

## Conclusion

No remaining P1/P2 in the reviewed production/test diff. This is a scoped code conclusion, not final visual/device acceptance.

- V25 presentation is gated by layout.event.visuals, present only in V25 theme; ordinary theme fallback colours, figures and captions remain intact. Existing recursive theme conversion handles added hex colours.
- Title paper now stays left of narrative, with a test allowing 20px for fold geometry. Four rows clear narrative/footer. Neow option base and state chrome now follow the existing runtime option dimensions rather than retaining 700x88 styling.
- Potion option formatting joins only the first newline and preserves content. No RNG, Run/Map mutation, event transactions, ownership callbacks, or gameplay commands changed.
- Match removes an unsupported property assignment. Installed SDK hit eligibility accepts static Image/Text only when raycastTarget is explicitly true; their native tables do not define it. Existing CursorArea remains the input target. The special SDK report also records actual pointer transition match-board to match-reveal and releases controls to zero.
- Extracting art/description/ink helpers preserves the previous expressions and branch conditions.

## Findings closed

1. P2: earlier title ribbon overlapped narrative. Repaired by 432px paper / 410px title centred at -372 and horizontal clearance assertion.
2. P2: strict Match mock initially failed to catch unsupported raycastTarget writes because the fixture already had a raw key; shared metatable mutation also affected other controls. Repaired by cloning each metatable and removing that raw key. Restoring the old production write now fails at match_event_ui.lua:24 (negative exit 1); current source passes all five Match cases. Logs: match-negative.log and match-green.log. The negative wrapper only overrides module loading and does not modify production.

## Targeted verification

- Current Match Lua suite: 5 PASS.
- Restored-invalid-write negative: FAIL as required, exit 1.
- Event readability/default isolation: 2 PASS via node tests/v25-event-readability.test.mjs. node --test spawn was denied by sandbox EPERM; direct execution passed.
- Existing special/report.json: passed, native full GameUI projections/pointers, stable 17310 controls, release 0. Forced fixtures are explicitly not natural-RNG or official-device evidence.

## Remaining evidence boundaries

Earlier ordinary-event screenshots showed the title overlap, now source-fixed. browser-special/neow-opening.png showed pink outlines/missing content; parent identified this as a discarded intermediate capture before sprite promises resolved. Reviewer subsequently inspected browser-special-ready/neow-opening.png and neow-blessings.png: image/paper content rendered, outlines gone. The discarded image is not acceptance evidence. The existing Neow top-aligned text sits against the oval bubble upper edge and partly outside its paper; reported as a pre-existing visual limitation, not introduced by this diff. Match-reveal ready screenshot was not present at review time. Final delivery screenshots remain parent verification responsibility.

No official-device import or mobile test was performed by this reviewer. Existing SDK/browser evidence cannot establish official-device asset availability, touch latency, GPU frame timing or visual parity.

## Final room/fixture supplement

No new P1/P2 from the small V25-only shop icon/name arrangement, hidden obsolete relic disc, or Neow bubbleText inset. Reviewer inspected finalized/browser-special/neow-blessings.png: text is now completely inside the paper bubble, closing the earlier existing alignment limitation.

map-game.mjs now preserves right-origin fills as Right instead of forcing Left. This changes only source-generated Simulator evidence, not formal GIL generation or production room logic. New event-simulator-fixture test compares actual generated native-save nodes with authored layout by path for both direction and proportion. Independent direct comparison of finalized generated layout/save passed for 352 fills, including 350 right-origin fills. Running the generation test itself was blocked by sandbox child-process EPERM (direct generator also fails spawning Python); this reviewer does not claim that test locally passed.

Preview scripts explicitly copy data and reset seed-42 fixtures; compact rooms-only preview disables route navigation and removes other full-UI modules. They are useful interaction fixtures and clearly labelled as such, not same-run or full-GameUI acceptance evidence. Final camp/shop browser screenshots were not yet available at this supplement time; parent will supply them for visual follow-up.

## Final visual follow-up

Reviewer independently viewed all nine finalized actual browser screenshots: browser-final/{camp,shop,treasure-open,cleric,designer-four-options,library-picker}.png and browser-special/{neow-blessings,we-meet-again-long-potion,match-reveal}.png. Screenshot identities are recorded in reviewed-screenshots-sha256.json. All eleven reviewed source hashes are unchanged at this follow-up.

No new P1/P2 visible in these captures. Camp fire silhouette is coherent without the prior incorrect fill protrusions; shop relic icons no longer have obsolete black discs and item names/prices are separate; Neow text fits inside the bubble. Ordinary events keep titles clear of narrative, four options fit the frame, and the long potion exchange description retains its second line. Match shows one genuine revealed card and eleven concealed backs, with no missing-image placeholder. Treasure and library projections have readable controls without the rejected missing-sprite outlines.

This closes the pending browser screenshot inspection above. These captures do not establish official-engine rendering or device interaction/performance. Parent reports formal GIL candidate write/static checks passed but verifyUI lacks startup evidence; official-device acceptance remains UNVERIFIED. No merge or release approval is implied.

## Preview cleanup follow-up

The unused full-Web-preview Lua path was removed. event-web-preview.mjs now unconditionally retains only eventFixtureNav/nodePanel/mapPanel and loads event-room-preview.lua, equivalent to its previously reviewed rooms-only branch. No production source hashes changed; only the preview builder changed and the unused file was deleted. The manifest now binds ten files. No new P1/P2; full GameUI SDK collector remains separate and untouched. Parent reports seven compact-Web entry points and healing transaction 120 to 85 passed; this reviewer did not rerun that browser interaction.

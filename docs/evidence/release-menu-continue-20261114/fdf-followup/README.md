# Follow-up against release fdfca5bf

Merge the current PR661 fdfca5bf3f74718ccce560b249a22a5b1bd20370 into the independently preserved PR661/663 combination. This retains its adjacent native readiness fixes and its exact current CI archive. Source PR branches remain untouched.

Only new behavior-test edit: formal_campaign_entry.lua retains exact string assertions but expects the actual navigation copy: confirmation exits the game, and continuation is limited to the current session. The same-run, cancellation, settlement, campaign admission, zero persistence and remaining route assertions remain intact. Independent read-only review verified both strings against abyss_game_ui_navigation_view.lua.

On the combined production build, the exact original fdf fixture fails the old copy assertion (negative log); the two-string patch passes FORMAL_CAMPAIGN_ENTRY_PASS4 in14769ms. No production logic changed for this correction.

The short-overlays discrepancy diagnosed on standalone old PR663 does not persist in this combined baseline. Existing PR661 helpers already build both historical sides from immutable complete cb1eac63 runtime/layout/fixtures, while current production runs a separate semantic contract. No helper or historical archive was changed here. A single bounded probe `runPair({scenario:'short-overlays',from:1,to:1})` at default seed1 passed: both historical streams had1547029 encoded /24143550 decoded bytes, exact equality; current semantic run returned status0. This is one checkpoint, not full Host scenario coverage. No trace filtering or hash-only workaround was used.

The combined production source and edited fixture current identity still require existing source-chain regeneration and the ordinary final independent SHA/CI gates. This follow-up is not merge admission, not a Full pass, and not a device validation. Test window released after all processes exited. Log tabs/trailing whitespace normalized only for repository hygiene.

# Explicit experimental Run: author verification

Shared frozen host: `663a294a35ebadf31616a91e19b016055db61cee`. Independently archived into fresh workspace and rebuilt Lua data; no shared edits.

`public-native-run.test.lua` actually completed PASS44 + PASS2:
-22 ordinary cards, both upgrades, fixed offer →close/reopen→claim→persistent deckUid→next real candidate battle→`Run.play`→original instance discard/exhaust. Duplicate claims reject; cardRng unchanged by the fixed choice; upgrade and deckUid survive.
- Explicit `Run.new(...,{experimental=true,candidateLifecycle={kind='ganyu',relicEnabled=boolean}})`; actual battle character/experimental flags asserted. No inferring a role from the deck.
-Both relic false/true configs are privately cloned. Across combat,HP carries while charge/field reset and resources have a fresh identity. Missing encounter rejection leaves the entire Run unchanged.

The initial extra HP assertion incorrectly expected33 after a victory. The default Burning Blood correctly heals6, producing39. The fixture was corrected to39, private clone/bool assertions added, and the complete44+2 suite rerun successfully. This was a test expectation error, not a host bug.

Also independently executed host `ganyu-run-candidate.test.lua`: PASS, including real post-`Run.play` reward publication failure rollback and retry, candidate-start failure after actual Combat creation, strict option admission and unchanged legacy defaults.

## Scope
The previous91ac8dd fixed-reward Run rejection is now resolved only through this explicit opt-in API. Tests use fixed offers, forced first-fight victory, selected actual received instances moved to hand, high energy/enemy HP; these are execution/ownership/transaction evidence, not natural draw, rarity/pool, balance or complete campaign evidence. Native22 remains experimental, not formal character registration. No new save format, approved names/types or human/device playtest is claimed.

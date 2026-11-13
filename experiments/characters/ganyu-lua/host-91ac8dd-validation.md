# Ordinary22 public candidate host: author verification

Exact shared commit: `91ac8ddf9bbad77624113609afb41b58e6039ad9` (replaces05d042a0, which was not released because a nonboolean experimental flag could enable admission).

The author independently archived this commit into a fresh workspace, rebuilt Lua data, and used `abyss_ganyu_native_cards.definitions()` and explicit `candidateLifecycle={kind='ganyu',relicEnabled=false}`. Shared native definitions byte-compare equal to the previously reviewed ordinary22 generated file. No shared files were edited.

Executed `node --test experiments/characters/lifecycle/ganyu-native-usecard.test.mjs`: PASS. This runs real50 usecard/retention cases,8 native modifier/exhaust/NoDraw cases plus2 post-exhaust-trigger-draw failure transactions, and gate suite (44 automatic variants,44 noncandidate rejections, shape mutations, strict nonboolean flags, prepare failure and native terminal checks). The new strict flag cases reject string/number/table rather than treating them as enabled.

Executed `public-native-terminal.test.lua`: PASS8 independent base/up12/57/61/73 last-enemy kills.12's synchronous trailing block still grants3/4;61's prior block12/16 remains;57/73 queued draw tails do not draw. All preserve Ganyu resources, original card object reaches discard/exhaust correctly, five UID instances remain unique/conserved, and replay rejects without state change.

## Remaining real Run boundary (not a pass)

Executed `public-native-run-boundary.test.lua` against the same exact host. A fixed reward for native01 can be claimed into persistent deck, and its deckUid appears in the next real Run combat. However that combat has no Ganyu candidate context: `C.play` returns `false, ganyu_native_unavailable`. `Run.startCombat` does not propagate `candidateLifecycle`. The script asserts this known current boundary, not successful gameplay or natural reward availability. It deliberately supplies a fixed offer and moves the actual received instance into hand. No production registration, natural pool or complete campaign approval is implied; further Run integration belongs to the shared owner.

This verifies the experimental battle slice only. Human testing, source/naming/type/balance approval and production release remain HOLD.

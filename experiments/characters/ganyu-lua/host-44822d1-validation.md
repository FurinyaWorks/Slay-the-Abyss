# Shared experimental starter launcher: author verification

Host: `44822d1a60d1177cb899c9ba8822ac580c5a67d3`, exported with `git archive` into a separate workspace directory. No shared worktree edits.

Executed against that exact archive:

- `node --test experiments/characters/lifecycle/ganyu-starter-run.test.mjs`: 1/1 passed.
- Direct Fengari execution of `experiments/characters/lifecycle/ganyu-starter-run.test.lua`: `STARTER_RUN_PASS`, `STARTER_PLAY_PASS 4`, `GANYU_STARTER_LAUNCHER_PASS`.
- `src/lua/abyss_ganyu_starter_source.lua` compared byte-for-byte equal to this branch's independently reviewed `starter-spec.lua`.

The public API is `require('abyss_ganyu_starter_run').new(D, seed)`, with module-owned generated source, not a caller-supplied bundle. The real Run constructor retains the candidate definitions using their independent candidate color and genuine character source identifiers. Checks cover 60 HP, ten unique deck instances, 3 energy / 5 draw, four initial card kinds through `Run.play`, bank-funded charged shot, original instance disposal and replay refusal, no inherited Burning Blood heal, input and cross-Run isolation, subsequent encounter HP/deck UID preservation and resource reset, unchanged 75-card formal color catalogs, and failure after real construction without mutating the caller data or private source.

This is author re-execution of the shared targeted suite, not an additional independent review. Combat tests place an actual card instance in hand and use controlled enemies; this does not establish natural draws, rewards, balance, or a complete campaign. The starter equipment is a virtual experimental switch; real inventory removal/replacement remains unimplemented. No selectable formal character, menu entry, human naming approval, or production release is implied.

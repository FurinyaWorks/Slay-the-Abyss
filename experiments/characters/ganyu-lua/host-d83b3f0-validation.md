# Public resource draw: author verification

Host `d83b3f07866526c6258dbb7d0db9dbfbc37e8f73` was exported via git archive to a separate workspace and Lua data rebuilt. No shared worktree edits.

Actual executions:
- `public-resource-draw.test.lua` with shared `Paid.drawDefinitions()`: 144 PASS across three cards, base/up, charge0/1/2, field absent/present and normal/full/empty/NoDraw; real C.play payment, resource consumption, FNP/DE, original UID discard/exhaust, cleared paid context and replay refusal.
- `public-resource-draw-run.test.lua`: six fixed-offer base/up claim → persistent deck UID → next battle Run.play PASS.
- Shared `ganyu-draw-transaction.test.lua`: PASS real reshuffle failures, Scry paid pause/resume faults, live resource/frozen context, reference-preserving rollback/retry, auto gates and terminal suppression.
- Shared generated reward test: 12 actual sampled claim→next Run.play paths, 20 distinct offered IDs.
- Author `public-draw-generated-rewards.test.lua`: another 12 paths using the same fixed seeds but choosing a newly supported card when actually offered. Actual received and played:43 at seeds82/89,33 at84,30 at90. All these random rewards were basic versions. Six fixed-offer cases above separately cover upgrades; they do not prove random upgrade coverage.

The supplemental selector never substitutes an offer or changes an upgrade flag. Victories and next-combat hand placement/energy are deliberate execution fixtures. These results establish actual generated acquisition of all three new cards in this experiment, not natural drawing, all33 reward IDs, full campaign, or balanced strategy. Shared closed `abyss_ganyu_draw_reward_run` provides35 definitions/33 reward candidates; the earlier32-definition domain is separate. Human/source/balance/production gates remain HOLD.

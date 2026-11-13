# Role-local setup stages, not shared admission

Base host: 27f2a6512fd9cc906ff70b436f2a3620dbae5258. Source: 89d898c KQ010/011/013.

Implemented `abyss_keqing_setup_cards` exposes fresh definitions(), known(), supports(), canUse(), prepare(), dispatch(). It is kept under experiments to avoid competing shared ownership. No Combat, paid router, Run, reward pool, architecture or production registration file is changed.

Exact source: 010 skill/SELF cost1 ordinary block4/up7 then set-if-absent; 011 attack/ENEMY cost2 damage12/up16 then set-if-absent; 013 attack/ALL_ENEMY cost1 damage3/up5 to each enemy then one set-if-absent. Non-exhausting. Fixed carrier `keqingSetup` with kind block/damage/damageAll and source value. Source rarity remains special/HOLD, not an approved rarity.

prepare verifies the paid context and source face, captures native ordinary amounts at use time, adds entry infusion+2 to each attack hit, and saves a copied two-stage plan. dispatch binds UID/turn/playId/cursor/target and compares the complete stage to the saved expected stage. First stage queues its captured native effect. Second stage validates live resources: existing wedge is a legal no-op preserving expiry; absent wedge becomes turn+1 and sets paid.didSetup. It neither consumes infusion nor executes relic effects itself. The existing host UseCard completion consumes an attack charge once and dispatches fixed4 relic block only after actual setup, when enabled and unused.

Host responsibilities remain: strict carrier admission and target validation, private paid plan, successful payment, original native lifecycle/gates, queue failure snapshots, exactly-once completion and source catalog/Run registration. Do not copy the old wrapper's post-return resource update. A dead player or last enemy may prevent the setup stage under current native gates; this differs from the JS candidate and remains gameplay HOLD.

## Actual test and initial failure

First run failed immediately `unsupported_effect:keqingSetup`: the test adapter had patched paid routing but not supported-effects admission. No shared code was changed. Added strict module supports() and a temporary test-only Effects.supported route for exactly one canonical carrier, then reran the entire affected test successfully (1/1,10.2seconds).

The adapter temporarily routes Effects.supported and Paid.canUse/prepare/dispatch, restoring them after success. It uses actual C.play, native queued effects, Scry resume, UseCard completion and rollback. This proves module execution under that explicit adapter, **not** unmodified shared public admission.

- 72 base/up × entry infusion0/1 × wedge absent/current-expiry/next-expiry × relic on/off cases: literal hit/block/cost, one whole-card attack consumption, skill preserves charge, live existing expiry unchanged, first setup relic behavior.
- Six paused native Scry cases flip wedge availability before setup, inject an exception after actual dispatch, verify whole state and pending/queue/resource/Scry references rollback, retry once, reject old-token replay. Native first effects are already paid/resolved before reveal.
- Six altered-payload/insufficient-fee rejects preserve original state.
- Two010 Dex10/Frail ordinary shield calculations yield10/up12 plus unmodified fixed4; skill preserves infusion.
- Four attack terminal cases: native thorns death and last-enemy victory skip later setup/relic; dead-source completion does not consume infusion, victory completion does.

No natural acquisition, automatic-play, full source schema adversarial proof, full modifiers/Power interactions, UI or balance/human approval is claimed. Shared owner must integrate narrowly and revalidate its real public path before adding experimental rewards.

Run: `TMPDIR=/workspace/scratch/c1a4970a76e0/keqing-tmp node --test experiments/characters/keqing-host/setup-stages.test.mjs`

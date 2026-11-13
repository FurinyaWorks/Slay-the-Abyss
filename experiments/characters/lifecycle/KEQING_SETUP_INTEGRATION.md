# Keqing setup paid integration

Owner new public/setup/acquisition/reward wrapper passed 1/1 (44.17s), before independent review. Source role module 52c44cc3/89d898c is reused without changing numerical behavior. Public routing now calls the actual Paid/Effects implementations rather than the author's temporary adapter.

010/011/013 capture native block/damage at accepted use, then inspect live wedge presence at the setup stage. Existing wedge expiry is not refreshed. Only a real new wedge records didSetup for the existing once-per-combat fixed-4 virtual relic. Native terminal skipping and reaction death semantics remain HOLD relative to isolated JavaScript.

The new closed `abyss_keqing_setup_reward_run.new(Data, seed)` uses `keqing-reviewed-sixteen-v1`, adding these three special/HOLD candidates only to the new equal-weight research domain. Old eight, ten and thirteen domains and formal pools remain unchanged. This does not approve rarity, natural-map balance, or UI registration.

Tests prepared: public 72 source cases, pause/live-resource/fault/native terminal and 21 auto cases; six obtained permanent cards naturally drawn and paid; bounded research generation, strict source drift and whole-Run rollback. Generated-chain victory and hand-placement controls are fixtures, not natural wins. Author natural-generation witnesses are separate.

First launch after rebase lacked sparse test materialization (no Lua ran); restored exact HEAD. First actual suite failed only in the added auto fixture calling drain from action_queue instead of card_actions. Corrected the fixture import, with no production change, then reran all three Lua suites successfully. Independent review, author natural witness and latest combined-host regression remain pending.

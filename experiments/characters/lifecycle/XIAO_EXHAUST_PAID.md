# Xiao x20/x21/x22 paid candidate slice

Base: shared 27f2a651. Only Xiao bridge, canonical gate and dispatch change.
Default eight and existing twelve-card research reward allowlist are unchanged.
New cards require explicit candidate definitions and controlled obtain/reward setup;
they are NOT in the research offer domain or formal color pools.

Source: existing frozen core_data cards x20/21/22. x20 costs 0, exhausts,
and draws 2/3 only when unmasked. x21 costs 1 and deals actual exhaust count *3
capped at18/24 BEFORE mask/native modifiers. x22 costs1 and blocks count*2 capped
at10/14 BEFORE native block modifiers. No source numbers changed.

Focused wrapper: xiao-exhaust-paid.test.mjs, 256MB single-process serial.
Controlled first victory/reward/hand arrangement validates real reward deckUid,
base/upgraded paid instances, life-paid x17 UseCard exhaust as actual fuel,
masked x20 actual UseCard exhaust eight times, output caps and final settlement
rollback. These are engine integration fixtures, NOT natural acquisition or
probability evidence. Native action fault restores full Run and original hand.
Automatic cases test all three IDs and both variants: accepted, unmarked,
foreign ABI, effect drift and dead player. cap metadata is strict, x21 requires
an active target and skips a target invalidated before dispatch.

First attempt never ran due relative script-generation path error. First actual
wrapper failed because the test called nonexistent C.obtainCard; corrected to
Run.obtainCard before the next battle, retaining real instances and paid exhaust.
No runtime changes were needed for this test error.

HOLD: native zero-base damage/block still receives Strength/Dexterity; source
numerical model differs. All reaction/interruption permutations, natural offers
for these three, human/source/balance approvals and full CI are unverified.

Cap extension first failed because the fixture removed one fuel from each pile instead of stopping after the first match; corrected the fixture outer-loop break. No runtime change.

Final author run: new paid wrapper 1/1 PASS (44.22s; three Run markers plus
30 automatic combinations). Existing twelve-domain source/provider/closed factory
wrapper 1/1 PASS (9.01s), serial after the new suite. No shared integration or
independent review is claimed by these author results. No full CI executed.

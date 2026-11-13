# Explicit Xiao experimental launcher
`require('abyss_xiao_starter_run').new(data, seed)` uses a private copy of the
module-authored source manifest, no caller manifest/options, no menu/profile change.
Source is cards.json digest 1ff06840... as recorded in source module, reviewed
first-eight structure checked against shared Bridge before ordinary Run catalog.
HP70, exact ten starter cards, no Burning Blood; relic via explicit candidate
lifecycle. No candidate reward pool or formal class/inventory relic is added.

Actual targeted Lua test passes all ten deck UIDs via real draw/discard/end-turn
recharge/reshuffle and paid Run.play, no hand movement or energy injection; fixed
harmless enemy isolates access, not balance. Fresh-run copies independent; external
options, duplicate candidates and canonical effect drift reject without mutation.
Shared owner will separately add build config and integrate/review. No config,
Run/Combat/queue or other character files modified in this isolated patch.

Rule-drift correction: source cards.json explicitly sets energyPerTurn3/drawPerTurn5;
model.mjs enforces hand limit10. Source module records model SHA256 in addition to
cards digest. Launcher now fixes all 70HP/3energy/5draw/10hand, rather than inheriting
caller defaults. Changed caller80/9/9/20 passes actual initial energy/draw, handcap
and end-turn reset assertions with caller graph unchanged. This does not freeze
all host combat mechanics or remove native Strength/Dexterity/Intangible differences.

Integrated shared configuration classifies both launcher modules as core. The
final host additionally supplies an eleventh real card instance, then verifies
native draw stops at ten and leaves one in the draw pile. Formal four-color
75-card provider counts and a failure after real Run construction preserve the
original input graph. These strengthen access/transaction evidence, not balance.

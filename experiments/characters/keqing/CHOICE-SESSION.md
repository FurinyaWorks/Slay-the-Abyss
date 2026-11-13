# Paid-choice research continuation

Isolated branch only; no card values changed, no production registration or shared UI claim. `createChoiceSession` owns private state and a generator continuation from the same interpreter as legacy synchronous `play`. The original synchronous API retains its callback requirement and rollback behavior.

`begin(revision, instance, target, options)` accepts only retain/move/purge prechoices. Payment and prior draw/shuffle are committed before bounded options become visible. The played instance is in `pending.inUse`, not any pile. `resume(revision, token, instance)` validates the token and allowed instance before advancing. Invalid/stale choices leave the paid state unchanged. Other actions cannot proceed while pending. There is no reset/refund method. A post-choice interpreter fault locks this session rather than refunding, replaying, or offering another peek. Fault recovery and serialization are not implemented.

`view()` contains the existing public battle view plus only allowed revealed options. It exposes neither hidden draw order nor RNG. Session internal state is not an external save format. Tokens are session-local revision identifiers, not authentication credentials. Caller copies cannot mutate the continuation. Model-level generator is trusted engine internals, not a UI API.

Validation: 226 targeted model tests including 216 legacy regressions; base/up043/044, actual reshuffle, no-pile/locked skip, ten-card hand, stale token/invalid choice/pending action refusal, input/output aliasing and synchronous-result parity. Independent review is pending. This does not approve source, naming, balance, human playtest or production behavior.

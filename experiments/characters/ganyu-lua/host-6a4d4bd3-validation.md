# Author acceptance: shared host 6a4d4bd3

Exact shared commit: `6a4d4bd3f87ec752c53e80d285b21fc0eeec2cdd`.
A new workspace directory was populated by `git archive` of that commit; native
Lua data was rebuilt with `node scripts/build-lua-data.mjs`. No shared source was
edited. Contracts are from adapter commit `8f269afa77fe2845a10ebab09e5008dd9f35a88a`.

Actual Fengari stdout:

```
PASS7 real owner-end contracts including native Ice Cream with/without banking relic
PASS 14 public Ganyu C.play base/up resource, target, payment and UID contracts
PASS independent 4 public modifier/retaliation terminal probes
```

SHA256 bindings:

- public-owner-end.test.lua: `3e14d20535b59e388c1df589a5641495f2bd9a2d106f5af3c03b93cb299d7e29`
- public-play-contract.test.lua: `0d00623bbfb49902c40706a397ac5d8412bd475d760b70b091466ae75fc15cdc`
- paid-definitions.lua: `9096d20543b5ee4ae7841e46cc6ab1ff97b4390765f2ac719f2283c1943959bf`

Run the first contract with `dofile` through the repository Fengari Lua runner.
For the second, set `GANYU_PAID_DEFINITIONS` to the adapter's generated
paid-definitions.lua before `dofile` of public-play-contract.test.lua.

The seven owner-end scenarios cover native ethereal UID exhaust/draw ordering,
rain victory before enemy action, no starter relic banking, initial-command
native failure rollback, Codex pause/resume failure/old-token rejection, and
native Ice Cream with/without Ganyu banking. At full charge and two leftover
energy, the new turn has respectively 3 with banking / 5 without. The prior host
8aabc418 reproduced 3 instead of 5 without banking and is superseded for this
compatibility claim. Enabled banking's overflow loss follows the frozen candidate
contract, not a new human-approved interaction balance decision.

Scope: author acceptance of this opt-in shared host, not independent review or
full CI. The 03/06 card definitions were injected through the explicit candidate
catalog fixture. Rain remains seeded directly in the owner-end fixtures; 05's
public C.play remains pending. No natural reward pool, production registration,
visual device testing, human naming/source or final balance approval is implied.

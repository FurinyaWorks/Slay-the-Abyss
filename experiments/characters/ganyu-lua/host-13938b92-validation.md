# Author acceptance: public paid storm05

Exact shared host: `13938b92a0cab7140ad5fedc3bc70d72f411cdad`.
A new workspace archive was extracted from that exact commit and native Lua data
rebuilt. The unchanged source-generated `storm-definitions.lua` from adapter
8f269afa was loaded through `GANYU_STORM_DEFINITIONS` for both contracts.

Actual Fengari output:

```
PASS2 base/up public storm payment-to-owner-end lifecycle contracts
PASS6 source-bound public storm refresh/bank/Corruption native-exhaust-fault retry cases
```

The original two cases verify insufficient-energy no-op, actual 2-energy payment,
source UID discard and stale replay rejection, no immediate damage, subsequent
native owner-end ticks twice, then field expiry. The six supplements verify both
variants preserve a pre-existing stronger/longer field, combine the paid card's
remaining one energy with starter banking before the field tick, and run actual
Corruption exhaust + Dark Embrace native draw after setup. A fault after that draw
restores all state plus original hand/resource/card references, and retry succeeds
once with zero payment under Corruption and the same UID in exhaust.

Fixture correction: the first supplemental run assigned the Corruption marker
without performing its native cost scan, and C.play correctly rejected for
insufficient energy. The fixture now calls `abyss_corruption.apply` to establish
the actual power before the tested public card command; the rerun passes. This
was a test setup error, not a host regression or permission to ignore cost checks.

No shared source was edited. These are author tests, separate from host independent
review. The candidate card is injected through an opt-in catalog fixture, not a
natural reward pool or production class registration. This does not approve
names, primary sources, balance, visuals or human gameplay. Later storm-family
18/31/59 work is not included in this host acceptance.

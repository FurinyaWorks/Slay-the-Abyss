# Pending real public owner-end acceptance

`lua/public_owner_end_test.lua` was executed src-only against exact shared
`4da6e4755aea1216bd94929b84e50857b6336a07`, archived separately in workspace.
A test-only enemy loops native block(0), removing enemy damage as a confounder.
Candidate definitions are canonical and C.play/C.endTurn are not replaced.

Observed expected RED at the first public end-turn assertion:
```
tests/helpers/act2_event_relics.lua:5: 6 ~= 4
public_owner_end_test.lua:16
```
Paid x04 left HP6; public endTurn did not yet charge mask HP2. This is the known
missing shared hook, not a passing lifecycle test. The later base/up three-turn
and injected startPlayerTurn failure assertions remain unexecuted until this
first missing hook is integrated. Shared owner has the exact pending script.

# Author acceptance: public Xiao Run

Exact shared freeze: `fbe58fb09f2a1d06c54c1b6d783a7876be52b5dd`.
Independently archived into workspace; regenerated native Lua data. Ran unchanged
role author `public_run_test.lua` with src/build-only module paths:
```
XIAO_RUN_CANDIDATE_PASS fixed reward UID upgrade cross-battle reset Run.play rollback and start snapshot
```
Ran shared `experiments/characters/lifecycle/xiao-run-candidate.test.lua`:
```
XIAO_RUN_CANDIDATE_PASS fixed reward UID upgrade cross-battle reset Run.play rollback and start snapshot
XIAO_RUN_PAID_MASK_PASS
```
Exit 0, no traceback. Previously red Run.new admission now permits explicit Xiao
experimental context. Three battles preserve acquired upgraded deck UID while each
battle rebuilds mask/reservedEnergy/relicUsed and preserves configured relic flag.
Actual Run.play reward-publication failure and startCombat initialization failure
restore whole state plus retained object aliases; retry succeeds. Host suite also
executes actual paid mask entry, Run.endTurn and exit.

Fixed reward catalog/hand accessibility and victory fixtures are explicit: this is
not a natural reward distribution/playthrough, all-75 registration, balance or human
approval. Public card admission remains x01/x02/x04/x06. No shared source edits were
made by the author; host independent review is a separate gate.

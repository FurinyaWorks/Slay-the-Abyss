# Xiao x05 paid gate acceptance
Base: shared 1d5413a7. Only runtime change is abyss_xiao_paid_cards:
canonical x05, plunge supported schema, stale single-target skip when no mask.
Uses existing Bridge/Dispatch, no Combat/queued/Run edits.

Actual author starter matrix (base/up × unmasked/masked) passed:
- explicit repository-bound starter factory, HP70 and initial relic;
- real Run.play x04 creates mask before masked x05;
- unmasked invalid target rejects unchanged, masked group ignores unrelated target;
- canonical unmarked x05 rejects without changes;
- fault after actual paid plunge stage queues native effects rolls back whole Run,
  original hand/resource references, then retry successfully pays once;
- exact damage each target, one-energy charge and actual discard disposition.

Fixed two-cultist encounter, hand accessibility and upgrade fixtures, not a natural
run/balance proof. Failure injection is after stage enqueue, not after every native
reaction or final-enemy win. Production catalog/naming/human gates remain unchanged.
Factory and manifest copied from reviewed ef2d0967; no natural reward pool added.

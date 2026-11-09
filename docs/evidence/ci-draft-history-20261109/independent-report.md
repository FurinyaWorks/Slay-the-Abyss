# Independent review: PR584 Draft/Fast policy and historical-contract repair

Result: PASS for the reviewed local slice, with no unresolved findings. This is not a remote CI, merge-admission, Windows execution, or gameplay validation result.

Reviewed PR head `53b55d4ddd4ed0f2adc5458e53d7d2da5fab51c3` against develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`, plus the uncommitted four-file repair. Exact reviewed file SHA256s are in `review.json`. Backlog metadata changes are excluded. Read AGENTS.md, docs/ENGINEERING.md, and Backlog overview/execution guidance. No production, Backlog, or shared build outputs were edited.

## Findings

- The six exact inverse blocks cover the complete original workflow diff. Independently reading the develop Git object confirms byte-for-byte restoration and SHA256 `aeb022f9209eda1311f3893acefc2c55a8d75c497b3b950a276d609964ea7535`.
- The helper only rewrites a complete, uniquely occurring reviewed migration. It preserves other source bytes. Original whole-source historical guards remain essential: this helper is not a standalone YAML policy validator.
- The execution-slack inverse correctly returns the original input when any inner migration block is absent or changed; it does not conceal a successful outer projection behind a partially repaired inner epoch.
- The old execution-slack test now starts at its actual historical boundary; assertions are unchanged. The corrected negative fixtures alter a character inside each matched block, including one-line blocks, and target the summary `if: ${{ !cancelled() &&` rather than an earlier rules gate. Both fixture corrections are included in the reviewed file digest.
- Original production policy gates both independent root jobs and both summaries for drafts; downstream jobs depend on impact. Ready and integration paths retain their gates. Cost is advisory without truncating the complete selected tests, and platform timeout ceilings remain explicit. No additional production policy is introduced by this repair.

## Independent probes

Executed only `.artifacts/pr584/independent-review/probe.mjs`, not the focused suites or Full checks:

- Compared restored workflow bytes directly with the independent develop Git blob.
- Mutated each of 533 nonempty workflow lines independently. No mutated input was erased into the accepted baseline by either the new projection or the complete auto-merge historical chain.
- Injected each old block alongside current blocks; unrelated additions remained visible or failed closed.
- Relocated each of six current blocks; no relocation became an accepted whole-workflow baseline.
- Introduced one mixed line ending at each newline independently; changes remained visible or failed closed.
- Checked old snapshot and pre-slack idempotence.

All probes passed. The parent's focused-suite results were not substituted for independent execution or duplicated. Publication and precise final committed-SHA CI remain outside this report.

# Focused Stasis closure repair

The complete historical Stasis test passed again: 5/5, 18,342 ms wall and 18,261.114514 ms Node-reported duration. This run remedies the earlier receipt's three omitted transitive script identities; it does not replace or rewrite earlier evidence.

`stasis-closure-receipt-runner.mjs` adds every path in the inspected Stasis known closure to the normal conservative capture. The new receipt captures 1,040 paths, including all 482 audited relevant paths and `scripts/build-lua-data.mjs`, `scripts/build-original-v4.mjs`, and `scripts/validate-data.mjs`. Before/after input sets are equal. The separate scope check confirms the captured set still matches the current tree at inspection.

Artifacts: `stasis-known-closure-final-receipt.json`, `stasis-known-closure-final.log.gz`, and `stasis-known-closure-final-scope.json`. Node standard-library/runtime identity remains outside repository capture. No other source suite was rerun, no CI floor was lowered or changed, and this is not Full, hosted CI, or device evidence. All prior receipts, logs and supplements remain intact.

# Optimized Emerald cost registration review

Review ID: map-optimized-cost-review-20261110

Conclusion: PASS for the exact source hashes in review.json. This final calibration-accounting binding supersedes pre-accounting-review.json and earlier bindings. No unresolved implementation findings. This is not whole-PR merge approval.

## Findings

- Emerald 71,588ms equals ceil(65,079.33882600628ms × 1.1); all three optimized complete samples and original 87,638ms historical floor remain preserved.
- Calibration 20,296ms equals ceil(18,450.387646997115ms × 1.1), based on three explicitly identified candidate measurements; prior 17,544ms remains preserved. A fourth final full 53/53 check at 18,824.57003800664ms has 9,052 stable inputs, is independently retained, and remains below 20,296ms. The selection maximum is not represented as the maximum of later samples.
- Only those two timing entries change. All 38 other floors, hosted observations, initial costs, inventories, budgets and worker policy remain unchanged.
- Live planner independently reproduces Windows 1,800,631ms against 1,800,000ms and Linux 1,136,539ms against 1,200,000ms. Windows remains BLOCKED.
- Historical helper, contract, registration and both archives remain byte-identical to 79c5b4cd. Exact outer projection rejects arbitrary and duplicate-key timing drift.
- All measurement receipt logs and snapshots authenticate. Paired 8,341-input snapshots differ only in the intended fixture. Current verifier checks 1,248 source identities, accepts 1,191 text paths across 11 LF/CRLF text kinds, and rejects same-length meaningful content mutations in each kind. Binary and immutable receipt identities remain exact.
- Historical published optimized sample honestly records unknown execution HEAD separately from publication commit; its unchanged snapshots bind execution inputs. The archived initial receipt retains the correction trail.

## Reproduction and limits

Run `node docs/evidence/m7-map-optimized-cost-20261110/probe.mjs` and `python docs/evidence/m7-map-optimized-cost-20261110/check-calibration-evidence.py` from the repository root. Outputs are final-accounting-probe.log and calibration-evidence-probe.log. Earlier findings and bindings are retained. No full or recurring-file suite was duplicated by this review.

The manifest binds reviewed working-tree bytes; final commit identity must be added after commit. Fourth-calibration published compressed logs and snapshots were independently authenticated using their compressed and uncompressed hashes. The documentation correctly distinguishes the three selection samples, later final validation and historical intermediate forecast. Non-isolated Linux observations do not certify Hosted Windows duration, CI admission, client behavior or release readiness.

# Hosted pack safeguard validation

The reviewed implementation commit is `1e88a4c451bf39770e1eb5cbbb5d63bbb6f7c019`, based on `6a614fc82697750ddb408750e54f59f801c24f1e`. The later evidence commit only records documentation and Backlog results. See [scope and limits](../../backlog-details/M7-HOSTED-PACK-GUARD-20261111.md).

- `baseline-gap.json`: original checker misses disabled checkout condition.
- `targeted*`: first 4-test run, then final 5-test selected run. These are not the complete ci-downloads file.
- `ci-contracts*`: first complete four-file run with 29 pass / 1 historical-byte rejection; final same four files 30/30 pass with unchanged historical hash.
- `syntax*`, `guidance*`, `backlog*`, `network-final*`: respective CLI output and stderr.
- `independent-*`: independent review, original before/after negative-control evidence, real tiny-fetch comparison and separate 5/5 plus complete summary 7/7 runs.

No PowerShell, hosted action, Full, native queue, merge or post-merge run is represented here. Byte-threshold tests use sparse local files. Existing timeout/assertions, current inventory and CI costs remain unchanged. SHA256SUMS binds the stored files; it is not a CI authorization.

`independent-probe.mjs` preserves the original diagnostic script bytes and its relative import. To reproduce it, copy it to `.artifacts/hosted-pack/independent-probe.mjs` in this checkout, then run that copy from the repository root. The file is supporting evidence, not a production or CI entry point.

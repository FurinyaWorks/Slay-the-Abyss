# Stasis source-history integration

Base: 4a51905537fa223e5df4e5ee475152c8a6629af5. Exact per-file identities: history-manifest.json. Historical replay cross-check: historical-replay-provenance.json.

## Results
- New source epoch complete: 5/5, 17207.999469ms Node, 17550ms wall. source-final.log and source-final-receipt.json.
- Formation source epoch complete: 11/11, 18022.917445ms Node, 18469ms wall. formation-final.log and formation-final-receipt.json.
- Actual source-bridge consumers: selected 16/16, 7969.686318ms Node. source-consumers.log/receipt.
- Frozen Actor lifecycle, statusView, Combat owners and combined Actor+Combat replay: selected 4/4, 31470.277237ms Node. actor-replays.log/receipt. Exact graph outputs unchanged, combined original assertions preserved.
- Earlier live-reader cases: selected 3/3 (Seven-refactor, Silent-final, Defect-final), 9481.321052ms Node. older-live-readers.log/receipt.
- git diff --check and developer Actor damage helper syntax check passed.

## Guarantees
Full 339-path current tree comparison; 53 current changed raw owners; exact pre-Stasis facade preserved independently; original complete prior metadata, targets and archives unchanged. Four-path new outer archive records Actor, Powers, Stasis and architecture. LF/CRLF and JSON token/layout rules retained. Every projection authenticates fresh linked raw owners; foreign input remains opaque, unknown targets rejected. Isolated copy closure is additive and importable without Git/source tree access.

Historical three-argument Actor replays receive full base Powers/Stasis modules, byte-identical to lifecycle and statusView original revisions. Current and mutant Actor runs retain current dependencies. Actor Presence historical VM already freezes every handwritten module; current-only Actor damage mutants require no bridge. Explicit developer damage replay now loads full Powers/Stasis from its requested exact revision, but that optional multi-fixture developer command was not executed.

## Failure and receipt limitations
source-initial.log retains exploratory 4/5 failure: new test erroneously classified valid JSON trailing newline as foreign. Corrected test uses non-JSON suffix; product and runtime projection unchanged. Initial generator metadata assertion rejected invented prior mode/rawGitBlob fields; corrected archive copies exact predecessor metadata only after full base Git source equality. Generator error remains in tool transcript, not a local log.

Broad source-final receipt detected only actor-damage-parity.mjs edited during the run, which this source test does not import. Actual source/config/import closure unchanged; do not claim broad inventory equality. Other listed receipts have no broad input drift. CI worker derives narrow exact input closure. Targeted runs are not complete-file timing evidence. No Full/broad all-epoch suite, device, publish or commit actions performed by this worker.

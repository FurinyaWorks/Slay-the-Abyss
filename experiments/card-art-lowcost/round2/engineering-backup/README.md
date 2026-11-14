# Lossless engineering evidence storage

This isolated branch extends the reviewed preview with all original simulator screenshots, source geometry/SVG, receipts and six large native/save JSON files. The six JSONs are stored **explicitly as `.json.gz`**, not disguised as original JSON. Each original byte length, SHA256 and Git blob SHA is recorded in `manifest.json`; compressed byte hashes are also recorded.

Why: the workspace has no Git push credentials, and the connector stalled when transmitting a 721 KB generated save as a single argument. Existing repository LFS helpers are frozen lists of older media, not a write mechanism for these new files. Lossless gzip reduces that save to 28,926 bytes without changing any original content. This is repository-managed engineering backup, not an archive sent to the owner instead of usable previews. [View the reviewed comparison](../README.md).

From repository root:

```
python experiments/card-art-lowcost/round2/engineering-backup/restore.py
python experiments/card-art-lowcost/round2/engineering-backup/restore.py --restore
```

The first command verifies without writes. The second verifies and restores the six JSON files next to the previews. It refuses different existing data and symlink destinations. After restoration, `check_outputs.py` and the simulator runner can inspect/use the exact original saved trees. Restored generated files are ignored by this branch to preserve the explicit compressed storage choice.

Source freeze: local commit `f117e4329d3ab12affb3316010bcad3868cb2723`. This reference identifies the original freeze; it is **not a claim that that local commit was pushed**. Original bytes are independently recoverable here, without access to the former workspace or that commit.

No production assets, LFS allowlists, runtime registrations, branch protections or release branches are changed. The visual decision remains research-only, not premium or official-device acceptance.

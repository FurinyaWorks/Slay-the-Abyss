# Independent engineering backup review

2026-11-14. Reviewed engineering-backup/restore.py, manifest.json, README.md and round2/.gitignore in card-art-round2-evidence.

Decision: PASS for isolated evidence publication. No blocking finding.

Independent targeted verification (Python only, no simulator/Node/full suite):
- All 20 manifest names unique, exactly six gzip payloads.
- Stored gzip byte lengths/SHA256, recovered byte lengths/SHA256 and Git blob SHA1 pass.
- 20 originals total exactly 2,534,089 bytes.
- Every recovered/raw file byte-matches source freeze f117e4329d3ab12affb3316010bcad3868cb2723 via git show, not merely the manifest's own assertion.
- Temp-copy restoration succeeds, repeated restoration of identical data succeeds.
- Different preexisting destination is refused and preserved.
- Symlink destination is refused.

Static review: restricted filename allowlist prevents traversal; storage paths are constrained; gzip decompression is bounded to declared size + 1 and declared sizes are capped; saved scripts are never executed. Writes use exclusive creation; .gitignore targets only generated native/save JSONs in this directory. README explicitly distinguishes .json.gz storage from original JSON and correctly avoids claiming the local source commit was pushed. Previews remain ordinary viewable files.

Nonblocking limitation: restore verifies and writes each row sequentially, so a later failure can leave earlier successfully restored files in place. It is not transactional; README makes no atomic-restore claim. Existing protection against different files remains valid.

This approval concerns backup fidelity/safe restoration only. It does not alter the visual research-only decision or establish official-device/runtime acceptance.

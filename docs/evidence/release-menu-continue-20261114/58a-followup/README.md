# Latest release/menu integration backup

Inputs: prior remote fix/release-menu-continue 2a187810754c1eb3baf3ef968350e9c8e8f10995 and #661 58a30edfcb06cb34403ca71d04fcea9d3e4352ef. #663 remains ebe050dfd70caa9fc276aaa06c9a6bedbd77da0a; develop remains 9f2f44e4c79789fbcb64a515938765dbc240f830.

The 14-file upstream repair merges cleanly. It supersedes the standalone d889f5ae deck repair and fixes the background profile/real page owner separately. No original PR branch was modified. Prior menu Continue/layout/input/exit wording and historical Host separation remain unchanged. The only production delta is the upstream portrait helper extraction, statically reviewed as preserving conditions, ordering and token checks. No new product implementation or source layer was introduced here.

Independent review: /root/delivery/review_native verified the exact staged 14-file delta and unchanged navigation-related files. The final local commit/tree is separately checked before upload. Current source identity in the combined branch still requires the existing integration chain to enroll the navigation changes; no claim of Full, merge admission or device verification. Latest standalone #661 Quick succeeded, Quality was queued at the single read; these are not proofs for this combined candidate.

Verification: the accompanying log is the bounded serial 3-test session-menu-navigation run on this combination; whitespace is normalized only. Earlier evidence stays in its original directory and is not relabeled as this run.

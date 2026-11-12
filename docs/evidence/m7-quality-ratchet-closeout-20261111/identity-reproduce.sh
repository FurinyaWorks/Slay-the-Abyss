#!/usr/bin/env bash
# Run from the identity worktree. The probe reads only committed implementation objects.
set -euo pipefail
snapshot=$(mktemp -d /tmp/identity-review-reproduce.XXXXXX)
trap 'rm -rf "$snapshot"' EXIT
git show 5b4c90f46a4cff14aa7f0b9c2458cfd40c170a01:scripts/lua-quality-metrics.mjs > "$snapshot/metrics.mjs"
git show 45eb945:scripts/lua-quality-metrics.mjs > "$snapshot/old-metrics.mjs"
git show 5b4c90f46a4cff14aa7f0b9c2458cfd40c170a01:scripts/quality-ratchet-policy.mjs > "$snapshot/policy.mjs"
git show 5b4c90f46a4cff14aa7f0b9c2458cfd40c170a01:scripts/evidence-files.mjs > "$snapshot/evidence-files.mjs"
ln -s "$PWD/node_modules" "$snapshot/node_modules"
cp /workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/.artifacts/ratchet-followup/reviewer/identity-independent-probes.mjs "$snapshot/probe.mjs"
node "$snapshot/probe.mjs"

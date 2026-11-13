# Candidate access audit — isolated diagnostics

This tool checks **trusted local experiment checkouts**, without editing their data or running pressure studies, Full, browsers, or native clients. It does not grant naming, balance, expansion, production or release approval. Node >=22.

```sh
node experiments/character-audit/audit.mjs /absolute/clean/character-checkout ganyu
node experiments/character-audit/audit.mjs /absolute/clean/character-checkout xiao
node experiments/character-audit/audit.mjs /absolute/clean/character-checkout keqing
node experiments/character-audit/audit.mjs /absolute/clean/character-checkout zhongli
node --test experiments/character-audit/audit.test.mjs
```

Use a fresh process for each snapshot. Exit 0 means no finding within the limited checks; 1 means review required; 2 means dirty/changed snapshot, unsupported adapter or execution error. Every report sets `scope_complete:false`. No status means the character is accepted.

## What is checked

- Git HEAD, full worktree status including untracked files, and SHA256 of direct role-directory MJS plus cards/relic/sources JSON. Dirty trees are refused before imports; changed identities discard results. Exports also refuse a second import of the same role directory in one process, preventing stale ESM-cache evidence.
- Catalog uniqueness, unknown channel references, and catalog IDs absent from the named starter and declared reward channel. This is **declared channel coverage**, not a proof of winning, seeing an offer, or being able to obtain every card in one run.
- All base/upgraded card texts can render. Invalid upgrade flags (`"false"`, `1`, `null`) accepted by a renderer are review findings. This is not a natural-language semantic verifier; compare with the real action contract before diagnosing a mismatch.
- Ganyu reuses its existing `validateCandidate`. Do not replace that validator or duplicate its effect schema.
- Relic checks are deliberately narrow: Ganyu/Xiao default equipment; Zhongli initial jade with and without the relic, compared with its declared effect; Keqing declaration/text only. Effect activation, cancellation, repeat triggers and cross-battle reset remain NOT_PROBED except the explicitly recorded initialization.

No resource/health/energy values are proposed or modified. The output is observational.

## Adapter and trust boundary

Dynamic imports execute trusted module top-level code: this tool is **not a filesystem sandbox**. Only use checkouts whose imported modules have been reviewed for side effects. Current adapters import Ganyu engine/validate (and engine dependencies), Xiao model/battle/deck and catalog JSON, Zhongli model/battle, Keqing mechanics/battle. Their current local dependencies stay in the hashed character directory. If future imports leave that directory, first extend snapshot coverage or reject that adapter; do not claim unreviewed dependencies were verified.

Research report CLIs are deliberately not imported or run. Keqing rewardPool and Zhongli private POOL are extracted by a narrow plain quoted-ID array parser from rewards.mjs/journey.mjs. An unsupported declaration fails rather than becoming an empty reward pool. This parser is an adapter to the reviewed syntax, not a general JavaScript parser, and does not prove the declaration is actually used by a playable entry.

Ganyu's named path is its default terminal battle: no reward/draft channel is claimed. Custom deck injection through battle.mjs is a research fixture, not acquisition. Xiao's campaign rewardCandidates cover the current catalog but only two offers occur along the synthetic three-room route. Existing owner campaign/reward tests remain the behavioral evidence.

## Integration path: reuse existing tools

1. Continue isolated candidate contract tests and existing CLI/browser laboratory. Ganyu and Zhongli have play.mjs; Xiao has lab.html/campaign.mjs. Hu Tao's full75 single-file HTML and its keyboard/modal/report-copy tests are experience references, not automatic compatibility layers.
2. After the appropriate #635 G0–G9 decisions, map approved data and mechanisms to the production data/Lua Run/Combat interfaces. `experiments/characters/` is not automatically included by `build-lua-data.mjs` or native candidate construction. Do not edit frozen `data/original_v4/` to smuggle candidates into the old HT/AR/FR/RD route.
3. Reuse `npm run validate:data`, `npm run build:data`, `npm run build:ui` and the relevant Lua integration tests. The existing `tests/lua/original_v4_acquisition.lua` and `tests/original-v4-integration.test.mjs` demonstrate first battle → reward → next battle, permanent card identity and resource resets. They do not certify new character adapters.
4. Plan bounded checks with `npm run test:related -- --base <baseSHA> --plan`. The naming gate in the separate #642 candidate branch is not silently assumed merged into develop.
5. Build via `node scripts/build-native-candidate.mjs <base.gil> [output]`; official import, current ready, UI evidence, actual control count and PC/phone experience are separate steps. Source audit, browser preview and synthetic encounters never substitute for native evidence.

Relevant repositories paths: docs/TOOLCHAIN.md, docs/ORIGINAL_V4.md, scripts/build-original-v4.mjs, src/lua/abyss_run_initialization.lua. Rules reference: #635 at c53e3511dcc4af631f541f71e21afc66797c4dd2. Raiden lessons require same-version text/effects and obtainable/payable setup; Hu Tao demonstrates an independently usable interaction slice before claiming complete production.

## This delivery's evidence

See evidence.json for exact **local** HEADs and file hashes. These are not asserted to equal remote branch HEADs: owners were actively committing during review. No fixed global card total is claimed.

Nine focused regression cases were executed with the exact audit source and test bodies in a Node module stream because this review environment is filesystem-read-only; the normal on-disk command is above. They cover excluded/unknown channels, duplicate IDs, strict-vs-coercing renderers, broken upgrade display, supported/unsupported private-pool syntax, mismatched quotes/commented declarations and input immutability. Actual adapters were also exercised. Mid-execution mutation and native/browser paths were not simulated.

At the final captured pass, Ganyu/Keqing/Xiao were clean and produced findings; Zhongli was being edited and correctly returned DIRTY_SNAPSHOT. Earlier clean Zhongli 7bd88fe reproduced absent declared acquisition for zl05/zl09 and initial relic jade 3 versus disabled 0. Earlier observations are not substituted for the final dirty snapshot.

This directory is a separate utility only. It does not own or modify the character branches, register production data, create an approval, or launch a PR/merge. Backlog CLI was unavailable; no task files were hand-edited.

Independent source review of the first commit found no backup blocker and identified path-alias caching and ambiguous literal parsing. Before backup, roots were canonicalized with realpathSync and private-pool parsing was tightened with an added negative test. Reports in evidence.json were captured before this adapter hardening; the changes do not alter the recorded catalog values. Duplicate-path refusal, mid-run snapshot drift and CLI exit paths have not received dedicated automated fixtures. A future general-purpose parser should use an AST; this small adapter remains limited to manually reviewed declarations.


## Unified terminal playground

See [PLAYGROUND.md](PLAYGROUND.md) for the pinned four-character single-battle entry, commands, model snapshots and exact validation boundary. It reuses this audit's snapshot helper and the owners' battle engines.

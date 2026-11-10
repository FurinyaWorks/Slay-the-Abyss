# PR #599：六个旧失败作业逐项复核

旧 HEAD 为 `074258935b5cf6acef99089d7ded90d855facb22`，Quality run 为 [42786493122](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42786493122)。复核基线为已发布 `da1c045af8508274565527857ac3eec874f201b2`。该次运行最终有六个失败作业、50 条失败记录；LivingWall 三条分别出现在 POSIX 和 Windows，因此共有 47 条唯一断言。取消的作业不作为通过证明。

`six-failure-inventory.json` 保留每条旧失败的原始位置、名称和错误。不是把它们全部视作同一个根因：它们分别涉及当前来源准入、历史来源投影、无效 reader 和 foreign 输入负控、隔离 helper closure、retirement、完整模块库存以及绕开公共入口的旧 Seven reader。

## 每个作业的验证

| 旧作业 | 失败数 | 对应证据 |
| --- | ---: | --- |
| POSIX 2/15，129732878040 | 5 | Inventory、pure projection、Run max-HP。沿用父目录 `hosted-failure-consumers-result.json` 对应的完整文件 41/41 运行，其中也包含下方 Windows 1/17 的全部失败。 |
| POSIX 5/15，129732878045 | 9 | Colorless 4、LivingWall 3、Session 1、Watcher-final 1。`additional-selected-results.json` 精确旧失败选择全部通过。 |
| POSIX 10/15，129732878058 | 9 | Act1 1、ArtFeature 2、nested snapshot 2、official background 1 见 `additional-selected-before.log.gz`；Seven 1、Silent 1 沿用父目录完整文件收据；Watcher boundary 1 为本次修复。 |
| POSIX 7/15，129732878074 | 9 | Formation 1 沿用父目录完整 11/11 收据；Potion 5 见 `additional-selected-results.json`；Watcher-potion 3 为本次修复。 |
| Windows 1/17，129732878075 | 12 | GameUI extraction 的完整文件已在父目录 41/41 运行中通过，涵盖全部十二条失败。 |
| Windows 15/17，129732878213 | 6 | Battle max-HP 1、Roster 2、LivingWall 3 见 `additional-selected-before.log.gz`，全部通过。Windows 原生执行仍以新 HEAD 的 Hosted CI 为准。 |

选择运行只覆盖列出的原失败断言，未选择的测试没有运行。Node 24 的 `skipped=0` 不能解释为完整文件通过。两组选择运行分别为 12/12、14/14，其中 LivingWall 三条重复覆盖两个旧作业；没有重跑 Full。

## da1c045a 尚未覆盖的四条失败

1. Watcher boundary 仍把当前模块数固定为 338。新增 RunHealth 后实际为 339，已在新公开树复现 `334 !== 333`。本次保留旧 333/338 断言，先认证四个 RunHealing owner，然后建立独立历史图；仅 proof 明确为 null 且实际 SHA256 匹配的新模块从该历史图排除。当前图仍保留全部 339 模块，原 SCC、直接/延迟 require、语义变异断言不变。
2. Watcher-potion 仍直接将当前源交给 Seven reader，绕开新公共入口，三条旧失败在 da1c045a 再现。现在先执行 RunHealing → prior，再进入原 Seven → localSeven，原六个 owner 的哈希、断言和负控全部保留。

两份修改后的完整文件分别为 10/10 和 5/5，均无失败、取消或跳过。另有 40 个 LF/CRLF、四个 healing owner 暖后漂移/缺失与新 witness 保留探针。初次错误探针及中间失败日志一并保留，不能作为成功证据。探针原字节保存为 `watcher-potion-reader-probe.mjs.txt`，可从仓库根执行 `node --input-type=module < docs/evidence/m7-run-healing-contracts-20261110/six-job-followup/watcher-potion-reader-probe.mjs.txt`；它是独立可复现证据，不是 CI 执行输入。

## 成本和交付边界

父目录 `six-watcher-boundary-final-receipt.json` 和 `six-watcher-potion-final-receipt.json` 分别记录完整进程 32,325.761562 ms、11,237.073321 ms，需采用不低于 32,326 和 11,238 ms 的真实成本。各自 5,921 项输入在运行前后稳定。这是追加 CI 适配层之前的完整成本观测，不冒充追加层之后的最终相同输入。

仅上调这两项成本时，保留原片数、worker、并发、未知成本、预算及 60 秒预留，现有规划为 POSIX 1,134,695 / 1,200,000 ms；Windows 1,800,027 / 1,800,000 ms，超出 27 ms，必须保持 BLOCKED。后续追加层的完整观测若产生更高成本，仍须如实保留，不能以下调数字或改旧 epoch 消除红灯。

先前 5,920 项输入的收据仍属于 da1c045a，不适用于本次两份已修改测试。当前精确 HEAD 的正常必要 CI、独立准入和原 Merge Queue 尚待；保持 Draft，不声明可合并、官方导入、ready、手机或发布验收。

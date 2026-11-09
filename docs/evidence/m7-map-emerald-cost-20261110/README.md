# Map 翡翠精英：四项完整 CI 成本缺项补证

接续既有 PR #591 / TASK-74.20。测量 HEAD `d6974c64cf082773878a47936f1bd488035da6d5`，BASE `1eb288472d7b33b7450eec97a624ca2ffa526f39`，tree `45f3708d4d82bdaef7ef800d09a0c6e3724c945d`。

## 本轮结果

仅将原独审指出缺少完整进程收据的四个文件，各完整执行一次。Linux x64 / Node 24.22.1，本轮没有并发启动测试，也没有全量重跑。该共享环境可能有其他执行者，数据是保守规划观测，不是隔离基准或 Hosted Windows 用时。

| 完整文件 | 测试 | 原生 file summary ms | Node 总 duration ms | 外层进程 wall ms |
| --- | ---: | ---: | ---: | ---: |
| ci-host-timing-calibration | 4/4 | 274.829130 | 16965.758447 | 17142.248459 |
| ci-windows-shape-expansion | 3/3 | 313.585837 | 11024.910421 | 11161.471647 |
| class-potion-orb-source-inverse | 5/5 | 86.869569 | 10751.353525 | 10863.915623 |
| watcher-actor-source-inverse | 5/5 | 109.594624 | 21734.296185 | 21869.614863 |

共17个不同用例，全部pass，无fail/cancelled/skipped；不叠计原有验证。每次命令前后独立采集8234条已跟踪路径，8059条可读文件hash完全一致，175条稀疏检出缺项保留null。八份快照字节相同，因此只存一份 `tracked-inputs.json.gz`，原始每次观测及路径映射分别留在 `complete-file-observations.json` 和 `manifest.json`。Backlog计划追加是测前唯一已跟踪脏文件，不冒称整个工作树等于HEAD。未跟踪文件、生成物和node_modules不在该快照认证范围内。

## 保留旧观测后的完整诊断

`forecast.mjs`直接调用原 `partition`、`discoverJs`、`shardLuaScripts`，只在内存添加七个完整观测下界：本轮四份ceil(max(wall,Node总时间))，以及既有CI校准13573ms、Defect来源16574ms、runtime12019ms。旧较慢样本保留，未把两个缺少pre-run快照的旧standalone日志升级为严格当前输入证明，也未把原生summary当全进程成本。

完整800JS/1410Lua、Windows17/POSIX15、原60秒预留、worker安全分类、并发和原预算均保留；原33项floor和所有Hosted成本未改。

- Windows：1,801,318ms，对原1,800,000ms目标超1,318ms。
- POSIX：1,137,160ms，对原1,200,000ms目标余62,840ms。

这是补齐七项已修改CI文件观测后的诊断，不是全部仓库成本均已精确校准、最终timings登记、未来耗时保证或新的Hosted Full成功。旧“只余49ms”对应缺四项的旧诊断，不能继续当成本完整的当前余量。

本轮选择先交付独立核验的完整证据，不为更新元数据再增加一层历史投影或扩大分片。`scripts/ci-test-timings.json`、全部源码、测试、helper、历史档案和原门禁逐字未改。Backlog范围、指引、两份取证脚本语法及diff空白检查通过；doctor保持原5组重复ID/93旧归档位置警告。四项测量缺口已补；七项成本正式登记、对应合同接线与独立准入仍待。原独审overall BLOCKED、Draft及原生队列要求保持，没有绕过或合并。

## 证据与限制

- `complete-file-observations.json`：原始命令、开始/结束时间、返回码、三种独立口径、输入与日志hash。
- 四份 `.log.gz`、四份 `.jsonl`：完整输出与原生reporter结果，不从合并总时长分摊逐文件成本。
- `tracked-inputs.json.gz`、`manifest.json`：逐路径输入及证据映射、摘要。文本日志与JSON按实际UTF-8字节存储；gzip保留原字节。
- `measure-complete-files.mjs`：本轮采集脚本；默认写入 `.artifacts/emerald-cost`，须在原目标树中使用，不把本证据提交后的全库快照冒充测前状态。
- `forecast.mjs`：本轮原内存诊断脚本，输入为 `.artifacts/emerald-cost/complete-file-observations.json` 与前序公开成本文件；最终结果为 `forecast.json`。
- 初始采集器尝试对全部跟踪路径直接读文件，因稀疏省略的 `.artifacts/lowpoly-select/breakthrough-compare-card-before-after.png` 报ENOENT；错误发生在首个测试命令启动前。随后将缺项显式记null。本说明是错误摘要，不伪称保存了当时原始进程日志。
- 原HEAD的 [Hosted Full 42633952968](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42633952968) 成功记录仍属原HEAD。任何未来代码接续的新HEAD不得继承旧HEAD绿灯，本证据以单独短分支提交并在原PR链接，保留原PR HEAD，不为单独补日志触发一轮新Full；不是将该证据分支当作已通过完整CI的合并候选。正常准入与合后验收仍分别核对。

没有新GIL、官方导入、ready、客户端截图、设备性能或发布声明；没有用户GUI操作、手动rerun/dispatch或修改保护。

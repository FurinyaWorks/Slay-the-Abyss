# PR #588 完整流程增量规划证据

公开首个检查点 `1a733d800a2a50309803face7f30fd2a98b2cd31` 是严格 beforeSource 来源。原 `planning/` 的14例原始日志、receipt、summary，以及原 official-assets CI archive/helper 均保持逐字不变。本目录是新的独立测量，不把旧输入宣称为当前候选。

2026-11-09，源码冻结后在 Linux / Node v24.22.1 串行运行四个完整文件：

```
node --test tests/official-assets.test.mjs
node --test tests/official-assets-runtime.test.mjs
node --test tests/official-assets-flow.test.mjs
node --test tests/official-assets-visual.test.mjs
```

18/18 通过，0 失败/跳过/取消/todo。每份 measurement.json 保存原始 stdout/stderr 身份、命令、时间、退出状态及691个源码输入hash；每次输入前后都一致。sourceHead 是运行时工作树基线，候选未提交源码身份以 inputHashes 为准。共享官方 layout 改变，所以 runtime 和 flow 各完整重测一次；没有重跑自然 campaign 或 Full。

| 文件 | 通过 | Node ms | wall ms | 原 floor ms | 新 floor ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| official-assets | 6/6 | 1576.963610 | 1704.499213 | 1464 | 1705 |
| official-assets-runtime | 2/2 | 24440.198496 | 24559.274278 | 17427 | 24560 |
| official-assets-flow | 6/6 | 36698.603564 | 36855.905063 | 43888 | 43888 |
| official-assets-visual | 4/4 | 383.612588 | 525.958886 | 无 | 526 |

新floor取原floor与本次 `ceil(max(Node, wall))` 的较大值。flow较快但不降低旧floor。未知文件有效成本10000ms仍生效，official-assets和visual各按10000ms规划。相对公开首个检查点（尚无visual文件），新增有效JS工作量17133ms；当前JS inventory为829。未新增hosted观测，Lua worker/placement、matrix、预算、并发、timeout均不变。

## 严格历史与当前合同

新 `official-assets-flow-ci-source-epoch.json.gz` 绑定完整beforeSource与before/after SHA-256。仅完整hash匹配才投影，未知路径、部分floor、截断、额外空行或无关参数漂移不被接纳。新层加入现有命名epoch链；首个检查点的断言使用明确first-checkpoint view，继续独立检查原三floor和原14例证据。当前合同另行验证四文件测量、单调floor、全部输入hash和当前inventory。长自然campaign保持standalone，不进入默认测试发现。

最终定向CI命令：

```
node --test --test-concurrency=1 tests/ci-complete-calibration.test.mjs tests/ci-host-timing-calibration.test.mjs tests/ci-windows-shape-expansion.test.mjs tests/ci-posix-shards.test.mjs tests/ci-posix-concurrency.test.mjs
```

`ci-contracts.log`：64/64通过，0失败/跳过/取消，42592.629089ms。首次接线保留一次失败日志 `ci-calibration-initial.log`：旧Formation floor计数尚未穿过新外层，随后补齐严格投影，未修改历史期望值或放宽断言。

当前预测包含60秒reserve：Windows1719110/1800000ms，POSIX1151374/1200000ms。预测不代表hosted Full执行成功。

仍未由本证据验证：最终集成HEAD hosted Full、官方客户端导入/真实ready、PC/手机视觉与交互验收。自然双幕长跑有独立证据，本目录不重复或替代它。

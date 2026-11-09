# PR #588 本地规划下限

2026-11-09，在候选输出别名保护修复及三个官方测试文件冻结后，依次执行三个完整文件：

```
node --test tests/official-assets.test.mjs
node --test tests/official-assets-runtime.test.mjs
node --test tests/official-assets-flow.test.mjs
```

运行环境为 Linux / Node v24.22.1。不是 hosted CI、Windows 测量，也不是 Full、官方导入、ready 或实机验收。每份 measurement.json 记录命令、开始/结束时间、退出状态、Node 总时长、外层 wall 时长、原始输出 SHA-256，以及 685 个源码输入的前后身份校验。记录的 sourceHead 是工作树基线，不表示未提交候选已经进入该提交；候选身份由 inputHashes 指定。三个文件均无失败、跳过、取消或 todo。

| 完整文件 | 通过 | Node 总时长 ms | wall ms | 新 floor ms | 有效规划成本 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| official-assets | 6/6 | 1376.501689 | 1463.378884 | 1464 | 10000 |
| official-assets-runtime | 2/2 | 17334.379686 | 17426.759422 | 17427 | 17427 |
| official-assets-flow | 6/6 | 43761.557630 | 43887.685775 | 43888 | 43888 |

floor 取 `ceil(max(Node 总时长, wall 时长))`；原 10000ms 未知文件成本继续生效，因此较快文件不会压低原保守估算。与三个新文件各按未知成本规划相比，新增有效 JS 工作量为 41315ms；既有 floor、hosted 观测、Lua worker 安全权重、Lua placement、matrix、并发上限、预算和 timeout 都未改变。修复前及其他并行运行不冒充本次最终串行样本。

## 严格历史合同

`tests/helpers/official-assets-ci-source-epoch.json.gz` 保存完整 beforeSource 及 before/after SHA-256。新 inverse 仅接纳完整精确 source（允许 LF/CRLF），未知路径、截断、额外空行、部分 floor 集及无关参数漂移全部原样返回。它作为命名外层加入已有 CI epoch 链，旧 proof 和旧历史 forecast 数值不变。新增三个测试明确列入当前 inventory，并从历史 inventory 中排除；当前 Full 的发现入口仍包含它们。

`tests/ci-complete-calibration.test.mjs` 新增两个合同，检查完整源码身份、foreign/partial 拒绝、仅三项 floor 的差异、完整通过原始日志/receipt/hash、全部记录输入，以及当前规划权重。原断言未删、阈值未放宽。

## 验证边界

受影响 CI 合同最终 62/62 通过，0 失败、跳过或取消，Node 总时长 35949.752201ms；原始输出见 `ci-contracts.log`。执行命令：

```
node --test --test-concurrency=1 tests/ci-complete-calibration.test.mjs tests/ci-host-timing-calibration.test.mjs tests/ci-windows-shape-expansion.test.mjs tests/ci-posix-shards.test.mjs tests/ci-posix-concurrency.test.mjs
```

当前预测保留 60 秒 reserve：Windows 1718255ms / 1800000ms，POSIX 1150234ms / 1200000ms。预测不是执行完成证明。

仍然 UNVERIFIED：集成最终 PR HEAD 的 hosted Full；当前候选官方导入/真实 ready；PC 与手机游戏及视觉验收。没有执行新的 Full 或改变发布许可。

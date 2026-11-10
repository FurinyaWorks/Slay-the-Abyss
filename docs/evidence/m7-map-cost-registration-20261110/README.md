# PR #591：登记完整进程成本，保留历史合同与准入阻断

本次接续原 PR HEAD `d6974c64cf082773878a47936f1bd488035da6d5`、BASE `1eb288472d7b33b7450eec97a624ca2ffa526f39`。原四项缺项补证已公开于独立证据提交 `b976473753678574d29104ab0026eb0e68c48ba4`；本地父 `b7edb8ef36654a920652b2c1065f3ab6753baf2f` 与它同树。本包仅接续成本登记与合同接线，不混入 #586 正在处理的历史证明构建优化。

## 结果与边界

- 七项公开完整进程观测已登记为保守 local planning floors；33 项原 floor、全部 Hosted 观测、原始档案、预算、60 秒预留、Windows17/POSIX15、worker、并发及原门禁保持。
- 登记后的验证发现校准文件一次完整成功 wall 为 17,543.864644 ms，高于原 13,573 ms 观测下界，因此新 floor 保守登记 **17,544 ms**，原值保存在独立历史字段中，未丢弃或伪称同一版源码。其余六项保留原较慢观测：Host 17,143、Windows shape 11,162、class/potion 10,864、watcher 21,870、Defect source 16,574、runtime 12,019 ms。
- 当前实际 planner：Windows **1,801,345 ms**，超原 1,800,000 ms 目标 **1,345 ms**；POSIX **1,137,425 ms**，余 62,575 ms。每个平台完整包含 800 JS，Windows 另含 1,410 Lua，无遗漏或重复。
- 即使理想平衡，Windows 也至少需 **1,800,665.882 ms**。总规范化工作量 19,075,853 + 7,852,637 + 5,325,660 / 2 = 29,591,320 ms，大于 17 × (1,800,000 − 60,000) = 29,580,000 ms。仅改分配顺序不能修复真实成本问题。本次没有实施无效的调度调整。
- **overall admission 仍为 BLOCKED**。这不是目标已达成、最终 HEAD 的 Hosted Full、准入 PASS、入队、合并或合后验收。原 HEAD 的 Hosted 成功不转移给本次变更。没有重复本地 Full、手动 rerun/dispatch、用户电脑或 GUI 操作。

## 合同结构

新的精确外层 reader 只接受当前完整 timing 字节的 LF/CRLF 两种表示，返回固定原 Emerald timing 字节；未知路径、截断、额外字节、值/元数据漂移不获得旧身份。旧 Emerald 和更早的压缩档、原始 hash、804 行原断言逐字保留。

七个原 CI 文件继续执行所有原测试。旧 runtime 的完整 33-floor 断言和 Emerald 原始 forecast 由完整原 planner 注入其固定 timing 运行，日志明确标为 frozen/original。新增三项合同使用未经历史投影的磁盘字节及实际导出 planner，验证全部 40 floor、七份来源、后补完整观测、原 snapshot 压缩/解压摘要与条数、漂移拒绝、全量覆盖和未消失的预算阻断。没有把旧历史投影用作当前成本通过证明。

新登记 fixture、20261110 观测 JSON 和本包 JSON 显式 LF；压缩档为二进制，避免 Windows autocrlf 破坏真实字节摘要。原 timing 仍支持其既有 LF/CRLF 合同。

## 本地验证与失败保留

- 七个不同完整文件 **82/82** 用例通过，零 skip/cancel；这是原 79 项加三项新增合同，不叠计复验。命令逐文件 `node --test --test-concurrency=1`，无 name/skip selector，同时保留 Node 总时长、外层 wall 和 native file summary。
- 初轮 runtime 12/13：旧完整33-floor断言错误收到 live40 数据，失败原日志和快照保留。修复仅冻结该原合同的实际 planner 输入，当前40另由新合同检查；完整 runtime 13/13 后复验成功。
- 独审发现并修复两类 Windows LF 绑定、历史 forecast 的 current 标签和 snapshot 未实际打开的问题。最终修改过的完整 calibration 另复验 **48/48**，wall **14,894.074337 ms**，Node **14,790.467021 ms**，native summary **4,600.96816 ms**；不降低先前较慢的17,544ms floor。
- 每个命令前后对已跟踪文件、新实施文件及本树生成 `build/lua` 输入独立采快照，hash 稳定。稀疏缺项显式 null；node_modules、无关未跟踪输出未认证。共享 Linux 主机观测不等于隔离基准或 Hosted Windows 性能。
- `build:data`、`build:ui` 在本树独立生成；原 Emerald receipt 的 1,238 个输入摘要全部一致。未借其他工作树的生成物作证明。
- 指引、Backlog 范围、脚本语法及 diff 空白检查通过。doctor 的历史重复 ID / 归档位置警告另保留，不借本次修改解决。

`initial-validation-observations.json` 保留初轮（含 runtime 失败）；`corrected-validation-observations.json` 保留修复后五文件；`registration-validation.json` 仅汇集七文件成功观测，并供更高的 calibration floor 引用。`final-calibration-validation.json` 是最终合同修正后的完整复验。所有记录保留原本地路径，同时增加真实归档 `publishedPath`；日志与去重输入快照逐字存档。旧观测不足的 pre-run provenance 不升级。

`historical-capacity-proof.*` 是独立 reviewer 针对最初七项观测的复现，数字为 1,801,318 / 下界 1,800,432.294，保留其原时间点。本页新 forecast 已纳入本轮更慢 calibration，不覆盖或改写旧报告。

下一步须由原共享证明优化线提供实际改进，再在保留旧历史观测的前提下绑定新实现、测完整成本，独审精确 HEAD/BASE 并走正常 Hosted/原生队列。不能靠扩大预算、降低未经改进的观测、跳过断言或借旧绿灯解除 BLOCKED。

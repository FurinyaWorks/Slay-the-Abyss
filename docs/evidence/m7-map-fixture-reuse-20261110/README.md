# Map 固定种子夹具构造复用

接续 PR #591 HEAD `49678e7ba6fd6365c7d5573e5b51ccae6fde6e1d`，BASE `1eb288472d7b33b7450eec97a624ca2ffa526f39`。仅减少本 PR 新增 Map 测试的重复初始夹具构造；不改生产代码、共享 observer/runtime 或 #586 的证明构造。

## 范围与证明

每个独立 VM 只构造一次固定 seed-42 的初始 RNG snapshot，每个场景仍用原 `abyss_copy.copy` 创建独立 table/words。场景执行、生产 RNG 调用、图观察、返回值、错误、别名和依赖跟踪均不缓存。旧 fixture 原始 Git blob `e137d19eccee94692f6f166ebc60bf560bec5578` 完整保留为 `tests/fixtures/map-emerald-cases-before-reuse.lua`，原十项测试、VM、observer、生产源码及来源 owner 合同原字节不变。

- 同一进程交替先后次序，原/新 fixture 分别运行当前源码、完整原源码、原负控基准及全部14个真实语义 mutant，共17对全新 VM。两边每个完整 JSON 图流逐字一致：各17,529检查点，标签、全部定义和状态身份完整比较。14个 mutant 仍各自不同于原模块的负控基准。
- 原/新17次合计观测为35,762.329587 / 29,619.349784ms，差6,142.979803ms。这是本机诊断探针的总时钟，包括旧模块/负控基准和mutant；不是原测试整文件成本，不换算为Windows、Hosted或规范化容量收益。
- 新永久合同在同一 VM 同时保留多个 fixture，核对 map/mapRng/words 不同身份；修改第一个 words/counter 后，第二个、模板及后续 fixture 仍原值。直接共享模板、仅浅拷贝words、错误初值三个真实负控均须被具名断言拒绝。
- 历史收据只在精确已知新 fixture 的LF/CRLF字节上投影到原完整输入；未知路径、变异、截断和多余字节不投影。当前行为合同直接读取未经投影的磁盘输入。旧receipt/hash/归档/断言不覆盖。

## 验证与交付边界

完整受影响文件、输入前后快照和独立审查记录随本目录保存。本轮不重复本地 Full，不操作用户电脑，不触发手动rerun/dispatch。完整进程成本、Node总duration、native file summary分别保留，不混为同一口径。

**所有 timing/floor 原字节保持。Windows原预测仍为1,801,345ms，超1,800,000ms目标1,345ms；理想总量仍缺11,320ms。overall admission保持BLOCKED。** 本次小型构造优化不是成本准入闭环，未降低观测、增加分片、放宽预算/timeout/worker或删除断言。原HEAD的Hosted结果不能转移为本次HEAD通过；精确新HEAD独审、正常Hosted、原生队列和合后验收仍独立要求。

## 完整文件结果

- 原 `emerald-map.test.mjs`：10/10，Node总时长64,921.923415ms；完整旧新VM、14语义负控、固定Luacheck与来源合同全部执行。
- `ci-complete-calibration.test.mjs`：50/50，Node总时长14,415.349713ms。48项原合同加2项新增fixture合同；真实当前Windows容量阻断仍被原断言检出。
- 两个完整命令逐文件串行执行，零失败/取消/跳过；各自所有跟踪输入、新helper/原fixture副本及本树生成Lua的测前/测后摘要一致。外部依赖包不因此宣称已全面认证。墙钟、native summary及完整输入范围见 `targeted-validation.json`。
- 指引、Backlog范围与diff检查通过。独审另执行两项新合同，不重复上述完整文件；完整原/新17对图流执行由实施方完成，review核对了全部mutation来源、摘要、数量及脚本，未伪称独审重复实跑。

`probe-fixture.mjs.gz` 与 `measure-targeted.py.gz` 是实际执行脚本原字节；保留当时 `.artifacts/round24/` 路径。需要复现图流时先解压脚本，并把已固定的 `tests/fixtures/map-emerald-cases-before-reuse.lua` 复制到脚本要求的 `.artifacts/round24/map-emerald-cases-before.lua`。`archived-paths.json` 给出输入快照的原路径与去重归档映射；日志gzip保留原日志全文。独审JSON里的HEAD为本轮受审前驱，代码范围由逐路径hash绑定，不是新提交的整体合并准入PASS。

Backlog doctor仍报告既有5组重复ID和93个旧归档位置问题；未修改无关任务。首次不支持的`--plain`调用错误及无参数正式诊断均保留。

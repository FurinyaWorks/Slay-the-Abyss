# PR #599 successor CI epoch: Draft / BLOCKED

基线：`da1c045af8508274565527857ac3eec874f201b2`。本层不改写已发布的 `run-healing-ci-contract.mjs`、`run-healing-ci-source-inverse.mjs`、`run-healing-ci-source-epoch.json.gz`，三份文件逐字节保留。

## 接线与真实门禁

- 新严格外层绑定当前两项 Watcher 测试、四个 CI 适配器、timings 与属性文件的精确 before/after 源码；只接受完整经认证 LF/CRLF 文本，外来路径、部分输入和漂移不获得历史身份。
- 历史合同适配器先核对已发布源码 SHA256，仅重定向 fs/planning 两项 import，保留原断言体。新的公开 proof 与历史 timings 均递归冻结；负控拒绝根、嵌套映射、floor、数组、属性及原型篡改，并检查 warm inverse、weights、shard 不变。
- 当前合同独立使用真实 disk/live planner，绝不将当前预算失败转换为通过。当前 inventory 仍为802 JS / 1412 Lua，无新增被 discoverJs 发现的测试文件。
- Boundary 完整10/10：32325.761562ms → local floor32326；Potion 完整5/5：11237.073321ms →11238。全部其他成本、未知10s、workers、shape、并发、timeout 与预算未变。
- 原60s reserve计入后，POSIX15=1134695ms（预算1200000）；Windows17=1800027ms（预算1800000），**真实超27ms，BLOCKED**。

## 验证阶段，不混同身份

完整明细及 hashes 见 `stage-report.json`。

1. Watcher 两份完整成本收据是追加CI层之前的真实5921项输入观察，不冒充新层最终验证。
2. 四个改动CI文件各完整执行一次：47/46/1、4/4/0、13/13/0、3/3/0；唯一失败是当前Windows预算。观察时整进程11.531s /8.765s /12.225s /9.327s，均低于既有有效规划成本；失败执行不作为成功成本校准。
3. `followup-sealed-four`完整四文件aggregate为67 tests /66 pass /1 fail，输入稳定。此阶段已冻结proof，但尚未最终冻结独立导出的historical timings；因此不标为最终同字节四文件验证。
4. 最终冻结timings后只做受影响helper合同窄回归：`followup-final-helper` 5 tests /4 pass /1 fail，无skip/cancel，唯一预算失败仍保留。其5930项before/after输入完全相同，并与最终当前捕获文件逐项匹配。
5. aggregate→最终窄回归，原捕获文件只改两个helper：predecessor的timings深冻结、current-contract的新嵌套planner mutation负控。仅新增helper-validation collector；无删除，其余捕获输入无漂移。

目录集合快照不是OS动态依赖追踪；collector排除本证据目录的可变JSON/log输出与静态`.mjs.txt`独审材料，避免自包含hash循环。最终全文件成本没有重新声称已测；不重复Full、四文件aggregate或追逐较快测量。没有Hosted通过、可合入或发布许可结论。

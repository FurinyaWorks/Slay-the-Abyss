# Map 翡翠精英身份职责：本轮证据

基线：`1eb288472d7b33b7450eec97a624ca2ffa526f39`。完整范围与限制见 [职责说明](../../backlog-details/M7-MAP-EMERALD-20261109.md)。

## 当前结论

生产重构、行为回归与来源证明已通过独立审查，合并准入仍 **BLOCKED**。本轮只交付 Draft；已知部分CI测试完整进程成本高于既有规划权重，当前数学预测不是完整成本闭环或Hosted Full证明。原有预算、分片数、worker、并发、断言和全部门禁均未放宽。

同一次双报告证据见 `ci-cost-observations.json`：file summary与完整Node/进程成本分开列明；内存保守纳入已有完整观测后Windows只余49ms，其他完整文件成本仍有缺项。配置没有据此伪装全面校准。

## 证据索引

- `metrics.json`、`baseline-engineering.json.gz`、`current-engineering.json.gz`：338模块完整W561/AST计量、依赖与SCC逐项核对。
- `complete-run-receipt.json`、`complete-run.log.gz`：最终完整10/10、87637.813005ms、本地规划下限87638ms。1238个可移植运行输入与完整4281文件快照分开认证。
- `test-inputs-{before,after,stability}.json.gz`：真实hash→run→hash，无变更。测后timings及CI测试接线变化不冒称仍与该广域快照相同。
- `initial-complete-run.log.gz`：首轮完整10/10，63562.020062ms，无pre-run绑定；不与第二轮叠计覆盖。
- `initial-failure.log.gz`：首次等价变异的可见摘要，明确不是完整原始日志。真实公开返回变异随后已被检出。
- `independent-probe.mjs` / `.log`：独立11个Git原始/当前探针，可从固定基线复现。
- `source-epoch.log.gz`、`integration-source-epoch.log.gz`：新5+旧11合同、38公共来源合同；原档/hash未改。
- `related-gameplay.log.gz`、`responsibility.log.gz`、`test-strength.log.gz`、`native-ui.log.gz`：相关11项、原门禁19项、关键变异4项、原生UI离线6项。
- CI日志：首次历史reader故障原始日志保留；最终45项校准、20项runtime/旧形状、19项分片以及额外历史source检查分别记录。精确文件成本与是否包含模块导入另看本目录的成本诊断，不从一个组合命令总时长伪造每文件观测。
- `doctor.log.gz` 保留既有5组Backlog重复ID；范围验证与guidance通过。没有无关任务修复。
- `manifest.json` 是本目录文件的SHA256与字节索引，不参与其自身hash。

没有本地Full重复、Hosted Full成功、正式合入、GIL导入、官方ready、客户端画面或手机实测声明。

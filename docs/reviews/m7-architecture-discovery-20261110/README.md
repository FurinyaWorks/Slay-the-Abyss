# 架构源码发现：验证记录

基线：`ab65ed3b5b4240eb653af4651a13c1b8c72b2e04`。范围与待验事项见 [技术说明](../../backlog-details/M7-ARCHITECTURE-DISCOVERY-20261110.md)。

## 实际执行

| 记录 | 结果与含义 |
| --- | --- |
| baseline-shared.log | 原共享采集文件 5/5 |
| red-shared.log | 新回归对旧实现：5 过、4 失败，保留原失败 |
| green-shared.log | 修复后该完整文件 9/9 |
| related-full-files.log | architecture、engineering-quality、engineering-quality-policy、engineering-shared-inputs 四个完整文件 32/32；不是全库 Full |
| architecture-boundaries.log | 原架构边界文件 2/2 |
| current-report-equivalence.json | 当前 338 模块、1,929 引用完整报告前后逐字相同，摘要绑定 |
| architecture-cli.log | 独立真实 CLI 通过 |
| guidance.log | 指引检查通过 |
| backlog.log / backlog-green.log | 初次路线缺登记失败与补齐后的通过，失败未删除 |
| related-plan.json | 完整传递选测计划；仅计划，不代表其中全部测试已执行 |
| independent/ | 独立审查、正负探针、原失败和 #601 精确组合验证 |

新增断言接既有测试文件，没有新增测试库存或放宽成本预算。必要托管 CI 与正常合并准入仍待，不将本地证据当作跨平台 Full。

# Defect Actor 本轮证据

基线 `6a614fc82697750ddb408750e54f59f801c24f1e`；任务 TASK-74.19。生产范围、测量解释及未通过项见 [实施说明](../../backlog-details/M7-DEFECT-ACTOR-BOUNDARY-20261111.md)。

## 有效结果

- `behavior-complete.log`：新18项完整文件；原52场景、独立旧新VM全图、冷加载、校验顺序、事务回滚、冻结协议和6语义负控。
- `adjacent-behavior.log`：原Utility、M9协议和Watcher共27项通过。
- `source-final-complete.log`：最终来源文件12项通过，包括完整79-owner暖态鲜读与历史链。
- `engineering.log`：完整工程入口，包括4个真实变异和6项原生UI合同。`engineering-quality.json.gz`、`architecture.json.gz`、`ui-complexity.json.gz` 是该轮完整报告，不是摘要代替。
- `measured-architecture.json`：相同工具对345个当前与基线模块的本轮测量。`plan-before.json.gz` 是前轮方案分析，不能代替实施后测量。
- `static-checks.log`：syntax、guidance、Backlog、network和diff检查。
- `cost-*`：本地整文件耗时、来源hash、完整库存规划和CI消费者；不代表Hosted测量。原60秒预留、预算、并发、worker与超时保持。
- `behavior-independent-review.json`、`cost-independent-review.json`：分工独立审查，精确覆盖和输入身份见各报告。独立重跑不与主控批次重复累计。

## 失败与修复保留

`red-cold.log` 为原实现真实红测。`first-complete.log` / `graph-focused.log` 是新图断言把生成模块库存计入的错误，修后图测试及18项完整通过。`reviewer-source-probe.*` 保留原独立发现的M7 queued历史链config身份失败；`source-chain-*` 保留修复期间红绿，后续probe明确由修复者复跑，不冒充独审。

`closure-consumers.log` 为29项中的28通过、Formation历史入口1失败，后续 `encounter-source-repair-green.log` 完整12项通过。`room-source-consumer.log` 为6项中的5通过、Room历史入口1失败，`room-source-green.log` 完整6项通过。两个修复都仅在历史读取入口先接本片合法投影，原断言与当前raw-owner验证保持。

`direct-source-consumers.log` 为49项中的45通过，包含Compendium、Relic与职责门禁30项全部通过；4处失败均为Seven旧读取入口未投影本片。最小修复后 `seven-source-green.log` 完整19项通过，所有测试正文和原断言逐字保留。这些批次不相加成一次Full。

`source-chain-ci-transient.log` 与成本中间记录保留共享工作树写入期间的临时身份不匹配，不当作测试通过。`cost-ci-first.log` / `cost-ci-second.log` 原样保留，最终结果见 `cost-ci.log` 与后续精确输入补验。旧归档没有重写。

## 边界

各批均为必要定向或工程检查，未运行新的整套Full、原生Windows、用户GUI或正式RC。提交后仍需精确HEAD/最新BASE组合审查、原正式CI、正常Merge Queue及实际合后push验收。任务状态与AC未提前完成。

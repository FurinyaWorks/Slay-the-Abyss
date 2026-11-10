# 延迟导入例外的审查记录校验

基线 develop `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04`；归属 TASK-74.19.1。

## 修复边界

原门禁直接将 deferredImports 转成允许集合：缺少、空白或非字符串 reason 的记录也能把真实依赖环标为已审延迟导入；空行还会抛 TypeError。本片先校验容器、记录、两端真实模块身份及非空字符串审查理由，只让有效记录进入豁免集合。from 必须为当前源码自身模块；to 可为当前源码或已声明生成模块，不借 Object 原型名字匹配。

保持原已声明字符串配对的重复与过时诊断；无效记录不删除其他有效审查，但整个策略检查仍失败。生成模块目标、重复引用、立即调用、层次与职责边界不变。六份既有合成策略夹具补明确理由，所有原断言保留；未更改生产 Lua、真实策略、历史 epoch、测试成本或 CI 预算。

## 验证与独立审查

- 新增四项回归在旧实现为 2 过/4 失败；原始错误及中间失败保留，不把修复前阶段当最终通过。
- 当前 338 模块、1,929 引用位置、0 错误；完整架构报告前后 297,606 字节逐字相同，不声称 SCC 或 CC 减少。
- 独立 `independent-m7-round14-deferred-policy-20261110`：59 个探针、13 个原实现语义反例通过，两项真实语义回退被独立环检查拒绝；八文件摘要绑定及未决为空见附件。
- #601 `ab5d3fd04753de30411afb4d9e5400d36d6a7334` 与 #604 `6ca77d2f04890ca632136a468c4d7a7aa9c4ac18` 的执行改动在隔离组合树验证。#604 的相邻声明产生一个文本冲突，显式同时保留 sourceFile 与本片策略验证；三文件 24/24 通过。此结果不是两PR已合入的声明，也不改其远端。

完整十文件消费者最终为 60/62：仅既有 Session reward events/dynamic 完整 VM 子进程触发原 30 秒超时，未改变其超时、断言或生产输入；因此不声明本轮消费者全绿或可合并。失败日志完整保留。没有重复本地 Full、手动 CI 重跑或操作用户 GUI。发布保持 Draft，精确公开 HEAD/BASE、正常必要 CI、独立准入及原 merge:auto/队列与合后验收未齐前不报告合并完成。官方导入、ready、设备和发布验收均不在本片范围。

## 证据重放

附件：[本轮原始日志与审查](../evidence/m7-deferred-policy-20261110/)。既有仓库入口运行 architecture-boundaries、architecture、engineering-quality 和 engineering-shared-inputs 测试即可重放生产门禁合同。

独立探针使用隔离临时目录：复制当前 scripts，链接当前 data 与 node_modules，将基线提交的 scripts/check-architecture.mjs 保存为 scripts/base.mjs，再复制附件 probes.mjs 与 mutations.mjs 到临时目录根并依次用 Node 运行。变异仅写临时 scripts 副本。对照必须使用上述真实基线，不用当前源码冒充旧实现。

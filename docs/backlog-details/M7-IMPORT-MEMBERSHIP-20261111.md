# 架构导入必须来自精确登记集合

## 本轮范围

基线为 develop `3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。核对全部9个开放PR及执行线后，`scripts/check-architecture.mjs` 没有代码占用。本片接续 TASK-74.19 的依赖防回退范围，`task:pick` 因已有 In Progress 返回 HOLD；没有重新认领、改变负责人/状态或勾选 AC。

原检查使用 JavaScript 的 `in` 运算符，错误地允许 UI `require('constructor')`、`require('toString')` 等继承属性通过未知模块门禁。它们不在解析的源码集合，也不在生成器的显式登记中。独立旧版探针证实 Object.prototype 的12个属性均被误接纳。

只将导入资格和即时环遍历的成员判断改为 `Object.hasOwn`。后者保持图遍历只跟随真实源码节点，是一致性加固；对普通稳定对象，它没有独立可观察的回归结果，不宣称额外修复。保留延迟导入、层次、完整边位置、生成模块合同和所有现有断言。

没有生产 Lua、架构配置、共享来源 facade、CI 库存/成本/预算/worker 或工作流变动，不接入 #610、#618 或 CharacterProfiles 的在途共享层。

## 证据

原始日志、机器身份和独审位于 [本轮证据](../evidence/m7-import-membership-20261111)。

- 原实现运行新增回归真实失败：9项旧测试通过，新增1项失败；修后架构、边界、共享采集及质量四文件35/35通过，0跳过。
- 新回归逐个验证12个标准原型属性未登记时拒绝、显式生成登记时接受，以及自定义继承 source/generated 拒绝、显式源码/生成及 null-prototype 映射接受。
- 独立探针另核12个同名真实源码仍可登记且环仍检出，精确旧源码作为失败对照；独审无未解决发现。
- 当前完整架构报告修复前后字节相同：345模块、1953依赖位置、0架构错误，SHA256 `37c94bdc4ff351195f4553f314379187569ec4c265c0bd2040d1924dfb328fba`。345份生产Lua均与基线逐字相同，不宣称降低SCC或CC。

syntax、guidance、Backlog、network及独立architecture入口通过；diff空白检查通过。

选测器报告需Full；本轮只做必要定向检查，不用局部通过代替Full。POSIX本地Node为24.22.1，不是原生Windows或托管指定版本。最终精确HEAD正式CI、独审准入、队列及实际合后push仍待，源码交付不等于官方导入、ready、设备、容量或发布验收。

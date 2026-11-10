# 架构初始化迭代器漏检修复

本轮在 develop `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04` 接续 TASK-74.19 的依赖防回退，不新增玩法或职责切片。开放 PR 全路径及本地工作树检查后，`scripts/check-architecture.mjs` 和 `tests/architecture.test.mjs` 没有在途语义改动；旧 CRLF 验证树的同名差异仅为换行，保留不动。避开 #599 的来源/成本接线和 #588 的生产 UI。

## 已复现的问题

Lua 的 generic-for 在初始化阶段调用第一个迭代表达式返回的 iterator。旧分析器只记录显式调用，因此 `local function iter() return require("b") end; for value in iter do end` 会被错误认作延迟导入。在 b 回导 a 且 a→b 有延迟例外时，原检查报告无错误，漏掉真实初始化依赖环。返回 iterator 的 factory 同样受影响。

修复复用既有局部绑定与返回函数解析：显式调用和 generic-for 都登记被调用表达式，后者仅登记第一个 iterator。循环变量遮蔽之前读取表达式；状态、控制及额外值不因传入 for 就被当成函数调用。循环仍归属于包含它的函数，未调用的外层函数不提前激活。

## 验证范围

- 原 7 组架构测试通过；在原分析器上加入回归后 7 过、2 失败。保留真实红灯输出。
- 修复后完整架构文件 9/9；新增 23 个场景包含直接/别名/赋值/factory/nested iterator、循环变量遮蔽、状态及控制表达式、未调用 owner、未调用返回值和同一依赖对的即时/延迟混合。
- 三份完整工程消费者文件 21/21；原架构边界文件 2/2；没有失败、跳过或取消。工程消费者日志中的 `tool missing` 是已有失败传播负控，不是遗漏验证。
- 完整生产扫描仍为 338 模块、1,929 个引用位置、0 错误。旧新 architecture JSON 逐字相同；没有减少当前 SCC、复杂度或依赖数量的声明。
- 独立复审通过：37 个静态探针与真实 Fengari 调用次数一致，旧分析器在其中 19 个场景分类错误；5 个真实语义回退被拒绝。使用计数 require 替身验证调用时机，不冒称真实模块加载器循环或官方客户端验证。独审脚本为可重跑入口，当前公开提交身份另行绑定。
- `check:guidance`、`verify:backlog`、diff 检查通过。没有改动任何生产 Lua、架构配置、timings、来源 epoch、预算、worker、workflow 或有效断言。

原始日志、绑定源码身份与独立复审见 [本轮证据](../reviews/m7-architecture-iterator-20261110/)。本地 Node 24.22.1/Linux 定向检查不能代替当前公开 HEAD 的 Hosted Windows/POSIX、正常 Merge Queue 和合后 Full。

## 保留边界

这仍是有界静态解析，不扩展到参数回调、表分派、logical-expression callee、任意动态返回值或多次写入的数据流推导。既有未知情况与人工延迟例外审查要求不变。

`task:pick TASK-74.19` 因任务已 In Progress 返回 HOLD，不重新认领。当前环境 Backlog CLI 不可用，未手改任务文件、owner、状态或 AC。依据 Owner 对独立 M7 修复的授权执行本切片；没有宣称 M7 完成、官方导入、真实 ready、设备验收或发布。

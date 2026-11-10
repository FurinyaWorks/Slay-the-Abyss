# #582 组件输出别名保护接续

2026-11-10（北京时间），接续既有 #582 / TASK-100.1，不新领 Sprint 任务。前序 HEAD 为 `06bc84ee4b2b3c7b51486df678ac4551ced1b084`，develop 为 `1eb288472d7b33b7450eec97a624ca2ffa526f39`。

## 修复

仅复用 #588 提交 `1a733d800a2a50309803face7f30fd2a98b2cd31` 已有的单行保护：将 `abyss_component_binding.lua` 加入原构建器写入前的输出别名预检。没有引入 #588 官方素材功能，也未改变生产 Lua、视觉、生命周期、规则或 RNG。

旧 Full [42591125959](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42591125959) 的 [POSIX12](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42591125959/job/129074595018) 和 [Windows8](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42591125959/job/129074595213) 均因该输出硬链接/符号链接覆盖输入而失败：20 个唯一合同、40 次失败执行。两份完整解码日志保留原 BOM、换行和正文，不是节选。

生产修复后，原历史 CI 来源合同因整文件身份变化正确拒绝。新增严格三文件外层投影只接续当前 build-ui、校准测试及原投影入口到 Git06bc 原件；全部38份既有 helper gzip、原 hash、旧测试正文和成本保持。漂移、缺失、错误路径及非字符串仍按原边界拒绝，不把旧收据伪装成当前性能测试。

## 本轮验证

- 原输入覆盖失败 RED 后，完整输入保护 513/513；零跳过，含硬链接、符号链接、输入不变、零部分写入及正常重复生成。
- 完整 CI 校准/runtime 两文件 53/53；四份直接来源消费者 49/49。
- 独立运行时8个附加探针与投影132项断言通过，无未解决问题。原38份历史档案逐字保持。
- 全 JavaScript 语法、verify:backlog、check:guidance、diff 空白检查通过。doctor 原5组重复ID/93旧归档位置警告保持，未自动修复。
- Linux Node24.22.1，不冒充 Hosted Node24.18.0 或 Windows。完整日志、源码和压缩/解压摘要见 [validation.json](validation.json)。

前三次本地探针因未物化 PNG 未进入目标断言，原有界 materializer 随后验证4份冻结 preview；这些失败及真实 RED、历史投影 RED、稀疏检出缺文件和独审探针准备错误均保留，不累计重跑覆盖。

## 交付边界

`test:related --plan` 因共享构建设施要求正常 Full；没有重复本地 Full、手动 rerun/dispatch 或用户电脑/GUI操作。本轮没有修改成本、矩阵、预算、并发、worker、超时、工作流或原准入规则。新精确 HEAD 的 Hosted Full、独审状态握手、原生队列及合后验收仍待；TASK-100.1 继续 In Progress，AC5未勾。官方导入/ready/容量及实体设备验收未执行。

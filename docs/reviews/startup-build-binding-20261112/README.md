# 启动 ready 必须属于最后一次候选加载

基线：develop `3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。接续 TASK-86 的候选完整性维护；本轮 `task:pick` 为 ALLOW，Backlog CLI 不可用，未声称认领，也未修改任务状态或 AC。核对了全部 173 项任务、M7 和 16 个开放 PR，两个源码/测试文件不在这些 PR 的改动范围。

## 真实缺陷与最小修复

原入口选择第一个匹配的 `ABYSS_BUILD`，因此“本候选 BUILD → 其他候选 BUILD → ready”也会通过。同一候选重启但未再次 ready 时，旧 ready 也能被借用。现在只接受最后一个客户端 BUILD 边界后的 ready，且最后身份必须精确匹配；不完整或格式错误的 BUILD 不能沿用旧成功。

独立复审另证实原 `clientScript` 真值判断与日志比较的 `=== true` 不一致：解码值 `'false'` 或 `1` 与声明的 false 对比相等，却能被当成客户端 ready。现将 BUILD、ready、故障三处统一为严格布尔 true。真实客户端故障仍按整轮拒绝。原运行请求、候选哈希、原始日志、完整解码、订阅及时间检查保持。

只改既有 `scripts/native-playtest-evidence.mjs` 和 `tests/native-playtest-evidence.test.mjs`；未新增测试文件、依赖、运行时产品代码、共享来源适配或 CI 成本配置。

## 本轮证据

- `baseline.log`：原有启动测试 1/1。
- `red.log`：加入候选切换/重启矩阵后，原实现真实失败于“another build cannot supply ready”。
- `type-red.log`：恢复真值谓词的负对照真实失败，最终实现已恢复。
- `green-final.log`：最终启动测试与真实 BGM CLI 来源测试共 7/7；启动测试内另有 12 种加载顺序与 8 种类型边界，不与 7 个 Node 用例重复累加。
- `adjacent.log`：首次相邻检查失败原样保留。独立工作树缺少 sparse schemas 和本轮生成的 Lua 数据，不能算通过。
- `build.log`、`adjacent-final.log`：从 Git 补齐既有 schemas 后，运行原 build:data/build:ui/map 入口，相邻 evidence-binding、candidate-audit、candidate-paths、native-startup、input-lifecycle 五文件 55/55 通过。
- `checks.log`：guidance、Backlog、network、最终两文件语法和 diff 检查通过；Backlog CLI 缺失也明确记录。整库 JavaScript 语法检查曾在严格布尔小修前通过，最终两文件又独立验语法。
- 独立复审最终 PASS，unresolved=[]；两文件 binary diff SHA256 `2735996ec20ac4b925fd766eb0b99101888a1d3eb0a69b412aca748ecb2bf9e2`。复审独立重跑启动用例；前轮对最新 BUILD 语义运行 4,096 个四事件序列与独立状态机对照，后轮复核全部类型修复。不同批次不累计为去重总数。

相关选测仅生成计划，未执行其宽选集；没有手动触发或重复 Full。正式精确 HEAD CI、独审准入、原生队列与合后验证仍须走既有流程，当前不宣称可合并。没有官方导入、新官方 ready、实体设备或发布验收；本修复是收紧证据判定，不能补造这些证据。

# 源码扫描边界的新基线接续

接续 TASK-74.21 和 PR #611，不重复认领或新增实现。原 PR `170a4f0a3b67aa358e9363e795871febe9c970f2` 合到 #613 已进入的 develop `3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。

## 组合范围

唯一冲突为 `.gitattributes` 文件末尾的两侧追加。保留完整 develop 前缀，再追加原 PR 的证据字节规则；#613 的24个其他文件、原 PR 的15个源码/测试/说明/证据文件与345份生产 Lua 均逐字核对一致。Backlog 仅通过 CLI 追加接续计划和结果，原状态与 AC 不变。

没有修改扫描实现、Lua玩法、复杂度上限、历史 oracle、CI来源/库存/成本/分片、预算或超时；本次不声称减少 CC 或依赖环。原7行工具修复与3条回归原样接入，仍先拒绝 `src` 链接，再检查 `src/lua`；仓库根别名仍可使用。

## 本轮验证

原始日志与保全清单见[本轮证据](../evidence/m7-source-root-current-20261111/)。环境为 Linux、Node v24.22.1。

- 四份完整工程消费者37/37通过；发现与架构边界两文件14/14通过。两批有重复，不相加成去重总数。
- 完整静态三入口通过：345模块、5918/5918测量、1953引用、原14条历史告警。`node scripts/check-engineering.mjs` 不包括 npm 同名链的变异和原生 UI 合同，不冒充 Full。
- 当前架构报告的紧凑 JSON SHA256 为 `0ee1b397d7c0fca64bd46d2844873c658ec4716cb81e7d3ea66a58365c5e7a43`，与原 PR 真实报告一致。
- 全库 JavaScript syntax、guidance、Backlog、network 和 diff 检查通过。
- 独立组合审查 `source-root-current-base-20261111-r2` 未发现未解决问题，另跑3条定向回归及6个悬空入口负控；不与上述测试重复计数。最终提交身份另在 PR 评论绑定。

本轮没有原生 Windows、正常 Hosted Full、原生队列或合后 push 验证。保留 Draft，不重复启动 Full，不设置独审准入 success 或 auto-merge；#610 的基线修复由既有执行线处理。待该线完成后，须再按当时最新 develop、精确 HEAD 的正常质量门禁准入，旧组合证据不能替代。TASK-74.21 仍 In Progress，AC3 未勾。没有官方导入、ready、设备、容量或发布验收。

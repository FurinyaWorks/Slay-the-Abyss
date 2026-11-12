# 战斗页线性集成与异步队列交接

用户在完成战斗收尾后授权 merge queue，并指定按 PR617 异步集成规范交接。目标 develop，禁止发布；原分支、R12试玩入口及未提交产物保留。TASK-103 仍 In Progress，官方客户端与手机验收未完成。

## 来源与范围

- 基线：`3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。
- #607 已接入旧 #588 的 `a1a3ba4b6b83ab1ddca76268e08bba9c014ad375`。只接续它到 `6aff0b4be5fa0b90cb084b1c11fd8ee6428814ec` 的净增量，避免重复引入旧分支合并历史或覆盖主线功能。
- [provenance.json](provenance.json) 实际逐文件校验：31 个 src/scripts 文件等于原试玩版本；27 个主线独有 src/scripts/config/CI 路径完整保留，包括删除状态。主题完整 JSON 三方合成，无冲突字段；legal 保留双方登记。
- 生产改动限战斗卡面、输入/反馈、HUD、牌堆入口/浏览和遗物详情。复用最终手牌模板。没有玩法、数值、奖励页或 CI 门槛变更。

## 本轮组合验证

- `npm run build:data`、`npm run build:ui` 成功。
- `integration-epochs-final.log.gz`：CI 来源及 Formation 当前真实 owner 闭包共 **64/64** 通过；每个 owner 的温热漂移、删除负控保留。
- `ci-integration-final.log.gz`：最终归档更新后 **52/52** 通过。当前 Full 原始发现 **840** 个 JS 文件；六个新增文件有完整摘要、缺失/重复/未知输入负控及两平台分片完整覆盖和原预算检查。历史 834 文件清单只用于重现旧收据，不替代生产 Full。
- `integration-epoch-v3.log.gz` 中 room/seven-refactor/牌堆/药水/遗物等当前功能与来源合同通过；其七项 CI 历史来源失败已在上述最终 CI 日志修复并复验。一个依赖外部候选的可选测试为 skipped，不作为本轮候选验证。
- `integration-runtime.log.gz`：官方资料/运行时、原生启动和 UI mock 合同首轮 **43/45**；两项失效断言分别是扩展后的真实 owner 数 79→88、批准牌堆返回按钮的 preset→独立 cursor 接收器。前者已在 64 项组合复验，后者 `geometry-integration.log.gz` **1/1** 通过；其余页原始几何与输入断言保留。
- `engineering.log.gz`：345 模块、5970/5970 测量、1955 依赖边；无新增 Luacheck 诊断，14 条显式历史告警保留。license、Backlog 与日常 platform-load 检查通过。

旧源码归档不改写。新的 battleQueue 外层公开 current 精确绑定组合树；历史 target 保留。CI 使用另一层完整源码身份投影重现旧收据，不放宽未知源码或生产发现。

## 视觉与性能的边界

复用 [R12整页画面及原始性能证据](../battle-piles-final-20261111/README.md)，本次31个生产 src/scripts 净增量逐字一致。原试玩 `http://127.0.0.1:52608/` 保留并读回 HTTP 200。此入口仍提供原 R12 候选，不冒称已由本次组合 HEAD 重建。

没有重新打开《原神》、官方导入或手机实测，也没有把本次组合源码检查冒充新的整包/设备验收。普通 PR 交由现有 GitHub 门禁和 native Full queue；不重复派发 Full。精确 HEAD/BASE 独立评审、授权 journal 及 proof 保存于本工作树 `build/delivery/`，队列授权读回后交接，不持续轮询等待。实际合入后仍须用该 proof 执行 `verify:delivery --merged` 核对真实 squash 与 develop push Quality。

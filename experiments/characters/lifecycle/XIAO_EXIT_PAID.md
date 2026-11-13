# 魈 x09/x11 显式候选付费切片

基线 921d23cb；仅专属 bridge / paid gate 和测试。默认 `definitions()` 仍返回原八张，新增 `additionalDefinitions()` 仅显式返回 x09/x11，不扩 starter、正式职业、自然奖励池或数据文件。现有 core_data 中两卡来自冻结候选 cards.json（SHA256 `1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa`），没有改值。定向测试独立断言基础/升级的成本、消耗属性与完整有序效果。

- x09：1 能，先退面具再原生抽 2/3；真实洗牌后故障恢复整个 Run、原 hand/draw 引用和面具。
- x11：1 能，10/14 伤害享执行时面具加成，再退出。非终局实测；末敌击杀遵循原生终局，后续退出被跳过，`Run.finishCombat` 入口仍留 mask=2。这与 JS 完整效果执行不同，保持适配 HOLD，不篡改共享终局规则。真实奖励发布后故障恢复全 Run，重试可胜利。

验证用固定奖励提供两卡，再通过真实 claim/leave/startCombat 保持 deckUid/升级，随后有明确移牌至手的夹具；这是公开 Run 获得和付费契约，不是自然概率或无需夹具的构筑体验。另有 20 个基础/升级自动执行正常、失标、runNativeABI、篡改效果和死亡拒绝用例。

命名/来源逐卡批准、平衡、人审、全75公共准入仍未通过。此提交等待 owner 整合与精确共享快照双验；没有修改 Combat/Run/config。Backlog CLI 在当前环境不存在，未冒称更新任务状态。

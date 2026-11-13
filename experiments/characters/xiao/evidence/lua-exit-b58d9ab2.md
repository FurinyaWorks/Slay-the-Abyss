# 魈退出卡共享快照作者验收

精确 shared commit: `b58d9ab2cd4ee428738f5394e180748b795cbc60`，由 owner 将隔离 `affb4f96` 原样整合。作者在独立 workspace archive 中，仅 `src/lua` / `build/lua` 加载路径实测。未修改 owner 工作树。

`NODE_OPTIONS=--max-old-space-size=256`，两个 Node suite 串行而非并发：

1. `experiments/characters/lifecycle/xiao-exit-paid.test.mjs`，1/1 PASS，16.10s。基础/升级 x09、x11 固定 Run 奖励→持久 UID→新战→真实付费，缺能/死目标拒绝、正常处置、20 个自动执行与拒绝检查；x09先退出再真实洗牌抽牌后注入故障恢复整 Run/RNG/原牌堆引用；x11末敌击杀奖励发布后注入故障恢复整 Run，并可重试。
2. `experiments/characters/lifecycle/xiao-starter-launcher.test.mjs`，1/1 PASS，6.98s。默认八牌 API 与封闭 starter 回归通过。

明确差异：x11 非终局先得到面具伤害再退出；末敌击杀时原生终局跳过剩余退出，`Run.finishCombat` 入口 mask 仍为 2。此行为已实际断言，不据 JS 完整 effects 模型假称末敌也退出，不修改共享终局策略，适配 HOLD 保留。

固定 reward 与移动获得实体至手是契约夹具，不证明自然掉率/构筑概率。不是所有75张公共准入或真人/平衡批准。不涉及共享退出收益 Power。无完整测试/CI/GUI/手机验收声明。

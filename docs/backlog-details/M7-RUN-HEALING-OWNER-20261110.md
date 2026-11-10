# 永久治疗职责拆分（M7 Draft）

基线：develop `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04`。本切片只包含永久治疗 owner、Run/Uncommon 的接线、正式回归测试和必要架构分类，保持 Draft。

## 源码职责与兼容边界

`abyss_run_health` 单独拥有治疗参数校验、动态 PotionHealth 修饰、HP 上限与写入顺序、实际恢复量返回。Run 在同一个普通表上补齐原公开 API，Uncommon 的 Meat on the Bone 直接依赖永久治疗 owner。

保留公开 `Run.heal` 的函数、nil、callable 替换，以及 rawget/pairs、无 metatable、动态 modifier、最大 HP 先写后治疗失败等原行为。治疗数值、Magic Flower/Bloom、死亡 owner 的直接治疗及半血判定不改。

冷加载行为有意变化：符合条件的 Meat 治疗不再初始化 Run 的战斗/房间编排；缺失 Run 编排模块不再阻断单独治疗。整体替换 `package.loaded.abyss_run` 或选择性重载模块缓存不属于保留的 ABI，不宣称完整加载轨迹等价。

## 已做的定向验证

- 原实现/候选各 34 组：Uncommon 13、Library 13、Lizard Tail Run 8。
- 12 项公开 ABI、状态及错误顺序合同前后通过；正式 Node 入口 2/2。
- 冷加载隔离原实现 RED、候选 GREEN。
- 5 个真实语义变异在测试断言点被捕获：无上限、允许小数、破坏共享表、严格半血、缓存 modifier。
- 独立源码复审无未解决项；另 8 组 metatable 读写轨迹与 callable 替换前后逐字一致。
- 固定 Luacheck 1.2.0 通过，14 项原历史警告不变；架构门禁通过。

完整静态依赖图在此独立基线上：338→339 模块、1929→1930 引用、1558→1559 依赖对；SCC [68,11,2]→[68,10,2]，仅 Uncommon 离开原 11 环。其余两环完整记录不变。这不是已合主线或与其他并行 PR 组合后的指标。

## 未完成的公共接线

公共 sourceEpoch、历史来源投影、helper closure、测试库存及完整文件成本接线尚未完成。本切片新增 1 个 JS 和 2 个 Lua 测试，不能据此改写历史库存/哈希或宣称现行公共校准已通过。共享架构配置须在合入前与其他 PR 的新增条目协调，不能覆盖其他切片。

保持原预算、worker、并发、timeout、旧断言和历史证据；未重复本地 Full 或手动触发 Hosted Full。源码独审不等于整 PR 接线/CI 准入，必须完成当前精确 HEAD 的正常检查与合并门禁后再考虑 Ready/合并。无原生导入、ready、设备、性能或平衡验收声明。Backlog CLI 当前不可用，未手改任务状态或认领。

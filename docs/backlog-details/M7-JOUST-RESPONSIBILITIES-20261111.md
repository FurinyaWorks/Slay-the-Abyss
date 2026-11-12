# Joust 下注事件阶段职责

基线 develop `6a614fc82697750ddb408750e54f59f801c24f1e`。接续 TASK-74.20，保留 Furinya、In Progress 与未完成 AC。鲜查开放 #609/#610/#611、原 #608 及十项归档候选，Joust 无重复认领；避开 Wheel、Time Eater、Exhaust、WarriorStatus、Skill Feedback 及 Act1 超时诊断。独立工作树 `feat/m7-joust-responsibilities`，不改他人分支。

## 实现

`abyss_joust_event.choose` 原来同时承担阶段校验、扣款、开奖和奖金结算。现保留原判断次序，提取 `placeBet`、`rollJoust`、`settleBet`；模块顶层依赖和公开接口不变。Run.gainGold、Random.randomBooleanChance 仍逐次读取，原参数、事件/Run别名、部分写入、返回与失败时机保留。没有引入通用阶段注册器或改变玩法。

固定 Luacheck 1.2.0：choose CC23→13，settleBet11，另两helper均1；完整模块8项含chunk/匿名/未来helper均受CC15硬门禁。模块总CC32→35是三函数基础路径的增加，不能称总复杂度下降。全库5918→5921项测量，345模块、1953引用位置及68/11/2成员SCC不变；本片不宣称解环。14条历史静态诊断不变。

## 行为与来源证明

冻结 develop 完整原源，SHA256 `c579ccb9efe508634e712388ccdf1ac61b54295922f59b89f47f032be2ea1a04`。旧新独立VM使用实际RNG，128条完整下注路径、阶段/选择/UID矩阵、动态替换、部分失败共764检查点，对完整图、别名、调用与返回轨迹逐字比较。新增子进程30秒上限；超时、信号、非零退出不计语义负控成功。5种真实生产变异均被图差异或具名断言检出。原六组Joust集成/事务回滚保留全部原断言与两入口原30秒上限。

Joust作为第80个来源owner接入最外层epoch，保留79-owner前代及全部历史targets；隔离复制闭包已核。历史CI收据的gate、校准自读、相关测试与helper用完整before/after身份映射；生产Joust经fresh完整owner验证投影，旧档案和历史hash不改。当前源和当前完整库存仍有独立raw读取合同。旧热点、未来helper/chunk、缺行/重复/漂移/CRCRLF及逐owner变异均有拒绝证据。

## 本轮验证与交付边界

- Joust完整8/8（17.379秒）；旧新764检查点和5变异在该文件内。
- CI校准完整53/53；room来源9/9；Defect来源12/12；pure-cache6/6。
- responsibility与ci-shards完整19/19；lua-static/engineering共享输入10/10；四份CI消费者30/30。
- 全库静态、完整工程质量采样、syntax、guidance、backlog、network与diff检查通过。
- 独立深审将3个helper内联后的choose AST与旧版完整AST比较一致，审查记录另绑定最终提交。

所有测试批次分开记录，重复运行不累计为去重用例总数。原校准10失败、接线中间失败、原owner数量失败、测试夹具误用Random.new失败均保留。未启动完整Full、未改CI成本/矩阵/worker/预算/超时，无新增*.test.mjs；现有完整本地Joust耗时低于保留hosted测量，不伪造新hosted成本。

本片是可审查候选，未合并成果。`test:related --plan`要求Full；遵用户不重复启动全量要求，最终HEAD正式Quality、原生队列、实际合后push验证留待统一集成。#610/Act1原阻断由原owner继续；本地绿灯不替代准入。无官方导入、ready、设备或发布验收。

证据目录：`docs/evidence/m7-joust-20261111/`。压缩原流和完整质量快照均保留，SHA256SUMS用于读回核对。

# 刻晴轮转与净化技能：KQ046 / KQ051 / KQ066

基线f7a4e633826651acf0865443f4cc1ebbf213c0ee；来源character-keqing-batch23，89d898c mechanics.mjs SHA256 `489cf1d13748337fac61b28d31edf514a19fe782e03f6681ba7d6b7358453bac`。

- KQ046：2费消耗，抽3/4，之后本回合不能再抽牌。
- KQ051：1费非消耗，若弃牌非空，将最新弃置的真实UID牌放抽牌堆底，再抽1、格挡2/5。本牌在limbo，不参与回收。
- KQ066：2费消耗，格挡10/13，随后仅降低自身1层虚弱，最低0。

保源pending rarity映射special/HOLD，未纳正式卡池。文本直接由权威describe(id,upgraded)输出，未自拟机制或名称。新增26等权有限研究奖励域，不改变旧23；不是正式稀有度/平衡许可。

## 原生语义

严格known-ID及完整catalog源核验；utility阶段绑定UID、turn、playId、step和完整payload。046的Draw先进入宿主队列，其后才执行native noDrawThisTurn，保留Artifact阻挡与owner-end清理。051宿主draw末端为顶，因此置底插入索引1，不照搬离线模型数组朝向；不复制牌、不触发弃牌事件、不消费当前limbo。066用原生reduceStatus/ReducePowerAction或RemoveSpecificPowerAction，保留状态事件及原生排队。

`NODE_OPTIONS=--max-old-space-size=256 node --test experiments/characters/lifecycle/keqing-utility.test.mjs`

定向覆盖54面/资源组合、满手/空堆/抽牌锁/洗牌、36源漂移、24阶段回滚、6永久UID整Run重试、原生Corruption/FNP/Artifact与虚弱0/1/3。奖励测试要求三新牌实际生成、领取并跨战支付；使用999伤胜利、手动移牌与能量10/敌HP100控制fixture，不宣称自然完整跑局。正式CI/设备/导入仍未验收。

首轮locked fixture直接写noDraw而缺原生获得顺序，在owner-end被真实门禁拒绝；修为Actors.applyNoDraw建立状态与记录，未修改宿主或放宽断言。Backlog CLI缺失，作者不伪造任务认领、不push；协调线程负责独审及远端验证。

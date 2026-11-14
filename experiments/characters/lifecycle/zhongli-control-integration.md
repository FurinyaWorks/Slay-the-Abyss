# 钟离控制技能批次：zl09 / zl34 / zl37 / zl45

- 基线：fd945b863c62dc1f8b97c0a75d5737affd5ab11a。
- 权威：character-zhongli-nov13 的 model.mjs，zhongli-mechanics-0.41.0，SHA256 `9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34`。
- 四张均 common、非消耗：zl09 1费攻击伤5/7→虚弱1/2；zl34 1费保留技能虚弱1/2；zl37 2费技能格挡10/14→抽1/2；zl45 2费技能虚弱1/2→易伤1/2→格挡3/5。
- 独立 control_definitions；旧 native_definitions/21域定义不扩容。新 known-ID paid 白名单验证完整源 catalog，包括升级面、cost、HOLD 元数据。原生 UseCard 负责费用、limbo、抽取、目标存活、反应队列、Corruption/FNP 与收尾；不手动提前结算。
- 新 `zhongli-reviewed-common-twentyfive-v1` 闭合研究域继承21+4，单敌边界保持。明确等权common无放回有限抽样，不冒充正式稀有度分布。Prismatic拒绝，源漂移拒绝，Starter只调用一次。

## 定向验证

`NODE_OPTIONS=--max-old-space-size=256 node --test experiments/characters/lifecycle/zhongli-control.test.mjs`

含40资源/面组合、44变异paid+auto拒绝、原生保留/NoDraw/Corruption、8固定奖励整Run失败回滚及同UID重试；provider验证源/旧21隔离/抽样RNG/容量/漂移；实际生成奖励领取跨战支付要求四新ID全部命中。补边界：Artifact逐项消费、末敌/反伤终局、Dex/Frail、满手腾位、空堆与洗牌。

运行测试结果见作者交接；未做全量、CI、官方导入或设备验收。生成奖励测试使用999伤胜利、手动移牌、能量/玉璋/敌HP控制fixture，不宣称自然完整跑局或平衡验收。所有源仍HOLD、productionEnabled=false，正式四职业各75池不变。

Backlog CLI 在本环境缺失（`backlog: command not found`），未伪造任务认领或状态；由协调线程处理项目占用和远端交付。作者不推远端，独立评审后由协调线程发布并核验。

作者本轮首组三文件串行结果：137.29秒通过；40 paid组合、44变异拒绝、8整Run回滚；真实抽样38局，观察25个ID，zl09/34/37/45均真实领取并跨战支付。边界补测与旧21回归单独串行执行，未重复已通过的38局采样。

原生边界补测通过（2.51秒）：Artifact1/2顺序、zl09末敌及反伤死亡不追加虚弱、zl37 Dex/Frail、出牌前10手腾位后抽取、空堆和弃牌洗回。测试中额外满手占位牌是独立fixture，不冒充奖励实际生成；奖励领取证据由独立Run采样测试提供。

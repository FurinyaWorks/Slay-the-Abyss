# 甘雨供给复合链：16 / 69 / 71

基线 a0c46db918d4f0d8e48471e876ba3f6e63fca3a0。来源 ganyu-production/experiments/characters/ganyu/cards.json，ganyu-sample-0.26.0，SHA256 `2412ea17b3ff3b190cf30bea9ba7f5f84d01f6aec3eb684f5fb4685f043e5f9d`，与既有 starter source 一致。

- 16：common，1费攻击，伤4/6后蓄力1。
- 69：uncommon，1费消耗攻击，群伤4/6后蓄力1。
- 71：uncommon，2费消耗技能，雨场3/4、2轮后蓄力1。

源顺序保持。原生伤害/反应/终局队列负责是否执行后续资源动作，不同步提前供蓄；71分别提交storm与charge，storm按既有资源契约分别取强度/持续时间最大值而非累加。新三张bound stage绑定UID/turn/playId/step/完整payload/cursor，重复或变异拒绝，回滚由宿主事务负责；旧卡paid契约不变。

新增55定义/53非basic隔离域（2 basic/11 common/40 uncommon/2 rare）。旧52域保持；新增模块不进入正式色池，来源仍HOLD、productionEnabled=false。继承有限同稀有度无放回抽样，稀有池耗尽跳过、不跨类回填。自定义launcher只添加三定义并调用上一闭合launcher一次。

定向入口：`NODE_OPTIONS=--max-old-space-size=256 node --test experiments/characters/lifecycle/ganyu-supply.test.mjs`。含54基础/升级×蓄力0..2×1..3敌组合；30源漂移；24战斗阶段失败回滚；6永久UID整Run回滚；原生弱/强/易伤、末敌/反伤终局、Corruption/FNP、旧雨场保强；真实奖励settle/claim/跨战paid要求三新ID全部命中。

采样测试以999伤控制胜利、手动将永久UID牌置手、能量10与敌HP100，非自然完整跑局或平衡/设备验收。官方导入、CI、设备门禁未验证；不开放正式域。Backlog CLI缺失，未伪造认领；作者不push，独审与远端由协调线程负责。

作者新suite通过（103.66秒）：54组合、30源漂移、24stage回滚、6永久UID Run回滚。43次实际采样领取跨战paid，观察37不同奖励ID；断言三新ID都自然出现在offer并领取支付。并非全53奖励池覆盖。旧52域回归另行串行，结果交接给协调线程。

旧52奖励域回归通过（46.67秒，23实际采样、27 distinct IDs）。展示文本按源engine.mjs `cardText(id, upgraded)`生成，去掉标题/费用前缀后保留完整效果正文；该源renderer SHA256 `931e7cb54ae5652fe1a3bdfaf06b0fa8c7deefc45a86f565a68aa005d816e4fe`。cards.json没有直接text字段，因此不自拟机制文案。文本补齐后仅重验新paid/Run源装载与生命周期，不重复43局抽样。

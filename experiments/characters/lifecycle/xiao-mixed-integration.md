# 魈x30/x35/x40真实paid与20张研究奖励

权威源 `xiao-g2-lab-0.33`，cards.json SHA256 `1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa`，model.mjs SHA256 `57aab330cd2c2dff06cdcd8087ccfffa5668495cef39b2d3c3c2ed513d932783`（源HEAD880942f5）。不改变名称/人审/正式准入HOLD。

- x30，1费common攻击：伤害5/8；随后当前无面具才原生抽1。
- x35，1费uncommon攻击：同一目标4/6伤害两段，每段按执行时面具状态加4。保留Plan的damageHits源投影，仅paid.prepare展开两段独立native damage stage，保持原生反应队列顺序，不转移死目标。
- x40，1费uncommon技能：执行时每存活敌人4/6格挡，最多3名。一次Block动作，非逐敌反复触发；presence排除escaped/halfDead/isDying。

新三张严格source及升级面校验；仅新三张绑定完整expectedStages（UID/turn/playId/step/payload），拒绝重放及变异，不改变旧域契约。x30终局不得自行恢复已清除的后续抽牌，x35逐击目标失活skip按既有原生约定。

新20张隔离研究域保源rarity（5common/13uncommon/2rare），继承旧17；稀有度短池不补抽、不借其他rarity，不改正式四色75池或closed Starter初始化。定向验证含96面具/基升/敌人数/修饰矩阵、live gate/目标死亡/反伤终局、非法源paid/auto、stage变异/重放、Corruption/NoDraw、8wholeRun后段或payload注错回滚及真实生成/领取/永久UID跨战paid。胜利伤害/手牌摆放/资源为可重复夹具，非自然整局、平衡、官方导入或设备验收；完整CI/develop同步仍未完成。

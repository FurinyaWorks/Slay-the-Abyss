# 钟离原生牌07/12/13/14/15实验接线

源：`zhongli-mechanics-0.41.0`，model SHA256 `9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34`。原候选均 common、HOLD/sourceVerified=false；本批不作设计批准或改数值。

| ID | 费 | 基础→升级，严格保留源顺序 |
|---|---:|---|
|07|1|伤害5→7，格挡5→7|
|12|1|格挡3→4，抽牌1→2|
|13|1|易伤2→3|
|14|2|伤害13→18，自保留|
|15|2|格挡8→11，本轮反击3→4|

五张全部复用原生效果；不新增 opcode、玉璋吸伤或多敌支持。原生反击不在玩家死亡后触发；终局队列保持引擎行为，不推断与孤立模型等价。严格 known-ID 原生 paid gate 校验类型/目标/flags/完整递归 effects，原有01/02及资源paid不改。

新 opt-in `abyss_zhongli_twentyone_run` 仅扩为21个source common研究奖励，等权无放回，保持 source rarity 不伪称正式概率。旧16域及正式四色75池不变。closed Starter初始化一次；来源漂移/重复/空奖励/Prismatic拒绝，短池不补抽。

验证入口：`zhongli-native-usecard.test.mjs` 与 `zhongli-twentyone-generated.test.mjs`，旧16回归 `zhongli-sixteen-generated.test.mjs`。前者50资源/基升矩阵、40非法paid/auto、保留、NoDraw/Corruption及10固定reward跨战UID/wholeRun故障回滚；后者固定1–24种子真实生成/领取/次战paid和RNG/领取故障图引用恢复。后者仍用999胜利、手动移手、能量/玉璋fixture，不是自然通关、完整平衡、全升级或实机证明。新牌随机出现范围必须按输出逐项报告。

作者开发中已修正：provider复制时误将允许的zl16改为zl21，独审只读指出后恢复；NoDraw夹具改用真实player.noDraw；Corruption夹具补真实prepare/apply及FNP顺序登记。未通过的首次尝试不计通过。

完整CI、与develop同步、正式注册、正式名称及设备验收保持未完成。

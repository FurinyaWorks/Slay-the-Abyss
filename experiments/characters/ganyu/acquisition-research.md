# 候选获取链研究 v0.1（非正式自然奖励）

## 已实现

acquisition.mjs纯事务研究模型：获胜→独立rewardSeed生成三张无重复非basic候选→打开选牌→领取或Skip关闭→持久deck→下一场createBattle自然抽洗→实际打出。HP跨战保留；一场内消耗的卡仍属于持久卡组，下一场重新入库。输掉或最后一战完成不再发奖励。选择后只改持久deck，不向当前hand塞牌；下一战才出现。

Skip只关闭选择，不标记claimed，可重开同一offer；每次open递增selectionSerial，旧token不能提交。已领取不能重复领取。Proceed先成功创建目的战斗，才令旧offer失效；失败保持原状态、奖励、deck/RNG完整。选牌后仍留奖励阶段直到Proceed，未选择直接Proceed表示在成功进入下一战时放弃旧奖励。

## 仓库合同核对

读取develop基线903bf2a下docs/M3-REWARDS-20261025.md：Skip关闭保留再看资格、成功进入下一房才使旧奖励失效、失败进入不吞奖励。亦读src/lua/abyss_relic_card_rewards.lua，open使用selectionSerial、领取事务与resolved防重复；其注释区分API显式放弃choice0与模态Skip close。本模型只实现模态Skip语义，不混成永久放弃。生产实现还含卡牌奖励组、遗物、升级、稀有度偏移等，**本模型未移植且不声称等价**。

## RNG、牌区和证据

奖励RNG独立于战斗抽洗；每个offer只生成一次。poolDigest绑定完整cards.json内容与非basic池；不是只绑数量。状态校验比对所有战斗牌区与持久deck多重集，claimed新牌只能是offer中对应choice，下一战输入从持久deck而非已消耗战斗区构建。对象均clone后校验提交；错token/非法choice/失败进入/无效出牌不改调用者状态。此处状态不是抗恶意伪造的网络或存档安全边界。

acquisition.test.mjs覆盖：跳过重开/旧token失效、幂等领取、失败进入保全、成功进入失效、跨战HP/消耗重置、牌区守恒、两个RNG隔离以及全部候选offer→选取→下一战正常抽牌→支付打出路径。acquisition-evidence.json按确定性seed扫描记录全部非basic候选的同链证据及源SHA256。

这些证据使用**单张基础攻击起始卡组、1HP首敌、999HP零意图次敌**，故仅证明生命周期与可达路径，不是正常卡组、真实遭遇分布、生存或自然构筑成功率。该假设明确保留，不用夸大的“自然奖励完成”描述它。证据没有手牌注入，但起始卡组/敌人是人工夹具。

## 未实现/仍HOLD

正式游戏角色注册、生产奖励过滤、真实稀有度/升级/遗物组/商店、路线地图、设备UI、正式自然奖励链尚未接入；名称/来源/平衡/真人门禁仍HOLD。该模型不修改正式代码、不解锁候选角色，不增加卡数（仍28/75）。后续先独审，再以正常10牌与多种真实遭遇研究选择/跳过，不强制领取新牌或隐藏死亡。

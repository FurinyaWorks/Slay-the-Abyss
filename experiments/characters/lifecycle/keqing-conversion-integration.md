# 刻晴021/022真实支付与18张研究奖励

权威候选 `89d898c407e35db85b0bd053d92e6dfa9a4b549a` 的 mechanics.mjs，SHA256 `489cf1d13748337fac61b28d31edf514a19fe782e03f6681ba7d6b7358453bac`。名称、rarity、正式准入仍 HOLD；沿用既有 special 研究投影，不声称官方概率。

- KQ021：0费技能/消耗；清空0–2附魔，每次3/4格挡，一次原生格挡结算；零附魔不创建格挡动作，不能吃敏捷。
- KQ022：2费技能/消耗；先覆盖附魔为1（包括2→1），再得6/9格挡。
- 两张均不消费雷楔、不设楔，不触发设楔初始遗物。资源阶段落在格挡和耗尽反应之前；强绑定paid UID/turn/playId，拒绝变异源与自动出牌。
- 新 `abyss_keqing_conversion_reward_run` 显式18张隔离研究域；保留原8/10/13/16域、原正式四色75池和closed Starter。等权无放回，不补齐短池、不做正式rarity roll。

验证包含72基升/附魔/雷楔/Frail+Dexterity矩阵、非法paid/auto、Corruption/FNP、故障回滚、24种子真实奖励生成/领取/永久UID跨战paid。胜利使用999伤害，手牌和能量有夹具；不是自然通关、平衡、官方导入或设备验收。完整CI/develop同步/正式入口保持未完成。

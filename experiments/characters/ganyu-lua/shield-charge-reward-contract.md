# 09/36/56 独立实验获取域作者合同（待执行）

源 SHA256：37c45ce3245451ca5ae1637b18c68e0bc9ec7366db0bbfdba524f6592da52e30。三张均 uncommon，未改稀有度。

预期47定义：basic2、common10、uncommon33、rare2。排除basic后45奖励：common10、uncommon33、rare2。旧44定义/42奖励域不改变；本次新域尚未冻结，禁止据此声称通过。

入口拟 `abyss_ganyu_shield_charge_reward_run.new(D,seed)`。作者脚本 `public-shield-charge-generated-rewards.test.lua` 固定 seeds81..92，真实结算生成offer，若出现09/36/56则选择首个目标，否则领取首选；不替换offer或升级bit。逐seed打印全部offer与领取ID/升级，真实持久deckUID进入下一战并Run.play。胜利使用999伤、下一战手牌移入和10能量属于披露的夹具，不证明自然抽到、整局或平衡。随机未覆盖者明确记未覆盖，不补种子冒称预定样本全覆盖。

等待owner冻结后在独占256MB窗口实跑；不重复已审36公共与6 fixedRun。共享provider的boss两rare短offer、零offer/Prismatic/事务与旧域边界由owner与独审核验，作者按最终接口补核必要事实。

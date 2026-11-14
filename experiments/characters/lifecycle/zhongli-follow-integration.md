# 钟离 native→玉璋尾段批次

基线10c56c56639e8ba2d08a502a11331accd4c24ac8。源character-zhongli-nov13 model.mjs version zhongli-mechanics-0.41.0 / SHA256 9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34。6面textFor逐字生成；未自拟名字或批准正式投产。

- zl47：1费自保留攻击，伤害2/4→玉璋3/4。
- zl56：2费自保留技能，格挡9/12→玉璋3/4。
- zl70：2费消耗攻击，伤害8/11→玉璋7/9。

原生Damage/Block先执行，保留宿主同步/TOP/BOTTOM反应排队，尾段才实时gain玉璋cap20。完整源定义/两面/cost/text/flags严格比较；尾段uid/turn/playId/payload绑定及completed重放保护。终局按宿主清队列不补玉璋；在尾段已失活玩家/目标仅跳过新批gain，不回滚已结算原生伤害。源离线循环与宿主终局不同，此处不绕原生终局来追补资源。

保留现钟离单敌实验边界，非完整多敌适配。新28common有限等权不放回研究域，不冒充正式rarity分布；旧25及正式四角色池不扩容。仍HOLD。

预定串行验证：新paid/wholeRun与源reward；生成reward固定seeds1..80最多80，不追加种子以凑命中。若覆盖不足如实保留。受控胜利/手牌/能量夹具不代表自然通关。旧25 source域回归，不重复全量/GUI/官方导入/设备。

Backlog CLI unavailable（command not found），不宣称领取状态已修改。父任务独审后推远端，作者不push。

首跑3.63s在终局资源断言失败：测试启用起始遗物，初始玉璋实际3而断言误写0。修正仅为fresh夹具明确清零，专测本牌增量；起始遗物初始化逻辑未改。采样复制脚本的旧四ID早停条件同步改为本批三ID，上限1..80不变。记录失败，未改宿主门禁/删断言。
第二次paid PASS：30两面/玉璋/modifier组合、实时尾段、终局/反伤/失活、保留、33源漂移、18stage变异/重复/后突变回滚、6 wholeRun永久UID回滚、Corruption/FNP。随后provider夹具沿用old21计数，实际old25正确返回25却断言21而失败（整suite33.57s）；仅改为旧25准确计数。已通过paid不重复，继续provider/固定样本Run/旧25回归。

分段验证最终均PASS：new28 provider；固定seed1..80中17轮提前覆盖zl47/zl56/zl70全部真实sample→claim→永久UID→paid，24种observed ID；settlement/claim/skip/RNG/singleEnemy；old25 provider（含旧21不扩容）全部PASS。未再次跑已通过paid。所有角色仍研究HOLD，不声称整套工程CI/实机已通过。

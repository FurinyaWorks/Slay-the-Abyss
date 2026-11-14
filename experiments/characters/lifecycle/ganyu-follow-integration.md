# 甘雨46/49/67复合链
基线05052f399552880a17829f5c54d934f16f96d37a；源ganyu-sample-0.26.0 / cards SHA256 2412ea17b3ff3b190cf30bea9ba7f5f84d01f6aec3eb684f5fb4685f043e5f9d。3×2面通过源engine.cardText生成，不自拟文本。

46：2费攻击，原生block7/10后chargedShot direct5/7 bloom5/6；live charge在实际阶段读取，满2消费一次。modifier capture遵循既有Queued ABI，不另改宿主排队。
49：2费技能，storm3/4×2后原生draw1；NoDraw/容量/洗牌/暂停均由原生draw负责，不预取卡牌或绕过limbo。
67：1费消耗攻击，原生damage3/5后短storm2/3×1；原生终局清队列后不补装雨场。

复用已评审supply多阶段ABI，内部lookup新增3个明确ID；公开旧supplyDefinitions仍仅3张，不改变旧55定义/53非basic域。新58定义/56非basic域，basic2/common11/uncommon43/rare2，有限源rarity不放回；正式池/HOLD不变。

测试先静态核对IDs46/49/67、cost2/2/1、exhaust仅67、58/56/55旧域数量；采样固定1..80最多80，三新ID全部命中且至少12次才早停。不扩大种子凑覆盖，不替换真实生成身份；胜利999伤、手牌放置、能量夹具不是自然通关。

Backlog CLI unavailable（command not found）；不宣称任务状态更新。无GUI、全量、官方导入或设备实测。作者冻结后父任务独审/推送。

首跑4.28s发现真实新机制登记缺口：duration1短雨场被旧ganyuStorm validator拒绝（invalid_ganyu_storm）。补充只匹配新冻结定义的supportsFollowStorm并接入Effects检查；严格卡ID/source判定仍在，没有开放任意duration/amount。随后新paid重验。
源engine SHA256 931e7cb54ae5652fe1a3bdfaf06b0fa8c7deefc45a86f565a68aa005d816e4fe。新paid已PASS54 face/charge/enemy modifiers、live charge、draw边界、terminal、36源漂移、30阶段回滚、6全Run回滚与Corruption/FNP。

最终新套 exit0 /110.03s：paid所有上述断言通过；固定1..80内32轮实际sample→claim→deckUid→下一战Run.play，三新ID全部paid，34种offer ID（非全池覆盖）。新58/56 source、boss稀缺、漂移与事务断言全部通过。
旧55/53单域回归 exit0：每rarity有限抽样计数11/40/2、basic2、0奖励拒绝、RNG原图不变、新ID不进入旧池。未重复全量测试。

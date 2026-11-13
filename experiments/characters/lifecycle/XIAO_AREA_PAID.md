# 魈 x12/x18 显式候选群攻付费切片

基线9481c7f8。仅三个角色专属运行时文件：play_bridge追加additionalDefinitions，paid允许结构化damageAll，dispatch将damageAll映射到原生队列。最小AoE逻辑来自已独审ff2903b0，不复制后继未接WIP。默认八牌/旧additional顺序不变，不改Combat/Run/config/正式池。

固定候选源cards.json SHA256 `1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa`：x12 1费群伤6/9；x18 2费群伤18/24→退出且耗尽。测试独立核全部有序基升结构。当前mask加4后交nativeAoE逐目标护甲，不要求无关单体目标。

验收设计：复制数据将cultist_solo固定为双cultist，不代表官方遭遇/自然生成。真实Run固定奖励领取→deckUid/升级→下一战，定向移牌入手；双敌HP/盾夹具检查逐敌伤害。不足费用整态拒绝、基升耗尽/弃置、原生首目标伤害故障和最后敌奖励发布故障须恢复完整Run。末敌终局跳过x18退出，延续09/11的原生政策HOLD，不能冒称JS模型一致。

Strength/native修饰与终局反应遵循宿主，不为通过测试重写；此切片不是全75公共接线、自然奖励池、人审或平衡通过。旧两suite仅扩additional计数4→6，其原有效果/成本断言保留。测试必须获分配唯一窗口后256MB串行，未运行前不声明通过。

独立切片实际验证：获得唯一窗口后256MB串行，新area 1/1 PASS（29.42s），旧life 1/1 PASS（18.54s），旧starter 1/1 PASS（7.24s）。本轮均首次通过，无运行失败或为测试改值。没有额外重跑exit suite/全量；其diff仅定义总数6。所有进程结束后释放窗口。

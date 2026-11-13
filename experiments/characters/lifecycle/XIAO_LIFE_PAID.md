# 魈 x10/x17 显式候选生命成本付费切片

基线 b58d9ab2。只扩专属 Bridge 的 additionalDefinitions（原 x09/x11 后追加 x10/x17），默认 definitions 的八牌及封闭 starter 不变。已有 paid canonical 自动使用显式候选，未改 Combat、Run、config 或自然奖励池。

冻结源 cards.json SHA256 `1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa`：x10 1 能，loseHp2→mask1→block8/11，不耗尽；x17 0 能，loseHp3→energy2/3，耗尽。使用已审 core_data/Plan，不重排效果，不引入新 op。测试独立断言全部基升效果和属性。

真实 Run 固定奖励→持久 UID/升级→新战与 paid/UseCard；为定向出牌将获得实例移至手，不据此称自然构筑。x10 原生 mask max 刷新不缩短已有窗口；x17 真实耗尽。血费收益执行后故障由宿主完整 Run Snapshot 还原生命、能量、牌区/引用，随后重试。自动执行测试24组（2卡×基升×正常/失标/ABI/改效果/死亡/不足生命）。

HP 先决仍按未减免成本要求 hp>2 或 hp>3，即使有 Intangible 也不能用 hp=2/3 获准；已获准后原生 loseHp 被 Intangible 降为1。此差异保留 HOLD，不自行宣布强度正确或更改原生伤害规则。x10 格挡仍受原生修饰器；没有把整批上线等同来源/命名/人审/平衡批准。

先前 x09/x11 的末敌 skipExit 差异及断言保留；旧测试把 additionalDefinitions 明确计数2改4，并将两张退出卡的 cost=1/exhaust=false 断言限定原有两张，避免错误地应用到新增0费耗尽x17；原源顺序和回滚断言保留。首次回归据此失败并修正夹具范围，不更改卡值。

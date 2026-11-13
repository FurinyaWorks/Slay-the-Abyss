# 魈 x23 / x38 实际付费资源转换

冻结来源 cards.json SHA256 `1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa`。x23：0费，花光剩余能量，每点获得5/7格挡；x38：0费耗尽，移除全部格挡，每满5点抽牌，上限2/3。均保持 uncommon 和 HOLD，不自行改变原生 Dexterity 对基础0格挡的作用。

既有 core_data/Plan 公式不变，Dispatch 仅承接源 spendEnergyBlock/spendBlockDraw 两分支。bridge 新增显式 spendDefinitions，旧 additionalDefinitions 仍11项。新ID付费前检查源完整字段，所有资源消费仍在 C.play/Run.play 的事务及原生队列内。

新增显式十七张非basic奖励域（common4 / uncommon11 / rare2），旧十五域和正式池不变，不扩正式菜单。奖励测试用实际击杀结算，不替换随机offer或升级位；选择自然出现新牌后领取、持久UID与下一战实付。击杀、入手、能量/格挡为受控夹具，不冒充实机。

作者资源转换128例（base/up、8资源量、normal/NoDraw/手满/Dexterity+Frail）PASS13.03s，源漂移拒绝与故障回滚通过。完整CI、75卡完成度、正式注册、平衡、设备验收尚未验证。

作者新17域与旧15域定向 2/2 PASS（130.26s），真实生成奖励覆盖x23/x38的领取与跨战实付；未注入offer。

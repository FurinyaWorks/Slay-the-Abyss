# 魈 x13/x15 显式防守与破甲付费切片

从已审5fbc43d0独立树，限3个Xiao专属runtime：Bridge追加additional，paid支持maskBlock/breakBlock，dispatch最小移入fde9c02a/ff2903b0已审逻辑。不拷贝角色大WIP，不改Combat/Run/config，默认八张与旧additional顺序保留。

源cards.json SHA256 `1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa`：x13 1费有mask盾8/12，无mask取半；x15 1费先剥当前目标盾再伤6/9，均不耗尽。两卡基础升级完整有序effect/费用/耗尽在测试独立断言。盾经过native Dexterity/Frail；攻击经过native伤害修饰，未擅改数值。

准备真实Run固定奖励→UID/升级→新战公开play、缺能/死目标整态拒绝、正常弃置；定向移牌至手及敌盾999为夹具，不代表自然抽牌。x13无mask/有mask+Dex2/Frail1实测期望，x15先破盾后伤的源顺序，原生收益后fault整Run/hand引用恢复，末敌奖励发布后fault恢复，20auto正常与坏入口/死亡。新OP有paid UID/stage保护，先前反应使目标死亡时沿宿主skip，不绕过终局。

测试等待唯一256MB串行窗口，不因脚本写好宣称通过。角色来源/人审/平衡HOLD，未认证全75、UI或自然池。

唯一窗口实际256MB串行：新defense 1/1 PASS（27.55秒），旧area 1/1 PASS（27.16秒），旧starter 1/1 PASS（6.56秒）。全部首次通过，没有失败后调值或删断言。未另跑exit/life套件，其修改只有additional总数6→8。所有测试退出后释放窗口，待整合独审及共享精确作者复验。

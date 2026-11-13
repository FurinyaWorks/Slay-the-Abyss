# 魈正式Lua owner-end候选接口（未注册到生产）

基于develop903bf2a接口；仅独立模块，不修改共享Combat/队列/正式cards。不是75卡完整Lua移植。

- `ownerEndIds={xiao_mask=true}`；`ownerEndPlan(state,id,n)`返回bottom纯数据`{op='xiaoOwnerEndMask',turn=state.turn}`。不在请求入口支付；规划时不改状态。
- `apply(combat,state,effect,queue)`签名沿用owner-end；执行时读当前状态，不捕获旧n。拒绝错回合及同回合重复。通过`combat.applyEffects(...loseHp...)`走原引擎生命支付、遗物/权能通知，不能raw扣血替代。活着才经原block效果加盾、减面具、自然到期向`state.xiao.reservedEnergy`储能；不触退出抽牌/退出盾。
- `reduceAfterPayment(state)`为纯结果计算，无状态写。资源使用正式schedule的0..2147483647，不假称JS安全整数范围。
- 自定义状态是`player.statuses.xiao_mask`(0..3)、`xiao_mask_guard`、`xiao_expiry_energy`；加载层需合法definition并通过标准Power取得后`Schedule.recordApplied`记录，叠加保留历史。归零调用`Schedule.remove`再清实际membership，重新入场由入场adapter重新登记。死亡后不派发额外收益。
- `state.xiao.ownerEndTurn`只防本战同回合重复，战斗创建必须清空xiao字段。储能真正下一回合领取、牌面入场/主动退出/遗物/75卡操作尚未接线，此模块不宣称这些已做。

## 真实引擎语义差异需保留

正式loseHp受Intangible等宿主规则影响，定向测试验证2点在Intangible下变1；实验JS是固定2HP，两者不能虚报完全一致。正式block也走宿主修正。该差异待角色/规则批准，不在本模块擅自绕过通用系统来追JS数值。共用生命周期owner需决定正式合同，并保证整个命令snapshot/暂停/异常回滚；本模块不是新的事务管理器。

## 已测范围

先`node scripts/build-lua-data.mjs`生成同checkout数据（未纳入提交）。用现有fengari CLI跑`lua/owner_end_test.lua`，8条PASS见evidence/lua-owner-end.txt：真实C.new/Actor状态、普通owner-end prepare+ActionQueue、支付存活与致死、自然移除acquisition记录、重复/过期拒绝、Intangible宿主差异、前置暂停恢复不预扣且只付一次、纯reducer资源溢出拒绝、false非法资源支付前拒绝、合法致死组合不被未领取收益溢出阻止。

注意fengari CLI对Lua运行错误可返回0，所以要核8条PASS且无stacktrace，不以exit0当通过。未进行共享Combat.endTurn注册后的整体命令回滚测试；由集成owner接线后独测，不以此局部队列测试替代。浏览器/人审/平衡仍HOLD。

支付前只验证输入域（仅nil默认，false不默认）。收益加法溢出在真实付款后检查，若抛错必须由宿主整个命令snapshot恢复hp/events/marker等；局部apply不是原子事务。不能为了局部不变而在HP2致死前用根本不会取得的盾/储能溢出来拒绝合法命令。

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

## 首8卡纯计划与遗物/回合开始提案（未共享dispatch）

`generate-core.mjs`只从当前cards.json生成首8基升、费用、消耗和遗物到`abyss_xiao_core_data.lua`，不维护第二套数值。`abyss_xiao_card_plan.plan(resource,{id,upgraded})`严格布尔升级，生命先决hp>lifeCost，返回cost但不扣能/移手牌；原生block/draw/loseHp不重实现，特殊效果只提议纯数据`{op='xiaoCard',kind='damage'|'plunge'|'maskCommit',...}`。实际伤害面具加成、合法目标和保护必须共享dispatch执行时处理，不能把计划成功当C.play成功。

`expectedResourceAfterIfAlive`仅是正常存活后的预期，不可在执行前写回。`maskCommit`纯计算需使用真实付款后的hp与资源：实际0→有第一次入场才消耗遗物并提出draw1，刷新/已经用过/死亡均不抽。没有把未来遗物资格在plan时扣掉。

`startTurnPlan`在已有合法state.xiao.reservedEnergy>0时只提出带turn的reservedEnergy action，不立即加能或清空。共享owner计划放在基础能量充值后、正常抽牌动作前，正式实现须按当时状态领取一次、去重且snapshot回滚。

候选definition未来须experimental=true经QueuedPlay，费用由begin而非本模块重复支付；目前这8卡不是实际已注册牌，更非75卡完整Lua接入。其余67显式unsupported。首8基升16计划、生命门槛、非法升级、遗物时序和turn-start纯计划5条Lua探针通过，未声称公共C.playCard验收。

## 第二批 x09–x16 纯计划（取代上文仅首8支持范围）

生成器当前覆盖16卡32基升计划，x17–x75仍显式拒绝。新特殊子类为damageAll、maskBlock、maskGuard、breakBlock、recoverExit；不把JS操作直接当已支持的宿主op，未知操作一律拒绝。原16卡数值均源自cards.json，没有改卡。

执行合同：x09先真实退出再抽；x10先真实付血、存活才入场再加盾，不缩短旧长面具；x11伤害用执行时面具后退出。x12群攻不依赖无关单体目标。x13在执行时读面具，maskBlock纯函数给全值或floor(value/2)，实际加盾仍宿主修正。x14 addMaskGuard只给安全累加值，正式能力须标准Power取得及Schedule.recordApplied，不即时给盾。x15必须先验合法活目标后剥同一目标护甲再伤害，不能转移死人。x16按当前公开弃牌顺序取首张含mask=0效果的实体，保留UID/升级，不能取消耗区/自身；空结果仍付费，手限由宿主、回收先于防御，自己最终消耗由完成边界处理。

这些目标、实体、牌区、能力登记与伤害均是待共享dispatch落实的执行合同，不是本纯计划已实现的功能。maskBlock/addMaskGuard仅纯数值参考，不写state；post-payment死亡和暂停/整命令回滚仍由宿主控制。7条Lua探针见lua-core-plan.txt，涵盖计划顺序及数值上界；不证明实际C.play可用、自然获取或平衡。所有HOLD不变。

## 第三批 x17–x24：真实代价和公开消耗计数的执行合同

当前投影24卡48基升；x25–x75仍不支持。特殊计划保留完整结构参数（包括cap），不能只搬value。scaledCount是执行时公开数量的纯算术参考：先判封顶再乘，未封顶乘积越界拒绝，不能依赖Lua整数环绕。

x17先真实loseHp3再原生energy2/3，hp>3前验不等同Intangible后的支付，仍待合同批准；一次性消耗不由planner重复执行。x18先按当前面具群伤再退出，不得提前卸掉加成。x19只消耗结算牌之外的其他手牌技能，按真实逐实体消耗触发，零燃料仍付费，不能把攻击/能力算入；其格挡来自实际消耗数。x20执行时无面具才抽，面具中仍付费消耗，洗牌不能包含结算自己。x21/22读当前公开消耗实体数，包含之前消耗而不提前算本卡，封顶基础伤害后再按宿主攻击增益，不能误将面具加成也封顶。x23结算时耗尽当前能量换盾，固定0费不冒称通用X费协议，资源清零与给盾须同事务。x24先把其他攻击移至弃牌，再抽真实移走数（升级有移走才额外1）；可洗回刚弃攻击，不可洗回结算本卡。所有牌区、目标、触发、死亡短路仍由共享执行器实现，纯计划并未完成上述动作。

9条Lua探针验证48计划/生命先决/顺序/封顶参数/安全乘法；不代表24卡已能C.play。没有改变原JS牌值、来源与人审门禁。

## 第四批 x25–x32：当前意图与面具窗口

投影现32卡64基升，x33以后拒绝。threatDamage/coveredDraw纯函数只接受宿主核定的当前可见非负整数威胁，不接受JS跨回合intent数组，也不自行读取/预测未来意图。宿主必须对所有相关活敌合法性与合计溢出前验，不能把未知/稀疏意图当0；正式多段/强弱/护甲/虚弱如何折算需集成owner明确，未把实验单次威胁当正式多段合同。

x25依据目标当前攻击威胁>0加基础额外伤害；x26仅全活敌当前威胁为0才抽。x27先缩面具1再加盾，只有正→0才触主动退出，部分缩短无退出收益，依然可能下一结束回合致死。x28仅执行时mask==1增基础伤害、不退出；正常面具攻击加成后续由宿主另算。x29增加退出盾能力，应Power/Schedule正式登记，不立即加盾。x30先攻击再判断当时面具是否0抽。x31先伤害再压制仍存活的同一目标，不向别的敌人转移。x32先经宿主修正取得盾，再比较实际当前盾与核定总威胁；总威胁0时也满足覆盖。压制生命周期、死亡和非法目标由共享执行实现，当前无公共注册。

纯shortenMask返回mask及真实退出标记，可供宿主按顺序调用退出钩子；plan中的缩短预览仍不可提前写回。11条Lua探针通过，只证明纯计划/参考reducer，不冒称实际战斗及人审批准。

## 第五批 x33–x40（投影扩展停止点，下一步优先真实dispatch）

当前40卡80基升；x41以后拒绝。x33能力只影响后续回合正常抽牌后的无面具额外抽；x36能力仅按出牌前面具判断，每张攻击一次（两击不是两次），能力生效之前攻击不消费其资格，真实回合/新战清理必须宿主处理。x34预付费用后真退出才返能，纯exitEnergy不付款且不改资源，也不绕过退出钩子。x35每击独立护甲和面具增伤，目标稳定ID不变，死人不转移。x37读当前盾，封顶基础伤害，不消耗盾。x38耗尽全部盾包括不足5的余数与超出抽上限的部分，再真实抽/洗；纯spendBlockDraw只提议结果。x39把公开弃牌首攻击实体保UID放抽堆顶部，不是新增副本，下一次真实抽才入手，之后给盾。x40 cap=3限制活敌数而不是最终盾，enemyCountBlock明确区分其他cap语义并拒绝乘积越界。

13条纯计划/reducer探针通过，不是公共执行。共享owner现已给paid pendingPlay稳定targetId/uid合同；不继续扩未可执行投影，后续优先首8专属dispatch隔离实引擎探针，由owner统一gate/schema，仍不并发改共享。

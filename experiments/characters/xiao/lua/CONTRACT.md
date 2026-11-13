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

## 首8专属dispatch隔离纵切

abyss_xiao_dispatch.dispatch(combat,state,effect,queue)只执行damage/plunge/maskCommit。effect.uid必须等于pendingPlay.uid和cardInUse.uid；显式targetId必须等于paid targetId，查稳定enemy.id不保存索引。单体活目标验证，面具plunge排入原生damageAll；伤害基础加面具4后交宿主真实伤害/护甲/反应。maskCommit在真实付款后读HP，死不入场、不领遗物；真入场标准Actors.applyPower与Schedule登记，主动退出删除登记，首次遗物draw排在当前动作之后且下个卡效果之前。刷新不重领。现只覆盖首8、不支持后续退出/入场能力钩子，不应与全75并用。

4条隔离真实C.new/Combat.applyEffects/ActionQueue探针通过，含双敌单体/群体护甲、前置pause后付款与真实抽1、刷新不重抽、退出Schedule删除、UID/target坏值拒绝。测试人为构造已付款pendingPlay及inUse，不证明公共C.play的begin/useCard完成或自动扣能移牌；原生效果handler仅测试夹具，不冒充共享正式handler。全部动作必须宿主整命令Snapshot，适配器不是本地原子事务，不负责反复手工调用幂等；共享owner统一schema/gate注册后再跑公开命令验收。Intangible差异保持HOLD。

### 纵切补强：稳定目标与宿主快照（7探针）

新增暂停后敌列表换序仍命中paid targetId；死目标、缺pendingPlay、cardInUse UID不符和false UID在队列写入之前拒绝。新增基础/升级两条完整Snapshot.capture回归：先快照，付款夹具扣1能/移走真实card对象，再执行原生loseHp、mask入场/登记、真实遗物抽牌，最后故意异常；捕获后调用真实restore，深比较整个state并确认hand/draw/player/card原引用恢复。这个测试确证采用该宿主快照可恢复多阶段副作用，不表示当前公共C.play已经为魈接了快照或付款；shared owner确认目前没有魈公开入口，未猴补共享代码。

## 共享接线用角色bridge（仍未注册）

abyss_xiao_play_bridge提供definitions()首8独立副本，ID为xiao_candidate_x01..x08，experimental=true且xiaoCandidate=true。target=NONE不是免检：共享owner必须在任何付款前调用canUse(state,instance,targetIndex)，单体damage及无面具plunge检查真实活目标，面具群攻不要求无关单体；x04生命>2与严格升级/资源前验。未知ID拒绝。费用仍共享begin负责。prepare(state,effect)仅在已有paid pendingPlay/inUse后给特殊effect绑定稳定UID/target，不扣能、不移牌、也不替代schema合法性验证。

共享接线缺一不可：候选gate限制首8；Effects.supported/schema允许经验证的xiaoCard；canUse在付款前；prepare在消费后的pending上下文；special dispatch；完成边界useCard仍原宿主。未接完整链时不可把这些definition注册为可玩。9隔离探针证明factory复制、预验及binder→真实damage，依然没有公共C.play测试，不把辅助接口数量当正式交付。

## 待共享接线后的公开验收规格（未执行）

public_play_test.lua仅语法编译通过，没有调用执行：当前共享还未支持candidateLifecycle.kind=xiao，不能将该规格列为PASS。它约定真实C.new opt-in与C.play，覆盖x01/x04基升费用/坏目标UID/零能量/HP2拒绝、真实UseCard弃置与遗物仅一次，以及实际注册dispatch执行后故意异常的公共命令整图/原引用恢复。若共享模块命名或初始化合同改变须与owner对齐后实跑，不以夹具代替缺失入口。此文件预期缺gate时立即失败，不允许跳过后写绿色报告。

### 独审纠错：真实实例身份

此前bridge将instance误读为定义的id，手写夹具掩盖，不能据旧9PASS认为可直接接宿主。现canUse参数明确是实际手牌实例（cardId/uid/upgraded），prepare同样读取cardInUse.cardId；不兼容伪造id别名。新增真实C.new生成x01与x04基升实例，未添加id字段，验证binder与生命前验；仅id的伪实例拒绝。10探针通过待复审，此修复不替代尚未接线的公共play验收。

## 独立可执行扩展：x13/x14防守与普通owner-end

dispatch新增maskBlock与maskGuard，不改变首8bridge支持范围，不要求共享扩大01/04 gate。maskBlock按当前面具算基础盾，原生block队列应用Dexterity等宿主修正；maskGuard通过真实Actors.applyPower叠加，Schedule.recordApplied保留原始nil和已有membership区别（首次取得不能传0冒充旧状态），叠加不新增取得位置。真实owner-end依原模块先扣HP再给防守，致死不加盾。

defense_dispatch_test.lua四探针通过，含x13基升各mask与Dexterity、x14基升叠加后真实owner-end、死亡/新战不泄漏、坏数值/false以及Snapshot恢复。首8dispatch_test十探针回归通过。仍是角色模块隔离调用，不宣称x13/x14正式获取、付款、UseCard或共享注册。此前首次本地测试因nil错传0被Schedule拒绝，已修复并重新运行，未保存失败结果为成功证据。

## 独立可执行扩展：x12群攻与x15剥盾

dispatch新增damageAll、breakBlock；群攻不需要不相关单目标，实际群伤经宿主原生damageAll逐敌护甲处理；剥盾按paid稳定ID查活目标后设置其block=0，与宿主removeBlock效果一致，再由后续damage伤同一目标。不是直接改HP，没有更换目标。attack_dispatch_test三探针：两版有无面具双敌护甲、剥盾→攻击同目标顺序、死目标预拒绝，以及故意伤害后异常Snapshot整图与敌引用恢复。旧10+防守4定向回归均通过。仅effect层实际执行，无新增bridge/gate/获取或公共C.play；x13/x14已独审通过的宿主block修饰器差异仍待正式规则确认。

## 独立可执行扩展：x20条件抽牌与x21/x22消耗计数

dispatch新增unmaskedDraw/exhaustDamage/exhaustBlock。当前面具0才排原生draw；消耗实体区须稠密，再按真实公开数量算基础伤害/盾并封顶，面具加4在伤害封顶之后，宿主护甲/格挡修正仍原规则。此处不将结算牌提前放消耗区，也不新造回收/复制。exhaust_dispatch_test三探针涵盖真实C.new实例移入消耗区0/1/边界/超额、两版有无面具护甲、真实抽牌排除结算牌及稀疏拒绝；这段移区为效果级场景构造，不冒称通过正式消耗触发牌取得了燃料。旧10+4+3回归通过，仍无新增公共注册/付款或自然获取验收。

## 独立可执行扩展：主动退出盾与缩短面具

新增exitGuard真实能力取得/叠加与shortenMask执行。缩短不是刷新：直接取max(mask-value,0)，仅正→0走主动退出盾；maskCommit主动清零也接同钩子。自然owner-end到期仍不触退出盾，空退出/部分缩短/死玩家均不领取。退出盾通过原生block队列受宿主修正，未实现exitDraw等未开放能力，不能假称全75相互作用闭合。

exit_dispatch_test三探针覆盖基础/升级盾、2→1→0、空退出/自然到期不领、能力Schedule叠加单槽、死玩家、false前验和真实Snapshot恢复。既有10+4+3+3回归通过。仅effect级，桥接/gate范围未扩，公共x01/x04仍待集成。

## 独立可执行扩展：x23余能换盾与x38弃盾抽牌

spendEnergyBlock读取真正当前energy，安全乘积前验后清0并排原生block；固定0费卡不是通用X费实现。spendBlockDraw按实际盾取整/封顶后清全部盾（包括余数/超额），再真实draw，空库也失去盾。spend_dispatch_test三探针涵盖基升零值/阈值/封顶/空库、假数值与乘积溢出预拒、花费和抽牌后故障的宿主Snapshot恢复。此前23条effect探针回归通过。普通block仍使用宿主修正，未确认正式数值平衡；不改shared gate/付款。

新增明确负例：宿主blockFloat会对基础0也加Dexterity，x23零能量+Dex2实际获2盾（JS零能量0盾）。第四探针保存此语义差异；不得称零资源无收益/数值一致，不擅把原生block改fixed或跳过事件以隐藏差异。正式设计确认前仍HOLD（同类基础0的block效果须统一审查）。

## 独立可执行扩展：x35原生两击

damageHits将每击面具基础加成及times=2传给原生damage，不复制卡完成事件、不改paid UID/稳定目标；两击各自护甲处理，首击击杀不转移到其他敌人。hits_dispatch_test三探针验证基升/面具/序贯护甲、首击死亡不换目标、非法hits与真实Snapshot还原两击事件。只覆盖效果解释器内两击，正式shared队列逐击暂停/反击/UseCard和按卡一次能力触发尚未宣称验收；原首8十探针回归通过。未扩大公共gate。

## 独立effect增量：x37当前盾伤害与x40活敌盾

blockDamage以当前block取基础封顶，不花盾，之后加面具伤害再走原生damage；enemyCountBlock读取实际Actors.isActive敌人数，人数cap3后乘值，再原生block。state_attack_dispatch_test三探针通过基升边界/超额/面具、活敌0..4及Dexterity、false前验和Snapshot恢复。此增量尚待独审且未加入共享01/04 gate。

## 独立可执行扩展：x28末窗口攻击与x34退出返能

lastMaskDamage在执行时读取mask，只有1才加结构化bonus，其后正常面具4点及宿主护甲；不会自动退出，前一动作缩短可以改变当前资格。exitEnergy只在真正→0时先退出盾、再原生energy，空退出不返，重复不能再领；未来host付款仍须先支付基础费用，本效果不回退费用。能量安全和加法上界在变面具前校验，所有效果仍须宿主命令Snapshot。

window_dispatch_test三探针覆盖基升mask0..3、先缩短、实际返能、重复空退、退出盾组合、溢出预拒与恢复；首8十条及退出三条定向回归通过。只effect执行，x34正式消耗/支付/UseCard尚未注册，不能把该测试算免费循环或自然构筑验收。

## 独立可执行扩展：x16公开弃牌出口回收与x39攻击置顶

recoverExit按当前弃牌顺序，经真实cardDefinition展开该实例升级后效果，选首个maskCommit=0，排除正在结算UID；手满不移牌，仅用toHand保原实体/uid/upgraded/费用，不套宿主discardToHand自带免费化。topdeckAttack选首攻击实体放draw尾（宿主下一次从尾抽），不复制。两者不读exhaust、不泄漏隐藏抽牌顺序。后续所有75新结构出口是否归入检索需按正式合同再扩，不把目前maskCommit结构匹配冒称全池语义识别。

recover_dispatch_test三探针验证真实C.new基升实例、首出口/攻击置顶后真实C.draw、手满/消耗区不碰、整命令快照原引用恢复。实例取得来自构造器但移弃牌是效果场景夹具，不代表自然奖励或公开x16/x39 C.play；首8十回归通过，gate未扩。

### Lua x24 discard redraw effect slice
`discardAttacksDraw` collects the actual other attack instances in public hand,
then moves them to discard in hand order and emits native manual discard events,
then queues the native draw for count + base/upgrade bonus only with fuel.
This mirrors host discardRedraw's pile/event convention; it can redraw the just
discarded attacks after reshuffling. It never puts the resolving card in the
shuffle. No-fuel upgrade draws nothing. Exact instances/UIDs survive the move.
The 3 targeted tests cover both bonuses, actual reshuffle, no fuel, pre-mutation
overflow and post-shuffle host Snapshot restoration. Local malformed queue-start
state is not an effect-atomicity claim: host owns the entire command snapshot.
This remains an isolated paid-context effect adapter, not x24 public registration,
payment/UseCard or a claim that all discard-reaction combinations are verified.

### Lua x19 actual skill fuel
`burnSkillsBlock` snapshots other skill instances in hand, prevalidates total
block, then calls native CardActions.exhaust for each exact instance. Attack and
power cards are not fuel. Native exhaust events/relic/Power hooks remain enabled;
base/upgrade block is a native block action, with host Snapshot required for the
whole paid command. Tests exercise real Feel No Pain plus host card-action drain,
not replacement fake reactions. This is effect-level only, not public x19 play.
Zero fuel still produces native block(0), so Dexterity 2 yields 2 block, unlike
JS's literal zero: explicit semantic HOLD, not a claimed no-fuel no-benefit rule.
Full mixed exhaust-reactive pauses, character exhaustGuard, and public UseCard
remain unverified/unimplemented; the host owns queue lifecycle and unique piles.

### Composed plan execution: x10/x11/x17/x18/x30
Five focused actual queue tests now feed the frozen base/upgrade plan outputs,
in order, into the isolated dispatch plus native host effects. These cover
life→short entry→block with first relic draw, long-mask refresh, single/group
attack before exit, blood→energy and calm post-attack draw; full-sequence host
Snapshot restore and life precondition rejection are checked. The harness uses
a real constructor instance as paid-context fixture, not these cards' actual
public payment/UseCard completion. Last-enemy victory/choice suspension for these
compositions is not certified. Existing bridge/gate remains unchanged.
An explicit x17 Intangible probe confirms native loseHp(3) pays only 1 while
energy remains 2. This is a material JS/native cost difference, not balance
approval or permission to bypass native HP reactions. G5/semantic parity HOLD.

### Recovery/draw effect-order regression
`recovery_chain_test.lua` executes x16's recovery-before-shield and x39's
put-back-before-shield; a following x09 effect plan draws the exact topdecked
instance and then reshuffles actual discard. Base/upgrade and no-target fallback
shield are checked, plus whole-sequence Snapshot restore of UID/pile references.
This is an effect-composition harness: two plans reuse one explicitly constructed
paid context and do NOT prove two paid card uses, legal deck accessibility, or
UseCard/exhaust lifecycle. In particular the recovered exit is not free-played.
The public x02/x06 script remains pending host gate expansion; no shared code or
formal registration is changed by these tests.

### Isolated reserved-energy turn-start executor
`abyss_xiao_turn_start.apply(combat,state,effect)` accepts only xiaoStartEnergy
with the current turn identity. Host must invoke after base energy refill and
before normal draw, inside its full start-turn command Snapshot. It validates
state and exact native integer output first, marks the current turn, clears the
reserve and calls native energy. A duplicate same-turn invocation rejects;
next-turn invocation cannot re-pay the cleared reserve. Dead players get nothing.
Four targeted tests include actual owner-end expiry→reserve→next-turn payout,
strict false/stale/overflow rejection, and rollback restoring energy, reserve,
marker and original resource reference. The sequence calls isolated adapters
explicitly and models host refill; public endTurn/startPlayerTurn is NOT hooked
or certified. Other start-turn Powers/relic ordering remains the shared owner's
responsibility. No card value, shared registration or official gate changed.

### x33 calm extra draw (isolated Power and post-normal-draw hook)
Actual `calmDraw` dispatch applies xiao_calm_draw through Actors/PowerSchedule,
with strict accumulation precheck and no instant draw. `xiaoStartCalmDraw` is a
separate hook to be called AFTER the normal turn-start draw, not at the earlier
reserved-energy hook. It checks current mask at execution, marks the turn once,
and uses native draw only if calm and alive. Masked invocation still consumes
that turn's eligibility; later same-turn exit is not another start. Tests cover
base/upgrade, all mask durations, accumulation/single schedule slot, real hand
cap, actual shuffle Snapshot restoration, false and overflow rejection. Existing
energy-hook tests remain passing. These are explicitly called isolated hooks;
no shared turn-start order, real x33 payment/UseCard, persistent-save lifecycle or
formal registration is claimed. Host owns turn identity and whole-command rollback.

### x36 isolated per-attack capture/finish
Actual maskedAttackDraw Power stacks through Actors/Schedule. The new independent
attack-finish adapter captures real cardDefinition.type and mask while paid UID
and cardInUse agree, before effects; finishing after effects validates the same
UID/turn then consumes capture. Eligible living attacks trigger native draw at
most once per turn, including attacks which have since exited the mask. An
attack with no Power does not consume eligibility; adding more Power later does
not reset an already spent turn. Host must clear/restore all context on failed
commands through its full Snapshot. Four tests verify base/upgrade, repeat and
next-turn, late Power, UID rejection, death/skill/calm exclusions and rollback.
This is an explicitly invoked boundary API, NOT a new shared UseCard hook or
proof of actual two-card payment. Attack reactions/terminal victory pause order
must still be certified when integrating with the owner. Turn-start module
comments now distinguish energy-before-draw from calm-after-draw as reviewed.

### x41/x42 completed-attack history slice
The single-source Lua projection now includes 42 candidates (not 75), adding
frozen x41/x42 without changing catalog values. The isolated attack-finish API
counts every completed attack once, including those before x36 exists, and
reads history as zero on a new turn. x41 uses the pre-completion count capped at
three, then native damage; x42 gives its bonus whenever there have been no
completed attacks, so repeated opening defensive cards can both benefit.
Three actual-effect tests cover base/upgrade counts zero through five, excluded
self, exact defense ordering, new turn, malformed/overflow history and Snapshot
restoration. Old attack-finish 4 tests and all 42-plan 13 tests pass. The tests
explicitly reuse a constructed paid context; they do not prove multiple legal
card uses. Host must call capture/finish exactly once per real card, including
unmasked/no-Power attacks, and retain command rollback. Shared hook and public
x41/x42 gate remain unimplemented; enemy intent-dependent cards remain blocked
on a certified visible-current-intent contract, not guessed future move arrays.

### x43 kill draw with per-paid-target witness
Projection extends to frozen x43 (43 total). A valid living single-target
`damage` dispatch records paid UID/current turn/stable target ID before queuing
native damage. `killDraw` requires that unconsumed witness and checks the same
target's post-resolution HP; it consumes the witness once and queues native draw
only on zero HP. Tests run both versions with killing and shield-survival cases,
no-witness rejection and actual damage/draw Snapshot restoration; first-eight
10-test regression remains passing. This observes death by the later effect,
not exclusive attribution against all possible intervening reactive damage.
Public x43 cost/exhaust/UseCard, last-enemy victory and complex reaction pauses
remain unverified. Host canonical plan and paid UID context still govern which
effects may be dispatched; this module is not a standalone untrusted-command API.

### x45 deferred energy execution
Projection is now first 45 frozen candidates. x44 carryBlock is a proposal only:
its execution remains explicitly unsupported. x45 reserveEnergy now accumulates
strictly validated state.xiao.reservedEnergy without instant energy gain. The
previously reviewed isolated start-energy executor pays it through native energy
once at the host's next start after base recharge. Three tests cover base/up
projection cost, real deferred payout/no repeat, additive reserves, dead player,
exact integer limit, false rejection and Snapshot resource-reference restoration.
These tests do NOT pay x45's energy cost or exhaust it through UseCard. The host
must enforce that a player-phase card cannot invoke the start hook immediately;
shared phase admission and public lifecycle are not added by this role module.
No approved numeric values changed. x04 upgrade survival counterexample remains.

### x46 actual damage then bounded defense
Projection extends to 46 frozen candidates. damageGuard validates its live paid
stable target and queues native damage before a data-only damageGuardCommit.
The continuation checks the same target and UID, computes actual HP decrease
(excluding armor and overkill), caps base block and queues native block only for
positive HP loss. Three targeted tests span base/upgrade, low/high HP, three armor
values, mask bonus, dead-target rejection and host Snapshot rollback. Zero loss
does not queue block(0), hence cannot gain Dexterity block. Positive block still
uses native Dexterity/Frail modifiers, so the cap bounds the pre-modifier amount,
not final block; this remains a JS/native semantic HOLD. The continuation is a
trusted queue action, not an externally callable command: queue continuation
identity/one execution and whole rollback belong to the host. Intervening reactive
HP changes, target removal, last-enemy terminal timing and public cost/UseCard
remain unverified. No shared gate or numeric card change is made here.

### x48 native top-card sacrifice then draw
Projection extends to 48 candidates; x47 exhaustGuard remains only a proposal,
not a registered/executed native exhaust hook. x48 uses the existing host
shuffleDiscardIntoDraw when necessary, removes the real top instance directly
(without pretending it was drawn), calls native CardActions.exhaust, and queues
native base/up draw. A full hand still pays the top-card sacrifice but draw obeys
the hand cap. Empty piles burn nothing. Three tests cover identity, actual
reshuffle and Snapshot/RNG restoration, both draw values, full/empty piles and
native Feel No Pain after host drain. Public payment/UseCard/self-exhaust and
all shuffle/exhaust-reactive ordering or pauses remain unverified. Host owns
unique/valid card zones and entire-command rollback, including a bad resolving
UID encountered after reshuffle. No shared gate or frozen numeric values change.

### x49/x50 real hand-window execution
Projection now covers 50 frozen candidates. refillHand queues only missing native
draw up to the configured target (four/five), using current hand after the host
removed the resolving card. emptyHandDamage reads that same actual hand at effect
time and adds its bonus only when empty, then mask bonus/native damage/armor.
Three tests span base/up hand sizes 0/1/4/5/10, mask states, real reshuffle, short
library and full host Snapshot restore. Native noDraw/hand-cap rules still apply;
this is not a promise to achieve the target through draw restrictions. Canonical
paid-context/unique-zone validation, public cost/exhaust/UseCard and reactive
hand changes across real queue pauses remain host integration work. No values
or shared gates are changed, and 50 projected plans do not mean 50 public cards.

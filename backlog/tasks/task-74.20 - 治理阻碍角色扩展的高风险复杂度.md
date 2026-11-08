---
id: TASK-74.20
title: 治理阻碍角色扩展的高风险复杂度
status: In Progress
assignee:
  - Furinya
created_date: 2026-11-06 01:46
updated_date: '2026-11-08T19:01:00Z'
labels: []
milestone: m-7
dependencies: []
documentation:
  - docs/backlog-details/M7-CORE-LIFECYCLE-20261106.md
  - docs/backlog-details/M7-SCRY-CHOICE-RESPONSIBILITIES-20261107.md
  - docs/backlog-details/M7-SHIV-TURN-RESPONSIBILITIES-20261107.md
  - docs/backlog-details/M7-ACT3-AI-RESPONSIBILITIES-20261107.md
  - docs/backlog-details/M7-LOCAL-RESPONSIBILITY-INTEGRATION-20261108.md
  - docs/backlog-details/M7-POTION-REFACTOR-INTEGRATION-20261108.md
  - docs/backlog-details/M7-ENEMY-AI-RESPONSIBILITIES-20261108.md
  - docs/backlog-details/M7-ENEMY-AI-REFACTOR-INTEGRATION-20261108.md
  - docs/backlog-details/M7-DEFECT-UTILITY-PLANNING-20261108.md
  - docs/backlog-details/M7-DEFECT-REFACTOR-INTEGRATION-20261108.md
  - docs/backlog-details/M7-SEVEN-CURRENT-INTEGRATION-20261108.md
  - docs/backlog-details/M7-WATCHER-FLOW-PLANNING-20261108.md
  - docs/backlog-details/M7-SILENT-TACTICS-PLANNING-20261109.md
  - docs/backlog-details/M7-EFFECTS-TARGET-GROUP-20261109.md
  - docs/backlog-details/M7-PUBLISHED-COMBINATION-20261109.md
parent_task_id: TASK-74
priority: medium
type: task
ordinal: 162000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
已合Host切片后仍存在最大CC75及67个CC超过30函数；现有任务未逐项界定Combat、Actor、MapUI及RelicHooks对内容迭代的风险。按真实职责治理，避免无限拆分或搬移指标。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 当前全函数含匿名及初始化块机器清单列出CC超过30、最长函数及超千行文件，并按调用链、变更频次和测试风险识别P0/P1
- [ ] #2 已确证P0/P1职责达到CC15或以完整行为对照及明确分层接口证明安全，所有新增helper计入硬门禁；旧新随机、回滚、别名和失败轨迹保持
- [ ] #3 首份机器清单审查后确定绝对出口，公布最终分布与经Owner接受的残余范围；独立深审及实际合后Full通过
- [ ] #4 首批Actor.status/applyPower/addStatus/endTurn及Combat.damage/draw六职责和全部新增helper受CC15硬门禁；完整旧新状态别名随机事件返回错误轨迹相等，真实语义负控检出，首批完成不代表其余61热点已验收
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.复用固定Luacheck和完整AST清单，以dedb9ed5列高CC及长函数。2.按M8扩展调用链、变更频次和现有差分测试识别高风险职责，与依赖审查交叉核对。3.首份机器清单确定绝对出口后治理具名职责，全部helper计入原门禁，行为对照和独立深审后完整交付。

4.首批落实Actor.status/applyPower/addStatus/endTurn及Combat.damage/draw六职责，先固定完整旧新轨迹，再按真实生命周期阶段拆分；六旧热点及全部新增helper/匿名回调/初始化块CC≤15，其他源码不变时>30为67→61。其余热点保持待分级，不视为已接受残余。

5.首轮同模块提取令Actor增至1039行，提交前继续提取无外部依赖的Power校验与堆叠规则叶模块；Actor保留状态提交及动态公开接口。Actor/叶模块1000行硬门禁与叶反向依赖门禁先红后绿，来源升级四源精确epoch并保留旧布局/新鲜读取合同。

本轮最终有界切片：按既有剩余风险建议，仅治理original_v4 validateEffects/apply/executeRoot及新helper，保持支付、唯一快照、逐效果、角色结算与AI flush顺序。全函数含匿名/初始化同口径复采并对新职责执行CC15，冻结旧源、全状态与失败对照后独立复审。

2026-11-07 Owner接续EndTurnPower独立切片：核d8a57cae与PR541–548、Act3目录在途不重叠，按回合末Power规划、虚拟状态与动作执行拆责，保持完整调度/事件/RNG/异常轨迹及动态接口，全模块CC15，窄测和独审后交付；不改owner/status/AC。

本轮仅本地整合已独审的Scry 68f6b914、Shivs 8d3ce9db及Act3 AI 4fe31ed4。最新develop仍为d8a57cae；16个开放PR无三个生产文件重叠。保留三片源码和原始证据，公共CC硬门禁、测试库存与任务记录加法合并，重新采集全库SCC/CC并跑必要定向测试、独立深审与本地提交。不得重试远端上传或绕过原Full/精确SHA准入；不重复全量、不改owner/status/AC。

本轮独立Scry选择切片：在最新develop d8a57cae与开放PR/本地树占用核对后，仅分离choose的候选验证、选择收集、Weave前置条件及弃牌提交职责。保留错误、别名、回调和队列顺序；完整旧新差分与真实语义负控、新helper CC15、定向回归、独审及精确HEAD CI后按原流程交付。SCC不预报减少，不接触既有Act3/药水/中毒切片。

本轮接续未占用Shivs.startTurn：从最新develop d8a57cae分离敌人存活扫描、旧UID收集、生成合同验证与历史帧Accuracy补值职责。保持完整遍历、动态调用、错误/部分写入顺序及原生成器owner；新旧完整图差分、真语义负控和全模块CC15后独审。仅本地验证，目的地授权未补齐前不发布，不重复Full、不改owner/status/AC。

本轮接续未占用 Act3.advance：基于 develop d8a57cae，按 Maw 出招与历史帧替换、Spire Growth 历史决策、Shapes 决策和 Orb Walker 防连招职责拆分。保持每次随机消费、动态加载、状态写入与错误先后，冻结原源码并做完整图差分及真实语义负控，全模块 CC15。仅本地验证与独审，未获得新目的地授权前不发布，不重复 Full；owner、status 和 AC 保持。

在隔离本地树保全整合126e5f9c与1f454854，保留全部生产/历史证据，重测组合SCC/CC并验证来源、库存和预算；只做定向检查及独审，不重复Full、不上传或操作用户设备。

本轮从 d8a57cae 独立接续 Enemy AI 初始化与推进职责，避开 #541–558 及本地 126e5f9c 的源码占用；保持策略优先级、RNG和失败语义，使用冻结旧版差分、定向回归、完整工程测量和独立复审。仅本地提交，不重试已拒绝的公开上传。

2026-11-08 继续已授权 M7 本地职责治理：确认 develop、开放 PR 与本地12950b1c占用后，仅整理未占用 Defect utility 的队列计划职责，按充能球派生、意图条件、X费用与出牌历史划分内部 helper，保留公开 API、验证顺序、动态读取和不可变计划。冻结完整旧源，双 VM 定向差分、负控与完整 SCC/CC 采样，独审后仅本地提交，不重复 Full 或重试公开上传；不重复认领或勾 AC。

本轮在隔离本地树保全整合已独审的六项合流12950b1c与Defect utility 27b2ccc9；不改生产输入字节，逐项合并共享来源/成本合同，重新采集组合SCC/CC、定向行为与真实库存预算，独审后本地提交。全部旧计划/证据保留，不重复Full、不上传或操作用户电脑，不改owner/status/AC。

2026-11-08 接续七项已有本地重构：基于已合#560的a0c35db8进行真实增量适配，保全两侧来源、合同与原始证据。只做定向测试及独立深审，不重复Full；从当前基线形成单父线性提交，明确批准后可按Ruleset正常上传及提PR，仍不得绕过质量门禁。

2026-11-08 本轮从最新develop 7821a7f4接续未占用WatcherFlow计划职责：仅按普通伤害、姿态、X费用、Power、弃牌回收拆分planEffect，保留动态读取、验证及队列顺序；withCards32与既有Actor依赖列为残余。冻结旧源、独立双VM图/错误轨迹与真实语义负控，新增职责受CC15，窄来源接线及独审后仅本地保存。不重复Full、不上传、不操作用户设备，不改owner/status/AC。

2026-11-09 按Owner及时集成要求，将已独审WatcherFlow c24ef4e无冲突叠加当前PR564 50584b5，补精确来源epoch与隔离闭包、新测试真实成本及完整库存；定向复验和独立审查后按原权限发布依赖PR564的draft PR，不重复Full、不绕过保护、不改owner/status/AC。

及时集成已公开 #564/#567/#568/#569 到独立云端组合树；保留三片原生产字节与历史证据，合并48-owner来源合同和三项CI规划floor，定向验证及独立复审后远端保全。前置管理员准入仍待，不重复Full、不改他人原分支或任务验收状态。

2026-11-09 接续主控明确授权的 Silent tactics 动作计划职责：仅在当前 develop 7821a7f4 上拆分 planEffect 的目标状态、手牌/弃牌、重复攻击及 X 能量规划，原公开接口、动态读序、错误、队列与 RNG 不变；冻结完整旧源并用独立双 VM/全图及原 Combat 夹具验证。与 #564/#565/#566/#567 生产范围无交集；保留 Furinya、In Progress 与未验 AC，独审后先持久保存实验分支，待前置真实合入再按最新基线完成来源合同集成及正常 Full。

第18轮：仅拆分 abyss_effects.targetGroup 的图发现、稠密成员与相邻配对校验；保留读取顺序和错误时机。冻结 develop 7821a7f 原始源码，增加独立 VM 差分、语义负对照及 CC15 可执行守卫；不改任务状态或负责人。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮固定Luacheck及完整AST复采328模块/5283测量：CC>15为258、CC>30为67、最大75、最长580，Combat2240行。正按真实状态owner及近期变更频率整理有限P0/P1治理出口；未实施重构，不勾AC。

完整审计附件已落盘并引用328源码摘要、67高CC与39长函数机器清单。首批六职责属于核心状态/Power及伤害抽牌协调，先于MapUI/RelicHooks/Feedback后续批次；尚未实施，无AC勾选。

六入口与纯Power叶模块本地验证完成：Actor996行、leaf62行；329模块5314完整测量、CC>30为67→61、CC>15为258→252。旧新差分、函数/错误别名、6+4真实语义变异、相关回归、四源桥51专项及原raw预算通过。独立c48b6a35深审PASS；组合接续本人PR521，当前Full/实际合后未验，所有AC仍不勾，余项风险未接受。

组合补测CI闭合库存733JS/1359Lua发现旧固定库存断言失败；仅显式登记5JS/3Lua为未测文件，原725/1356及2900/2712测量、timings、worker安全、原预算保持。主控3/3与独审3/3通过，最终源码Full仍待；不借旧7ec候选绿灯。

D5同源全采333模块5370/5370测量，CC>15降至240、>30仍61、最大75、最长580，Combat仍2275行。两新cap全函数/嵌套/初始化CC15及1000行硬门禁通过，1746 governed、14旧告警、零新增豁免。剩余热点正按真实owner/调用者与变化频次做有限风险审计，不视为接受；独立整片深审与完整交付未完成。机器证据docs/evidence/m7-relic-lifecycle-20261106.json。

独立有限审计补齐61高CC与61长跨度逐项owner/静态调用/测试/文件历史证据；未知不降级，无新P0确证。见docs/backlog-details/M7-CORE-REMAINING-RISK-20261106.md与机器附件。P1用于相关下一变更的审查顺序，非把所有数字强拆；不冒充Owner接受残余。当前D5有35组完整图等价、6具名语义负控与全新helper门槛证据，最终独审和托管仍待。

本轮仅治理既有建议V4三入口及全部新helper：validateEffects32、apply69、executeRoot40均降至15以内，原支付/唯一快照/逐效果/角色结算顺序保持。333模块5385/5385测量，CC>30=58、CC>15=237；本批各减3，最大75未掩盖。原1200冻结向量及合同/生命周期23项通过，新增支付/快照/Codex RNG真语义负控检出；静态1769职责门禁、14旧告警无新增。实际合前后Full和精确独审仍待，不提前勾AC。

最终三入口CC为validateEffects10、apply8、executeRoot11；17个入口/helper全部纳入CC15，新helper最大15，Codex全模块及新提交helper同门禁。新增8项最终8/8，原35-owner来源4/4保持，当前本轮集成候选待精确独审/Full，不启动下一切片。

2026-11-07 EndTurnPower独立切片完成：prepare55→4、apply34→12，全模块38项最大12并纳入CC15；333模块5414测量，>30为58→56、>15为237→233，SCC81/15不变。新12/12共391完整图检查点、3语义负控，原N35 4/4、隔离26/26、CI与admission19/19及8旧Lua通过；独立44行为/76门禁负控及真实完整回滚通过。21,279ms完整文件floor保留旧预算，独立提交和托管Full仍待，不勾AC。见docs/backlog-details/M7-END-TURN-RESPONSIBILITIES-20261107.md。

Scry.choose独立职责片已完成本地验证：choose CC38→10，4新helper最大11，完整5390测量下CC>30 58→57、>15 237→236，SCC81/15不变。旧回归18+2+28、新完整图8/8及真实语义负控通过；完整新文件wall2.361s低于unknown10s，保留全部旧成本。独审精确HEAD、Hosted及合后验收仍待，AC不勾。详见docs/backlog-details/M7-SCRY-CHOICE-RESPONSIBILITIES-20261107.md。

Shivs.startTurn本地职责片：CC33→6，5个新helper最大13，全模块20项函数/初始化测量受CC15；完整5391/5391，>30为58→57、>15为237→236，SCC81/15不变。原Shivs25组与MasterReality集成、完整旧新图及8个双侧语义负控通过，原14警告无新增。当前本地独审及精确提交绑定收口，目的地授权不足故不尝试远端发布、不重复Full，状态/owner/AC保持。详见docs/backlog-details/M7-SHIV-TURN-RESPONSIBILITIES-20261107.md。

本轮Act3 AI出招职责本地完成：advance CC46→14，四helper最大13，全模块11项受CC15；完整5390/5390，>30为58→57、>15为237→236，SCC81/15不变。1732个旧新完整图检查点与10个双侧语义负控通过，新差分/门禁29、既有集成13、CI库存17通过；独审另验第二次Copy失败和回调改图，未见阻断。Backlog doctor仍有5组既有重号，未算通过。仅本地验证、独审及提交，未重试远端发布、未跑Full，status/owner/AC保持；详见docs/backlog-details/M7-ACT3-AI-RESPONSIBILITIES-20261107.md。

本轮本地整合三片，生产源及32个独有文件保持给定独审提交字节。全库新采5399/5399测量，>30为58→55、>15为237→234、最大75；SCC81/15与1920引用位置/1546依赖对不变。公共CC门禁加法保留，49个差分/门禁最终通过（首次缺生成数据的Scry单项已补构建重跑8/8），既有Act3 13项和Scry/Shivs五个完整夹具通过；CI库存/历史成本17项通过。独审隔离同时切换三模块213图检查点及27门禁通过，精确提交绑定另存。749JS/1402Lua按原unknown成本，Windows/POSIX含60秒预留最大1712826/1193435ms；仍只是规划。guidance稀疏缺失文件按原HEAD补齐后通过；Backlog doctor保留原5组重号失败。没有远端写入、PR、Full、合并或实机证据；任务owner/status/AC保持。

2026-11-08 与职业药水边界在隔离本地组合承接，原Scry/Shiv/Act3源码及所有独有证据逐字保留。最终完整测量确认本组合CC>30仍55，SCC80/15为药水真实收益，不混入其他开放PR。POSIX14交付形状与历史来源合同已核，不代表托管CI或合并准入；详见M7-POTION-REFACTOR-INTEGRATION-20261108。

2026-11-08 四项职责与 Watcher 边界本地合流复测：CC>30 仍55，CC>15 仍234，最大75；Watcher 只贡献 SCC 80→79，不冒算 CC 降幅。全部既有生产、测试及证据保留，精确组合报告见 M7-WATCHER-REFACTOR-INTEGRATION-20261108.md。未上传、Hosted Full 或合并，原 owner/status/AC 保持。

本轮独立接续Enemy AI初始化/推进职责，CC40→21、43→13，8新helper均≤15，原门禁不放宽；全库CC>30从58降至56，>15从237降至236，SCC仍81/15，不借本地合流数字。79组旧新图/别名/RNG/失败差分、7语义负控及11真实Lua夹具142项通过，原历史来源37项、关键变异4项、原生UI6项通过。初始化21作为明确路由残余；独审和本地提交收口中，不勾整项AC。公开上传限制保持，无新PR或合入。详见新增附件。

2026-11-08 Enemy AI与已有五项职责本地保全合流：333生产源逐字并集，真实5410/5410完整测量，CC>30 58→53、>15 237→233，SCC79/15；相对126e5f9c仅Enemy贡献CC降幅2/1。行为21、四Lua集成70组、来源/CI/交付定向回归通过，初始两项规划历史输入失败保留并修正。独审收口并精确绑定本地提交；未上传、Full或合并，原owner/status/AC保持。完整指标与限制见M7-ENEMY-AI-REFACTOR-INTEGRATION-20261108。

2026-11-08 本地 Defect utility 队列规划按充能球、意图、能量与历史职责拆分，planEffect CC37→8，整个模块≤15；全库CC>30 58→57、CC>15 237→236，完整SCC仍81/15，未宣称降环。新185例差分/52例旧新Combat/6负控及来源、库存验证通过，独审6825例无缺陷。仅本地提交，不上传或重复Full，原owner/状态/AC保持；见M7-DEFECT-UTILITY-PLANNING-20261108。

2026-11-08 保全七项本地合流：Defect utility与12950b1c合并，333生产源逐字保留，新采5414/5414测量，CC>30 58→52、>15 237→232、SCC79/15、最大75。相对六项仅Defect贡献CC各减1，不冒算降环。当前行为32、来源/库存41、分片/交付65及离线原生UI6项通过，原失败日志与所有历史证据保留；精确独审和本地提交绑定另存。未上传、Full或合入，owner/status/AC保持。详见M7-DEFECT-REFACTOR-INTEGRATION-20261108。

最终只读核对新增统一集成PR #559（9b49c8da），develop仍d8a57cae；本地七项10个生产文件无交集，共享来源/成本合同有交集。当前仅完成既有保全提交，供统一流程后续接续；没有操作#559或开始新功能。

2026-11-08 七项接续#560当前基线a0c35db8，338模块全源同算法实测SCC70/11/2→68/11/2，大环521/330→513/324位置/依赖对；CC>30为46→40、>15为221→216，最大61、14旧警告保持。5555/5555测量，10个本地重构生产源逐字保留，其余主线源码不覆盖。行为首轮78/79，唯一旧333模块库存断言已保留原333+明确5个主线新增并定点通过；CI104项、关键变异4项、原生UI6项通过，Full未重复。完整库存782JS/1408Lua规划在原目标内，保留19项floor和既有执行保护；独审和精确提交身份见本轮附件。全部历史任务计划/证据保留；尚无本提交托管Full、合入或实机验收，owner/status/AC不变。

最终补记：来源定向106个不同用例已有最新通过证据，初次79中3个测试适配问题已定点纠正；独审通过代码/来源安全边界复核，精确提交身份另存。按真实证据补3项成本floor，原19项不变；17/14完整库存含60秒预留最大1771239/1179021ms，原目标余28761/20979ms。后两项仅成功测试用例成本下界，非全文件实测；原失败/中止均保存，不伪称Full。

发布前develop前移至#561b7ed1830，无src/data/scripts/config变动。本轮在新隔离树保全其全部档案及更强历史来源/退休安全合同，仅解决7个非生产文本冲突；45变动owner鲜读与旧epoch linked owner检查并存。最终单父基于b7，原a0度量和320独审按原身份保留；仅定向helper/负控复验，不重复完整行为/工程采集，不改owner/status/AC。

2026-11-08 WatcherFlow纯计划职责本地完成：planEffect32→12，5 helper最大8且纳入CC15；338模块5560完整测量，CC>30为40→39、>15为216→215，SCC68/11/2和14旧警告不变。334例668完整图点及原28例Combat双VM一致，最终11/11含6语义负控，独审另137例通过。当前历史完整树身份窄测真实失败；共享epoch/隔离闭包由#564占用未改，来源接线与新51,776ms规划下界待整合。无上传/PR/Full/合并或设备验收，owner/status/AC保持；见M7-WATCHER-FLOW-PLANNING-20261108及机器附件。

Watcher Flow 已在 #564@50584b5 上接入完整外层来源epoch及隔离闭包，解决原共享来源阻断；46 owners/339非空绑定。原来源45/45、新epoch5/5、行为11/11（55667.073989ms，规划下界55668）、CI41/41、独立来源12/12及CI4/4通过。保留首轮元数据缺失失败和所有冻结来源；784 JS/1409 Lua预算预测1775788/1183709ms。详见 docs/backlog-details/M7-WATCHER-FLOW-PLANNING-20261108.md 和 docs/evidence/m7-watcher-flow-integration-20261109.json。Draft PR发布待完成；#564前置CRLF失败未解决，未重复Full、未合并或设备验收，owner/status/AC不变。

2026-11-09 Silent tactics单一职责片已实做：planEffect CC34→15，四helper最大11，全模块CC15。独立旧新VM各585场景/1170完整图、16语义负控及原Combat各60例通过；来源outer46 owner鲜读、完整5559测量，CC>30 40→39，SCC68/11/2不变。源码已远端保全07400300（与本地8e1同树）；完整验证/失败/独审见新增附件。仅新增真实21636ms floor，未重复Full；#564已负责的GameUI历史收据问题不复制修复，待前置实际合入后整合#567及本片并按正常门禁验收。owner/status/AC保持。

2026-11-09 Effects目标分组验证按图遍历、数组/成员/成对职责拆分，targetGroup CC33→7，六helper最大9；338模块5561测量，CC>30 40→39、>15 216→215，SCC68/11/2不变。独立旧新VM306完整图、11非超时语义负控及真实CC超限负控通过，5/5完整7661ms；旧Shockwave71/71、core7/7、门禁19/19。生产已远端549e92a保全，与本地eba2449同tree。以#564 f256为前置接续其原修复，保留独立基线失败，最终组合证据与审查另附；不重复Full、不提前验收AC。详见本轮附件。

2026-11-09 已实际组合公开#564/#567/#568/#569，三份生产字节及原档保留，先远端保全0df91e5e。338模块5570/5570鲜采：CC>30 40→37、>15 216→213、最大61；SCC68/11/2不变。48-owner组合鲜读与历史45/46合同并存，CI39/39；788JS/1410Lua含预留预测1779486/1187400ms。独立复审无未解决项，原失败日志保留。完整组合证据见M7-PUBLISHED-COMBINATION-20261109；前置管理员准入未解，不重复Full、未ready/入队/合并，owner/status/AC保持。
<!-- SECTION:NOTES:END -->

---
id: TASK-74.19
title: 收敛核心依赖环与领域状态所有权
status: In Progress
assignee:
  - Furinya
created_date: 2026-11-06 01:46
updated_date: '2026-11-11T09:22:00Z'
labels: []
milestone: m-7
dependencies: []
documentation:
  - docs/backlog-details/M7-DEPENDENCY-AUDIT-20261106.md
  - docs/backlog-details/M7-POTION-REFACTOR-INTEGRATION-20261108.md
  - docs/backlog-details/M7-SEVEN-CURRENT-INTEGRATION-20261108.md
  - docs/backlog-details/M7-PROTECTED-CALLS-20261111.md
  - docs/backlog-details/M7-IMPORT-MEMBERSHIP-20261111.md
  - docs/backlog-details/M7-ARCHITECTURE-GATES-COMBINED-20261111.md
parent_task_id: TASK-74
priority: medium
type: task
ordinal: 161000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
当前大SCC仍有104个模块，既有职责切片未覆盖全部跨领域反向边；先确认影响后续角色内容开发的真实高风险耦合，避免仅靠拆文件宣称架构完成。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 以当前同一源码身份输出即时及延迟完整依赖图、SCC成员和内部边位置，逐类说明状态提交owner与风险依据
- [ ] #2 消除已确证P0/P1反向依赖并以旧新状态、随机、事件、队列、别名及失败回滚对照验证；保留边有生命周期依据且新增边受可执行防回退门禁
- [ ] #3 公布同算法最终SCC绝对值、残余风险与责任；独立深审及实际合后Full通过，未确认残余不冒充低风险
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.在dedb9ed5完整源码上复用AST依赖采集，核对即时及延迟SCC、真实反向调用与状态owner。2.独立审查优先核心调用链，形成逐边风险与可证实解环路径。3.按真实P0/P1选择最小职责切片，固定旧新行为并加门禁后独立深审及完整交付。

4.依据391306af只读审计与现有CardActions规范，准备单一无出边遗物只读查询模块：移动原五套有序alias及窄奖励计数，保留普通动态字段读写、Shop.aliases枚举/替换、Rare私有owns与公开替换隔离、Run调用时函数快照。先冻结完整旧源和行为/加载边界基线；当前PR521由原生队列完成，后续提交不另建待合PR或改入队HEAD，待基线落地后再集成。

5.D5完整生命周期边界：已确认孤立Boss提取仍回Session，不实施该假切口。按docs/plans/2026-11-06-relic-lifecycle.md组合Hooks Combat能力与四族固定能力，保留Session公开命令和Wish/Writhing原owner规则；四Runtime根到Session传递门禁已真实RED4/4。新隔离树feat/relic-lifecycle基于5762，先完整391旧新VM基线与独立计划审查，再写产品；原query交付树保持干净。

6.仅收口当前PR521：按Full42176327678逐项修复drain、旧语义变异定位与历史预算输入适配，保留原oracle、case、断言和预算；对本轮真实超时仅用已完成成功文件实测校正分配并采用可容纳全库存的最小布局。独立复审、新SHA完整CI、原生队列和实际合后验收完成后结束，不开启下一架构切片或新任务。

本轮最终有界切片：将Codex选牌生成与提交移回现有Combat选择事务owner，Codex仅保留开选和校验，消除其回导CardActions；原状态、RNG、事件与晚失败回滚逐字对照，保留完整图与残余，不扩大架构范围。

2026-11-07接续主控指派的未占用奖励查询切片：仅RelicCardRewards、RelicChoices、RelicPending六处现有owns/preview调用改用已共享的Queries/Family.common能力槽，保留每次动态字段读取及Run真实事务；不改provider公开表/元表。以d8完整源码、三consumer新outer、独立新旧VM全图和窄来源/架构负控验证。预计Session环内引用62→56、唯一对41→38，成员15和Combat81不降，不冒称SCC成员收益。已核14在途PR及本地未发成果，task:pick因既有In Progress为HOLD，不新领不改owner/status/AC，不用用户电脑、不重复Full、不碰Act3中止交付。

2026-11-08 本地续做：避开已有 PR 与未发布切片，明确职业药水策略与队列宿主的充能球执行能力边界；由 CardActions/Combat effect dispatch 提供延迟 Orb host，药水模块不再回导 Orbs。固定同基线全源和旧新用药、队列、RNG、错误/回滚；新增全依赖防回退并独审。当前仅本地保存，不重试此前被拒的公开上传，不重复全量测试。

在隔离本地工作树保留职业药水与 Scry/Shiv/Act3 三切片并集，重验来源与实际 SCC/CC；按完整库存评估 POSIX 14 分片，保持原预算、预留、并发和全部成本，修复交付身份合同并独立评审。不上传、不重跑 Full，不提前勾选 AC。

本轮仅本地合流已独审四项职责提交 35850732 与 Watcher 28c4881f；保留全部生产、历史源码和真实耗时，重新采集完整 SCC/CC，按共享来源与 CI floor 并集验证，独审后本地提交。不上传、不触发 Full、不操作用户设备；状态、owner、AC 不变。

2026-11-08 接续既有授权的独立职责片：WatcherAttack 只保留卡牌数据与纯效果计划；Halt 的 Actor 格挡算术由 queued-play 逐次提供延迟能力。仅改两生产源，保持动态方法读取、验证顺序与快照；原断言和完整历史来源保留，定向测试、全源码 SCC/CC 测量、独审后仅本地保存，不上传或重复 Full。

2026-11-08 接续七项已有本地重构：基于已合#560的a0c35db8进行真实增量适配，保全两侧来源、合同与原始证据。只做定向测试及独立深审，不重复Full；从当前基线形成单父线性提交，明确批准后可按Ruleset正常上传及提PR，仍不得绕过质量门禁。

2026-11-11 依赖门禁窄修复：复现模块初始化中的全局pcall/xpcall同步调用已知local函数被错误标成deferred；复用现有词法与调用闭包，只补标准保护调用的函数/错误处理器，保留局部遮蔽、未调用owner和普通参数边界。避开#619成员判断及#618/CharacterProfiles共享来源，先红后绿、原全架构报告对照与独审后Draft交付。

2026-11-11 接续未占用的架构导入登记边界：已核 develop 3a061a76、全部9个开放PR及协调执行线，check-architecture.mjs 无代码占用。先重现 JavaScript 原型字段被误当作已登记 Lua 模块，再只改精确 own-property 判定和既有文件内回归；验证显式源码/生成模块、继承输入拒绝与当前全图字节不变，独立复审后按原门禁交付。task:pick 因 In Progress 为 HOLD，不重新认领、不改 owner/status/AC，不碰 #610/#618/CharacterProfiles 共享层，不重复 Full。

2026-11-11 本轮合流#619与#622：已核当前develop及两PR无新占用，保留两父提交及全部独立证据；仅合并同文件互不覆盖的门禁与回归，Backlog通过CLI追加两侧记录，.gitattributes保留两侧。完整定向验证、原全图对照与独立组合复审后更新原#622，不新增PR，不重复Full，不改生产Lua/共享来源或owner/status/AC。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮新鲜AST：328模块1902引用位置1535唯一对；即时图无SCC，含延迟图104成员804内部位置538唯一对。已逐类核对RelicHooks和Session/Combat提交owner，见M7-DEPENDENCY-AUDIT-20261106。六处入队解耦只减少职责反向边，不使大环缩小；优先审清生命周期切片及历史来源适配成本，不以数字下降收口。

只读反事实提示CardPool三查询接真正叶可使104→103；更大族Session与purge路径104→88仅删边实验，不是实测改善或P2接受。补查现有规范不承诺raw反射形状，真实Shop.aliases与Rare.owns动态消费必须保留；原先要求纯反射另审批的推断已撤回。证据在主控521工作树build/g1-next-boundary及根.artifacts。所有AC仍未勾。

遗物只读查询切片已在隔离树完成本地实现：单一零依赖叶保留五别名域和动态API；139别名、48奖励场景/344随机数边界双独立VM一致，专项6/6绿。CardPool实际退出核心SCC，104→103成员、内部位置804→791，未宣称整个环完成。独立生产初审无缺陷；来源适配、最终提交与托管验证继续，AC保持未勾。技术证据见docs/backlog-details/M7-RELIC-QUERIES-20261106.md。

只读能力批次新增永久牌候选owner：仅依赖Copy，Boss不再回导LivingWall事件；原动态purgeCards、逐卡Copy图、错误和事务/RNG保持。新增6项先红后绿，原LivingWall72变换槽及Boss/Astrolabe等9项绿；同epoch十源34项绿。完整图实测331模块，大环102成员/787内部位置/527对，CardPool与LivingWall退出；14旧告警，无新增豁免。源码和来源已稳定，最终独审/提交/托管继续，AC未勾。

D5生命周期产品已在独立树实现：14 Combat Hooks+固定五族能力，23消费者118读取保持原AST时机。实际333模块/1921位置/1547对；Combat SCC82/626/402与Session15/62/41，即时无环，六入口全边不能回Session。当前35组完整旧图读回与fresh current VM逐字一致，13540检查点；冷加载与89双向普通槽位、直接/延迟治理负例9/9，原查询候选12/12。最终来源桥、具名变异、精确整片深审及托管/合后验收继续，AC不勾。见docs/backlog-details/M7-RELIC-LIFECYCLE-20261106.md。

D5来源扩展34项及独立有界审查PASS：23个391完整before另核Git blob、35 fresh owners/4 witness、精确配置逆和四copy完整旧epoch，原core guard不改。6个真实可解析语义负控控制先成功后被具名行为断言检出，覆盖双queue、TOP、counter别名、动态Boss、Wish/Bloom和Omamori发布；6/6通过。当前继续最终整片精确提交与原生交付，未用局部通过关闭AC。

7be来源Full42176327678真实失败已保留，已通过原merge:auto暂停并读回。11个测试位置归6组：drain旧inverse/动态owner、HP顺序/Spoon/Necronomicon/Victory旧mutator site、旧14片误用当前新增库存；对应点状修复保持生产333源不变。另Linux6与Windows8/14 annotations确认20/30分钟真实上限终止，不能只更正旧历史预算断言后忽略实际吞吐；按完整成功CI_FILE_TIMING实测做当前布局必要修正，未声明新候选已通过。

本批Full失败适配已定点修复并独审8file：drain5/5及raw75例/18真变异、三处定位12/12、Actor与历史预算9/9保持，补回当前13/14完整raw覆盖。真实timeout按1458条成功file原生日志校正129项JS权重，16/12工作下界已超原预算，采用必要最小17/13；原预算、unknown、raw安全/成本、worker、并发与Relic35均不变。既有CI入口仅加2个新完整SHA纯映射，3历史+4当前合同7/7及直接25/25通过。新精确HEAD/Full/队列/合后验收仍待；按Owner最新要求只收当前PR521，完成后结束，不新增任务。

657来源Full42184962874的POSIX8真实20分钟超时已由首失败CLI回传，已原入口暂停读回。精确58计划/44完成前缀定位run-max-hp-config-inverse为首未完成：Linux旧254137，当前未观测；Windows完整成功889637.0668。629181截尾不入测量。仅复用既有planning floor加889638跨平台保守分配估计，原平台表/129观测/1.17MB证据/其他floors/17-13/预算/worker/并发保持；预测Win1707732/POSIX1187278含60秒。短历史实验不支持改D5缓存，已停止额外性能设计，只收当前PR521。

本轮最终有界Codex切片已将生成、升级、插牌与完成移回Combat既有选择快照事务，Codex只做开选/校验。固定全图333模块1920引用；Combat SCC82→81、内部626→623位置/402→400对，Session15/62/41不变。原Act2遗物及Codex晚失败回滚通过；完整图和源码身份见docs/evidence/m7-final-core-20261106.json。独审/实际合前后Full仍待，不勾交付AC。

最终本地完整收据补证：新8/8及原35-owner4/4通过；V4/Codex两个独立旧新VM合计79完整状态图检查点、每侧52,016,680字节一致，含V4直接execute付款后和伤害后部分写入、原错误对象。当前候选只提供本轮集成，不另开PR；独审及实际Full/队列/合后证据由主控同一候选绑定，AC仍不提前完成。

奖励查询职责切片已实做六处调用归属迁移，三provider与Run事务不改。fresh完整333模块5386/5386测量：Combat81/623/400保持，Session15/62/41→15/56/38；1920引用位置不变、全图唯一对1546→1548是目标分流，CC>15=237、CC>30=58/max75均无降幅。4组独立旧新VM215点、每侧29218426字节全图相同，原卡奖励与商店fixture保留，9项通过；独审建议将3负控绑定完整专属消息，仅复跑该3项通过。源码6项、旧source/库存42项、旧m7来源1项全绿。最初stale deferred已精确移除且保留原败；UI窄测首次缺生成theme，补正常build:theme/build:ui后原两项通过。完整文件真实wall50215.1983ms保留为50216ms本地planning下界，不冒称Hosted或当前更强断言版本整文件重测。独审/精确提交/正常门禁继续，未合并不勾AC，不用设备、不重复Full。

职业药水已按真实队列宿主反转 Orb 能力依赖，仅三生产源。完整333模块实测 SCC81/15→80/15，Combat内部623→619位置、400→398对；CC>30=58、最大75保持。13份既有药水场景双VM完整图一致；独立冷加载/动态能力/异常/队列/回滚探针通过。历史来源桥与最终提交验收继续，证据见 M7-CLASS-POTION-ORB-BOUNDARY-20261108.md。本轮仅本地保存，不重试被拒的远端公开上传；未提PR/合并/设备验收，AC不勾。

本片源码/来源独审通过；保留真实交付阻断：180000ms本地保守floor使旧基线POSIX13含60秒预留1205745ms超过1200000ms，当前校准7/8。一次只读模拟证明拆文件后理想均分仍超限，故未拆测试或调低floor/预算，不碰在途CI切片。新专项17项最近全通过，历史来源与CI消费者57项通过；无托管Full、PR或合并。

2026-11-08 本地整合职业药水与三项职责片，完整333模块/5401测量：SCC81/15→80/15，CC>30为55、CC>15为234、最大75，14旧告警不新增。POSIX13完整成本含预留超8051ms，改共享POSIX14后余73955ms，Windows17余76023ms；全部10项floor、原预算/并发/worker保留。组合47项行为及窄门禁最新通过，ci-runtime遗漏floor计数原失败保留并定点修复。独审与最终身份记录见附件；未上传、PR、Hosted Full或合并，AC保持未验。

WatcherAttack 已改由 queued-play 显式提供延迟 Actor 算术，完整333源/5387测量：Combat SCC81/623/400→80/619/396，Session15保持；CC>30仍58、最大75，不计CC收益。73项不同定向测试最近通过，原失败与未删减报告保留；30秒本地floor后17/13预测均在原预算，POSIX余5794ms。仅本地保存及独审，不重试公开上传、未PR/Full/合并，AC不勾。见 M7-WATCHER-ACTOR-BOUNDARY-20261108.md。

2026-11-08 本地合流 35850732 与 Watcher 28c4881f，保留双方源码、来源和真实耗时。新鲜 333 模块 / 5402 测量，Combat SCC 81/623/400→79/615/394，Session 15 保持；CC>30 为 55、CC>15 为 234、最大 75，14 旧告警。完整 754 JS/1402 Lua、11 项 floor，Windows17/POSIX14 含预留余73055/70385ms，仅规划。独审发现的单片 config 混合 owner 缺口已先红后绿修复；当前组合及历史来源、行为与门禁定向通过，原失败保留。仅本地合流，未上传/PR/Hosted Full/合并/设备验收，AC 不勾。见 M7-WATCHER-REFACTOR-INTEGRATION-20261108.md。

2026-11-08 七项接续#560当前基线a0c35db8，338模块全源同算法实测SCC70/11/2→68/11/2，大环521/330→513/324位置/依赖对；CC>30为46→40、>15为221→216，最大61、14旧警告保持。5555/5555测量，10个本地重构生产源逐字保留，其余主线源码不覆盖。行为首轮78/79，唯一旧333模块库存断言已保留原333+明确5个主线新增并定点通过；CI104项、关键变异4项、原生UI6项通过，Full未重复。完整库存782JS/1408Lua规划在原目标内，保留19项floor和既有执行保护；独审和精确提交身份见本轮附件。全部历史任务计划/证据保留；尚无本提交托管Full、合入或实机验收，owner/status/AC不变。

最终补记：来源定向106个不同用例已有最新通过证据，初次79中3个测试适配问题已定点纠正；独审通过代码/来源安全边界复核，精确提交身份另存。按真实证据补3项成本floor，原19项不变；17/14完整库存含60秒预留最大1771239/1179021ms，原目标余28761/20979ms。后两项仅成功测试用例成本下界，非全文件实测；原失败/中止均保存，不伪称Full。

发布前develop前移至#561b7ed1830，无src/data/scripts/config变动。本轮在新隔离树保全其全部档案及更强历史来源/退休安全合同，仅解决7个非生产文本冲突；45变动owner鲜读与旧epoch linked owner检查并存。最终单父基于b7，原a0度量和320独审按原身份保留；仅定向helper/负控复验，不重复完整行为/工程采集，不改owner/status/AC。

Owner要求集中减负：2026-11-10旧PR/分支入口已关闭或清理，唯一剩余组合入口#607，CI减负入口#606。完整来源、精确SHA和恢复方法见docs/backlog-details/INTEGRATION-CLOSEOUT-20261110.json；10份M7独立切片只是保全待接续，未进入主线，UI组合也未验收。沿集中入口处理，不为同一来源再开平行PR；当前未勾AC和状态保持。

清理期间另一执行线新增#608@ce10c988，也已完整保全到.archifacts/integration-20261110-policy-followup.bundle及归档ref，统一从#607/本任务接续。源任务编号与本轮TASK-74.22可能冲突，后续需CLI核对编号，不直接覆盖任务。

2026-11-11 保护调用依赖门禁已实做：直接全局pcall/xpcall的静态函数及显式错误处理器纳入原初始化调用图，原12项10过2失败，修后架构/质量等三文件28/28、共享9/9；独立14项Fengari配对通过。345模块/1953引用完整架构报告前后逐字相同，生产Lua不变，不报解环/CC收益。别名、全局重绑定和多返回handler仍明确未支持；原执行误写和报告边界保留。正常CI/精确独审准入及合后验收待，owner/status/AC保持；见新增附件。

2026-11-11 架构导入登记窄修复完成：原型继承属性不再冒充源码或生成模块，只有两处 own-property 判定变更。原版9过1败、修后四文件35/35；独立探针复现12种旧误接纳并验证真源码/生成及环保留，无未解决发现。当前345模块/1953位置完整报告逐字不变，生产Lua零变更，不宣称解环或CC降低。保留原始失败；正式HEAD CI/队列/合后push仍待，不重复Full、不改owner/status/AC。详见M7-IMPORT-MEMBERSHIP-20261111。

2026-11-11 两个架构门禁已在#622接续组合：源码/回归为#619与#622增量并集，两侧31份文档/证据及2063份历史证据逐字保持。定向三文件29/29、正确共享入口9/9；独立24组交叉探针与基线重算完整图345/1953/0均通过。生产Lua、来源、库存和预算不改；未宣称解环或CC收益。精确远端独审/正式CI与原队列后续继续，未重复Full或操作GUI；详见新附件。
<!-- SECTION:NOTES:END -->

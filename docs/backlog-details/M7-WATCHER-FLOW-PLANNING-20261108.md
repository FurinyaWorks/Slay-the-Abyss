# Watcher Flow 动作计划职责（本地切片）

基线为 `7821a7f44b518c09f6b565860e04e4823bc95153`。本轮只接续 TASK-74.20，未领取新任务，避开 #564 来源修复、#565 UI 和既有未发布切片；未上传、提 PR、合并或重复 Full。

## 实现与实测

`abyss_watcher_flow_cards.M.planEffect` 按普通伤害、姿态、X 费用、Power 和弃牌回收分为五个具名纯计划职责。原宿主仍执行动作和提交状态。保留每次公开槽读取、验证先后、原异常对象、目标别名、Collect 回调后 free 标志读取及 TOP/BOTTOM 顺序；所有其它函数与卡牌数据逐字保留。

- planEffect CC32→12；五 helper 为6/3/8/6/5，全部加入原 CC15 硬门禁。
- 同算法全库338模块，5555→5560完整测量；CC>30从40→39，CC>15从216→215；最大61、14条旧告警保持。
- SCC仍为68/11/2；大环513个位置/324个依赖对，全图1929条引用。不宣称降环。
- 334组独立旧/新VM，668个before/after完整图检查点、每侧2,015,159字节一致，包含普通字段、别名、metatable、环、动态读取、回调及异常。原28组真实Combat回归两侧通过。
- 最终专项11/11、零skip，含6个由具名行为断言检出的合法语义变异。完整文件51,775.185427ms，仅为本机定向耗时，不冒称Hosted成本。
- 独立复审另做137例完整图双VM探针，无运行时阻断发现。原架构和静态门禁均通过；完整质量报告为report-only，不代替Full。

## 保留失败与交付边界

首轮9/11：新测试误读discoverSources返回值，以及damage负控在具名断言前访问nil。定点修正后又发现合成CC消息替换表达式错误，修正并复验；最终11/11。未放宽产品断言、时间或现有门禁，原失败日志保留。

**尚不可合并。** 当前生产完整树仍由共享historical epoch绑定旧Flow源码，窄测 `combined epoch authenticates the complete current production tree` 已真实失败。独立单源inverse只证明完整字节身份，尚未接入历史链。`tests/helpers/combined-epoch/source-epoch.mjs` 和 `tests/helpers/copy-integration-source-closure.mjs` 同时由 #564 修改，本轮未抢改。后续在其稳定基线上新增最外层Flow epoch，将Flow加入完整current树及鲜读owner并集，再登记认证隔离闭包；保留所有历史archive、旧SHA及负控，并复用 #564 的隔离reader。不得从live仓库给隔离测试补缺。

新专项51.775秒明显高于既有unknown JS10秒，后续集成必须登记不低于51,776ms的本地规划下界并验证完整库存预算；本轮不改共享timings或降低成本。withCards CC32和既有Actor依赖继续作为明确残余。Hosted Full、正常准入、实际合后及官方/设备验收均未完成，任务AC不勾。

机器汇总及压缩原始报告、日志、独审证据见 `docs/evidence/m7-watcher-flow-planning-20261108.json`。独审结论是本地职责切片通过，不是合并许可。


## 共享来源集成补记

在 #564 `50584b5d6ebc6812bedb3a644e9eec13d2cb90cb` 上接入已保存切片 `c24ef4e02173d2a160382f09d32f2dec82eed5fc`（本地 cherry-pick `b0d2020f40aad599f6d3be9fefdb763a945997ac`），新增完整字节认证的最外层 Flow epoch，并登记隔离 helper 闭包。上文的共享来源阻断现已解决；保留冻结源码、所有历史 archive、完整前驱元数据和原负控，不从 live 仓库补隔离依赖。当前46个鲜读owner、339个非空生产绑定独立核对一致。

- 原来源回归45/45，新epoch最终5/5；新epoch首轮4/5因前驱缺少mode/rawGitBlob失败，补齐完整元数据后原断言通过，失败日志保留。
- 当前组合行为11/11，完整单文件55,667.073989ms；规划下界上调为55,668ms，旧51,776ms和原始来源继续保留。
- CI库存/成本定向41/41；完整库存784 JS、1409 Lua，含60,000ms预留的Windows/POSIX预测为1,775,788/1,183,709ms，仍低于原1,800,000/1,200,000ms目标；不改变worker、并发、截止时间或质量合同。
- 独立来源复验12/12、CI定向4/4通过，reviewId为 `/root/integrate_recovered_work/review_flow_integration`；原始评审不改写，具体身份、摘要和实测索引见 `docs/evidence/m7-watcher-flow-integration-20261109.json`。

Draft PR发布仍待完成；#564仍是前置依赖，其已报告CRLF失败未解决。以上只证明本地来源、行为及规划集成，不代表Hosted Full、实际合并或官方/设备验收；未重复Full、未合并，TASK-74.20负责人、状态及AC保持原状。

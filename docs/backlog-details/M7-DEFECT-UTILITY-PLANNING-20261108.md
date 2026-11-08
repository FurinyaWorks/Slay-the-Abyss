# M7 Defect utility 队列计划职责

本地基线为 develop `d8a57cae2a867200ca8e588abc0d368e6cdb3799`。本轮已核开放 PR #541–#558 和本地 `12950b1c` 的写入范围；本片不重复其产品改动，不改 Actor、Combat 或既有独立片。TASK-74.20 原 owner、状态、AC 保持。本片尚未上传、提 PR、托管 Full 或合入 develop。

## 实际职责

只改一个产品源 `abyss_defect_utility_cards.lua`。原 `planEffect` 混合充能球派生、目标意图、X 费用及出牌历史四类规则；将其分别交给 `planOrbEffects`、`planIntentDebuff`、`planEnergyEffects`、`planHistoryAttack`。公开 API、卡数据、prepareEffect、动态字段读取、错误和非修改计划均保留。X 的真实扣能与 TOP/BOTTOM 入队仍由原 Combat host 完成，没有新队列、缓存、状态 owner 或依赖注入层。

剩余 SCC 的小切口已核：Utility/Watcher 的 Actor 准备能力、PowerSchedule→PowerOrder、Nemesis ownerEnd 调度等需触及已占用 owner 或改动直接调用 ABI；本轮不以孤立删边伪造解环，采用可独立交付的高复杂度职责治理。

## 同算法完整指标

- 333 个生产模块，测量 5386→5390，全部 AST/W561 一一对应。
- `planEffect` CC37→8；四 helper 为 15/7/11/4，整个 utility 模块所有函数及初始化块 ≤15。
- 全库 CC>30：58→57；CC>15：237→236；最大 CC75 不变。
- 含延迟导入的 SCC 仍为 Combat 81 成员/623 引用位置/400 模块对、Session 15/62/41。没有 SCC 收益声明。
- 全图 1920 引用位置/1546 模块对；14 条历史 Luacheck 告警保持，无新豁免。

完整采集与摘要在 `docs/evidence/m7-defect-utility-{baseline,current}-engineering-20261108.json.gz` 和 `m7-defect-utility-planning-20261108.json`。

## 验证与保留失败

- 新专项文件 11/11：完整旧源 SHA256+Git blob，独立双 VM 的185例计划/输入图/动态读取/原错误对象对照，未修改的52例实际 Combat 回归在旧新实现各运行一次，六个真实语义负控和整个模块 CC15 完整测量。
- 来源与库存组合21/21，包括原35-owner完整、反复读取、临时隔离副本及漂移负控；随后最终 CI 库存与 floor 合同18/18。
- 首轮专项9/10的 FTL 队列变异在断言取字段时先触发 nil-index。增加存在性检查使其由具名语义断言捕获；窄重试1/1及完整专项11/11通过，未删除变异。
- 首轮历史来源因新源码身份失败，首轮 CI 因新增库存5项失败。只加入完整来源精确逆和明确 post-placement 库存，原历史字节、owner读取和全部测量保持，修正后通过。失败原件保留在工作区。
- 新测试实测15,812.642915ms，规划以20,000ms本地 floor保守计入。旧9项floor、hosted测量、Lua安全、预算、并发和worker均不变。747JS/1403Lua完整库存下，Win17含60秒预留余87,211ms，POSIX13余7,333ms。仅为规划，不是托管成功或平台性能证据。
- 全源工程采集、JS语法、四项关键变异及定向门禁执行结果见本轮收据。没有重复 `npm run check` 或完整回归。

## 独审与边界

独立评审以6,825例递归动态读取差分验证产品，并以16项独立探针验证完整来源身份和读取边界；无产品缺陷。最终范围以独立评审收据与本地提交绑定。

Backlog doctor exit1 的历史重复ID/旧 completed目录提示保留，未擅自运行修复。未勾任务AC；没有实际合并、官方导入、真实ready、设备验收或发布许可。此前公开上传拒绝未重试，也未换工具绕行。

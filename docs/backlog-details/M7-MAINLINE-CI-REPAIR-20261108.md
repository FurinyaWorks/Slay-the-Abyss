# b7ed1830 合后 CI 的部分修复

基线为 `b7ed18307e0be318ccd112aaa142e5ca4c191696`，原始 [Quality 42437108038](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42437108038) 的 Windows/POSIX 失败均保留。当前连接器只返回第一页 30 个作业，其中 22 个失败；[原始失败摘要](../evidence/mainline-ci-failures-20261108.json) 不冒充全作业盘点。

## 实际修复

- 5 个隔离 source 测试原来只复制 facade 入口，漏掉 `epochs/`、manifest 和冻结证明依赖，因 `ERR_MODULE_NOT_FOUND` 根本没有运行漂移/删除负控。复用既有哈希认证闭包复制器，同时复制本轮真实 Lua/config 依赖；所有 owner 从临时目录读取。保留 Actor/Potion/Reward 原有盘上漂移、删除与证明破坏断言，Act1/Watcher CRLF 用例补上真实隔离 owner 的漂移与删除，不能回借 live 文件。
- Reward VM 原先把完整当前模块数写死为 333，338 模块时在执行前中止。保持原切片 A/B：两个独立 VM 使用完整当前依赖，仅 old 侧的三个 reward owner 换为已 SHA/blob 认证的 before 源。新验证逐文件核对完整清单、hash/字节数，双方差异必须恰好三个 owner；四组完整图仍逐字节相等，三个具名语义变异仍须命中指定断言。Buffer 比较用 `equals`，避免失败时展示巨大 diff 耗尽内存，比较内容不变。Run SCC 允许实际缩小，但保留原 15 成员/56 require 位置/38 模块对上限，并验证查询能力不能进入事务环。
- 7 份预算合同精确承接已公开独审的 `c29a4cff`；当前文件与起点 `cc4cce70` 逐字相同，#560 漏掉后续合同修复。[原交接](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/541#issuecomment-6703864925)。当前 runner 先经既有完整 SHA 和每次鲜读 policy SHA 认证，再逆投影执行原 30/60/120 分类断言；历史 oracle、显式 timeout 和原场景保留，增加分类漂移、覆盖显式 timeout、漏 wrapper 负控。未改执行阈值。

## 验证与边界

- Node 24.22.1 云隔离树；托管 CI 使用 24.18.0，未宣称等同 Windows 实测。
- 5 个隔离用例：原先 0/5，修复后 5/5；叠加 #562 已审源码树也 5/5。
- 预算原失败 7/7；修复后 25/25 定向通过，含实际 runLua/mock spawn 预算传递和错误路径。未重复昂贵历史回放；一次扩大历史合同选择无输出而取消，不计通过。
- Reward 全文件 9/9 通过：四组图、三个具名变异及两项架构合同。独审建议保留原 SCC 上限后，受影响两项架构合同再次 2/2 通过，未重复图回放。
- JavaScript syntax、diff、Backlog 范围、指引检查通过。指引首次因稀疏工作树遗漏 `.codebuddy`/`.cursor` 失败，补齐同一提交文件后通过，未改指引。
- 三个 source 合同文件整体仍为 12/27，通过的隔离用例不掩盖 15 个既存失败；#562 叠加也存在。包括旧 owner 次数/配置身份合同与 retirement 错误标签，以及 shared facade 对 unknown+invalid-reader 和输入 JSON token 布局的真实兼容性缺口。共享 facade 属于 #562 的协调者，本切片不并行修改。
- 预算政策实际为 90/120/180，#541 已明确该迁移。本轮不是再次扩预算，也不证明历史 Sapphire 超时根治。本次已见 Lua 耗时基本仍在旧额度内，但失败 JS 之后的 raw Lua 未完整执行，不推断恢复旧预算安全。
- 未运行本地 Full，未改生产 Lua、质量脚本、执行预算或 workflow；Hosted Full、当前精确 HEAD 的准入、合并及官方/设备验收均待。TASK-88 保持 In Progress，不勾未证明的 AC。

## 新基线接续

发布前 #563 六个 2D 说明文件与 #562 七项重构已合入 develop `7821a7f44b518c09f6b565860e04e4823bc95153`。本切片 19 个路径与该基线增量无交集，无冲突线性接续，15 份测试代码字节不变。最终组合重新定向验证：隔离 5/5（10.166s）、预算 25/25（6.075s）、Reward 全文件 9/9（50.332s）均通过，日志见 [本轮证据](../evidence/mainline-ci-validation-20261108.json)。没有重跑 Full，原残余与验收边界不变。

## 精确来源 facade 兼容补丁

将已独审 `f90dd1ece53bccb1db5684d00c73e5ab65552a4c` 的 22 路径无冲突增量合入本 PR，不另开 PR。先完整保持该片代码字节，再修复发布前发现的输入语法缺口：未知输入保留原 helper 对无效 reader 的透明语义；仅输入配置允许严格 token 相同的空白布局变化，45 个 linked raw owner 仍每次完整哈希认证。Windows 新增 helper/冻结 Lua witness 精确 LF，gzip 保持 -text，不更改任何 proof 字节；core lifecycle 隔离用例改为明确的临时目录 reader。

组合定向：原补丁新来源回归 6/6、五个隔离用例加 core lifecycle 6/6 通过；原三个来源合同全文件从 12/27 改善为 16/27，**仍有 11 项失败**，包括历史 owner 数量/epoch fixture 与 retirement 错误标签，明确留待后续切片。前一轮 39 项证据保持原版本，未重复不受影响的 Reward/预算回放，也未运行 Full。

发布前合成有效 proof 发现通用 projector 会把 `1 2` / `tr ue` 等非法 token 删除空白后误认当前来源，已保留红灯证据。补正仅在配置布局匹配前用 JSON.parse 验语法，仍以原 token 文本比较身份，不重序列化、不放宽重复 key、escape、顺序或 linked owner hash。新增数字、负数、指数、boolean、null 五类负控，原字节透传且零 linked 读取（包含 null reader）。完整新回归 7/7、隔离加 core 6/6 再次通过；原补丁其余 19 文件与先前 15 份测试代码字节不变，原残余 11 项与 Full 边界不变。

## 历史与当前合同分层结清

前述 11 项来源失败已经修复，失败证据仍按原版本保留。原 6/4-owner 的完整源码、精确读取次数、首个错误顺序与所有负控使用已有 manifest 认证的对应历史 after 源，并逐一对原 proof SHA 复核，不改冻结实现或 oracle。当前入口单独覆盖全部 Actor 5、Potion 3、Reward 4 个 host（Reward 与 M7 双入口）及完整 45-owner 集合，逐项破坏、缺失、null、Buffer、throw、原 old/before 场景后都恢复；无效 reader、当前配置布局拒绝、重复读取和历史/当前未知输入也保留。owner 集合从当前 proof 读取，不把 45 写死，未来组合必须重新验证完整集合。

退休合同同时保留冻结 catalog 的原错误与当前准备/执行顺序：准备先验证 leaf，已准备的 cleanup 先验证 catalog；任何一侧失败都不删除任一文件，另验仅 catalog 损坏。别名、重定向和真实盘上漂移/删除负控保留。

Game UI 计时收据另修身份错配：其 346 个输入逐一匹配后来保存的 `3205985a`，记录的是历史 13 项完整测试，不是当前新增保护后的 14 项文件。新增完整历史原文及 commit/tree/blob/SHA 交叉认证，拒绝当前文件或重算摘要冒充旧来源。原 receipt、log、77215ms planning floor、当前测试与执行预算均不改；[来源明细](../evidence/game-ui-planning-source-contract-20261108.md)。

最终限定组合 46/46 通过（3 个 source 文件 33 项，ci-runtime 13 项），无跳过；来源片独立 33/33、收据片独立原 case 及新增身份负控通过。源码、diff、Backlog 与指引检查通过。本节取代“仍 11 项来源失败”的当前状态，不抹掉先前失败，也不代表其余 Quality、Full、Windows 或官方/设备验收通过；没有重跑未改的 Game UI 行为回放、Reward 图回放或本地 Full。

## 剩余 catalog、Defect 与 Power/Shop 来源切片

已在上述最终代码上再次真实复现：catalog/pure-cache 原 17 项有 7 项失败，Defect 与 Power/Shop 两项源码用例都失败。现修复四个测试文件，未改 helper 或生产源：

- Defect CRLF 隔离用例复制经过认证的完整 helper 依赖与当前源码；默认模块相对 reader 和显式临时 reader 都实测文件漂移、删除、恢复，不从 live 树借源码。
- Power/Shop 保留原五 owner 的冻结 after SHA 与完整 before 证明、原错误及配置合同；另外逐一验证当前所有原 host、完整动态 owner 的故障和恢复，以及未知输入、无效 reader 和 linked raw 配置不放宽。
- 原 98fef catalog/cache 用例绑定原冻结 helper，保留所有历史 hash、次数、缺失、别名、重定向、不误删和错误顺序断言。当前完整 owner 矩阵单独使用已有 GameUI/lifecycle before 证明作为独立预期，不以待测函数生成 oracle。
- 逐层验证表明认证 develop 的 config/combat 只到既有 GameUI/lifecycle 中间 epoch，与隔离完整 develop 输入运行冻结 helper 一致；这不冒充原 round-three before，也未扩展共享来源链。当前 retirement 独立检查真实别名、准备后重定向、双损坏先后顺序及失败不删除。

新加完整矩阵首次 23/23 通过但耗时 82.9 秒。实测瓶颈是完整嵌套链每次约 2,567–5,600 次 hash，不是重复磁盘读。发布前只调整新矩阵的恢复组合：全部 host×owner×5 故障和 UI 双拒绝保持，每 owner 完整恢复，config 另外逐故障恢复；首次/热调用完整 raw 序列、原 17 项与退休负控全部保留。两个矩阵从 51.6/25.9 秒降至 11.7/5.9 秒，没有缓存授权或改 floor。

最终四文件只选相关来源用例 26/26、0skip（30.545s），原完整历史 17 项均在内；未选取昂贵 Lua 图回放。另 ci-runtime/complete-timing 合同 13/13。此前失败、首次完整通过与优化后的证据均保留。已复现的上述 9 项来源失败全部解决，但仍等待精确新 HEAD 的 Hosted Full，不宣称整个项目 CI、Windows 或设备验收已通过。

## Hosted Windows 原始收据字节修复

PR #564 的 `b07ff33d` 在 [Quality 42444249243 的 Windows rules 3](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42444249243/job/128619904740) 实际出现两项 `ci-runtime` 失败。GameUI 完整收据与 partial-case 收据的 actual SHA 分别为 `a25cfa…`、`6eb2f0…`，逐字节核对后恰好等于冻结 Git blob 从 LF 转成 CRLF 的摘要。原来的 SHA、时长、历史来源身份没有变化，缺口是四个被原始字节认证的证据文件没有 checkout 保护。

修复仅给两份 JSON 与各自原日志增加四条精确 `.gitattributes -text`，保持原始 Git blob、原 SHA、全部断言、planning floor、运行预算和 workflow 不变，不在校验前归一化字节或重新生成证据。真实 `git -c core.autocrlf=true worktree add` 检出旧头后复现完全相同的两处 SHA 失败（11/13）；检出修复 `acdd0e80` 后原完整 `ci-runtime` 13/13、零跳过，2.634 秒。四个证据文件实际 checkout SHA 全部恢复为原 Git blob SHA，日志也分别通过其原始哈希断言。

这是 Linux 云环境中真实 Git CRLF checkout 的针对性验证，不冒充 Windows runtime、Full 或平台验收。现有 Hosted Full 保持运行收集其他真实结果，没有取消、重复触发或提前 ready；精确新头 Hosted 和正常准入仍待。原失败与实际检出红绿日志保存在本轮证据 JSON 中。

## 同一 Hosted Full 的后续实际失败

保持 `42444249243` 的原 HEAD 运行，按各完成分片的真实日志继续修复，未为每个小补丁重复触发 Full。[本轮定向证据](../evidence/mainline-hosted-repairs-20261108.json) 保留失败作业链接、各版本独审、原红灯与中间失败、最终定向原日志；不以局部通过改写原失败状态。

- Act1 与 EndTurn 的旧 reader/错误合同混入当前 facade。分别恢复精确 `35d392bc`、`3c8b0fbb` 原完整 helper 链，保留原源码、读序、错误、旧 oracle；当前真实 raw-owner 全集另逐项破坏和恢复。Act1 固定历史 45-owner 另认证，当前数量不写死；EndTurn 原 35-owner/40-read 保留。定向分别 5 项与 4 项通过，没有重跑不受影响的行为图。
- Windows 分片测试漏同步 #560 已批准的 `!cancelled()` 语义。旧 `always()` 及完整历史 workflow hash 原断言保留；当前实际执行 aggregate shell，所有非成功分片、impact 失败和未知模式仍失败关闭。Windows/POSIX/impact/summary 合同 19/19，workflow 本身不改。
- 特殊 event JSON 的完整映射没有漏夹具。旧测试误把完整映射当作 90 秒 advisory 必须执行的集合。现在仍断言两个 route 在真实完整图内，未知输入触发 Full、图各根只枚举一次，已知与混合输入的反馈相同；另实证超预算延期、无重复、映射子集和原 90 秒上限。两个定向文件 130/130；选择器和预算不改。
- Ready-art 与 art-feature 的 98fef 原输入误执行当前 helper，native-art 身份及退休错误顺序因此不匹配。复用并逐 Git blob/SHA 认证原闭包，原 2 项、9 项正文与全部历史 hash/别名/重定向/不误删断言保留。当前明确支持的 Host/config 中间目标及完整动态 owners 单独验证；未支持的当前 art 链仍精确拒绝，不冒称整条链可逆。最终 LF/真实 CRLF 分别 7/7、15/15。
- Relic 的隔离测试只改 cwd，但已加载 facade 按 import.meta.url 读取 live 树。现真正加载临时目录完整原 N35 链，原 31×35 盘上改/删/恢复循环逐字不变；当前 31 个入口对完整动态 raw owners 另做真实磁盘负控。Colorless 原四 owner 的源码/hash/blob、读序、次数和错误独立保留，当前三个入口、三种 reader、完整动态 owners 的五类故障另测。真实 CRLF 检出最终 Relic 5/5、Colorless 7/7。

### 两个经实测的成本问题

POSIX10 在 30 分钟硬守护附近取消；最后完成文件与串行计划指向接下来的 Nodes 配置来源测试，但未捕获托管具体 case/堆栈，不能据空白日志断言卡在哪一项。本地仅首个旧配置 case 就有约 69.8 万次命名 helper 调用、11.97 秒，主要是历史输入穿当前多层 token/layout 投影。改为认证的 113 个原 98fef 输入闭包后，原 5 项正文、87 mutants、全部 hash/缺失/错误断言不减，并明确保留当前支持目标与真实旧链拒绝。最终完整文件 8/8、32.050 秒，低于原 Linux 51.813/Windows 84.906 秒观测权重，未改任何权重或守护。

Relic 的完整旧上下文方案实测 297.716 秒，其中旧 fresh-reader 矩阵占 265.329 秒。原前三项正文及 35/144/151/295 次读取断言不变，仅把历史输入绑定到已认证的原 N35 上下文后，该矩阵降为 10.734 秒。该 target 包含 334 份逐字对应 d8a57cae 的原 Git 输入，另 5 份是既有认证闭包扩展，不称为 339 份 d8 原文件。完整真实 CRLF 文件为 55.010 秒，其中当前动态磁盘矩阵 38.577 秒。原规划 Linux 29.498/Windows 52.731 秒仍低于此次本地结果，这一风险明确保留，未偷偷改 floor，也不把 Linux+CRLF 称为 Windows 性能证据。

Windows Act1 边界 1/4 旧侧、3/4 新侧确实撞到原 30 秒 spawn 限制。一次原预算采样显示 sink 对已 canonical JSON 重复解析/编码约占 1.884 秒；最小修复只消除这段纯重复工作，label 转义、完整 UTF-8 字节、行末、双独立 VM、39 个边界分组、原 30 秒/内存/输出限制均不改。原 142,129,464 字节与候选 old/current 完整 Buffer 逐字一致，3/4 的 127,756,610 字节双侧也一致；framing 探针、原 1/3 两组及三个原语义 mutants 共 6/6。这只证明减少实测成本，不能宣称 Windows 超时已根治，仍须新精确 HEAD 的 Hosted 验证。

本节没有修改生产 Lua、共享来源投影层、冻结 proof、CI workflow、规划权重或执行阈值。所有当前矩阵在本修复树实际覆盖 45-owner 全集；后续 50-owner 架构组合必须再验受影响用例。现有失败 Full、下一精确头 Full、正常准入、合并与官方/设备证据分别保留状态，TASK-88 不提前完成。


### 原 Full 结束与 Roster 剩余分片

原 `42444249243` 已在 2026-11-08 05:27:02 UTC 自然结束为 failure：31 个测试分片中 15 成功、11 失败、5 超时取消；两个汇总按规则失败关闭。本轮没有取消、rerun、dispatch 或提前 ready。完整作业状态及全部 18 份失败/取消日志摘要随证据保存，旧失败不因本地修复而改成成功。

Windows15 明确中断在 `competition-roster-config-composition.test.mjs`，POSIX13 的最后完成文件及串行下一项也指向它。首次 25 秒诊断没有有效结束采样；修正的 15 秒连续 V8 采样实际看到 token 正则与 `sameConfigLayout → preCombinedSource`，最后读数 280，不称为数十万读取。现复用 113 项原闭包，仅加 12 项认证输入（9 个现有引用、3 份原 helper，压缩 4,654 字节），125 项全部逐一匹配原 `98fef95d` Git SHA256/blob。原 5 项连续正文和 258×4＝1,032 个原变异逐字保留，当前完整动态 owner、首错、恢复和独立 develop 目标另测，不支持的旧桥仍明确拒绝。

Roster 完整 LF 8/8、71.677 秒；真实 Git CRLF 检出 8/8、74.827 秒，均零跳过，独立复审通过。原 Windows 217.707 秒、Linux 173.509 秒规划观测与执行守护不改；本地结果不冒充 Windows 性能认证。


汇总另有八项 checkout receipt 报错，经只读实证并非新的收据缺失：失败分片令 metadata 校验先失败，`publish-full-quality` 因此不加载收据，后续校验空对象产生这组连锁诊断。实际 `quality-42444249243-1-check` artifact 未过期，ZIP digest、run/head/base、测试 merge tree 与父序全部匹配；用实际 API 元数据直接验证为 `receiptErrors=[]`。只读重放逐项重现原 27 个错误且零 artifact 请求，反事实全绿元数据可走完真实收据加载但仅为模拟。既有 publisher 回归 16/16，未改门禁、workflow 或诊断代码，不把模拟称为托管通过。


Windows2 明确在 `run-max-hp-config-inverse.test.mjs` 超时中断，POSIX2 的串行下一项也是该文件。RunMax 同样复用 113 项精确原闭包，不改任何 shared helper 或吸收未合入的旧 kernel 提案；原 5 项正文、107 个变异、全部 hash/错误断言完整保留，另测当前完整动态 owners 与独立 develop 目标。最初外部 120/180 秒诊断短窗口均未完成，这不是仓库门槛，日志保留。按原执行约束自然完成后，LF 8/8、286.420 秒，真实 CRLF 8/8、288.242 秒；原 107 个变异分别占 250.304/249.832 秒，均零跳过。

上述 RunMax 用时高于旧 Linux 254.137 秒观测，仍低于既有 Windows/跨平台规划 floor 889.638 秒；没有改 floor 或任何执行阈值，也没有把本机结果等同于托管超时根治。当前源闭包和原历史合同均通过独立复审；新精确 HEAD 的 Full、正常准入与合并仍待。

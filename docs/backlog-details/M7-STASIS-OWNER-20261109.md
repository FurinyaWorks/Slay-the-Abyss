# M7 Stasis 死亡升级能力边界

## 实际职责与范围

本轮协助既有 TASK-74.19，保留 Furinya、In Progress 和未验 AC。鲜查 develop 仍为 `7821a7f4`；先以该提交建独立树，再接续已审 Formation/POSIX15 本地组合 `4a51905537fa223e5df4e5ee475152c8a6629af5`，不修改其他工作树。前置 #575 已发布为 `280b85b4671c988329d19dc4c7760aa374f13a27`，tree `68923d8953196009b5c8f14229f9e8db0d384279` 与本地前驱相同，发布本片使用该远端父提交。

Actor 的既有 `queueDeathPower` 负责死亡检测、Power 获得顺序、复活/重访和反应入队，现在显式传入惰性的同步升级能力；Act2Powers 只传递该能力，Stasis 继续拥有卡牌托管、满手判断和 Master Reality 准入。只改三份生产 Lua，不新增服务、注册器、状态缓存或生产回退导入。

Combat 仍在旧准入点之后解析；先读 `canUpgrade`，返回后再读可能被替换的 `upgrade`。同步升级及其错误、部分写入发生在构造和入队 `stasis_return` 前。保留 `#hand == maxHand`，不改为大于等于。Combat/Actor 公开接口不变；两个内部 Stasis 帮助函数明确增加能力参数。完整旧源按基线 Git 字节、SHA256 和 blob 冻结。

## 完整测量与反回退

- 新鲜固定工具采集 338 模块、5605/5605 测量，架构无错误，14 条既有 Luacheck 告警不增。
- 核心 SCC 68→66，恰好移出 Stasis 和 Act2Powers；内部引用 513→506，内部依赖对 324→317。另两环仍为 11/2 成员，内部引用 44/2。
- 全库引用位置仍 1929、依赖对仍 1558。没有减少全库依赖总数，也没有声称消灭 Actor 所在环。
- CC>30 仍 33、CC>15 仍 209、最大仍 61；本片不宣称复杂度分布下降。新增升级 helper 实测 CC2，显式纳入原 CC15 门禁及嵌套覆盖；Actor 恰为 1000 行，原上限不变。
- 边界整文件 2/2，通过 18 项真实 AST 反向依赖变异及 helper/嵌套复杂度负控。额外直接和传递的延迟回导同样拒绝。

## 行为和历史来源

- 行为整文件 3/3，墙钟 11903.071ms；371 个输入前后 hash 一致。独立旧/新 VM 覆盖 8 个边界场景、动态公共方法、懒加载、错误对象/返回项、部分写入，以及完整原 `death_power_order` 的 11 组场景与全图轨迹。五项真实语义变异被指定断言拒绝，超时或解析错误不计 kill。
- 原 Act2 enemies、Stasis source order、death power order、Plated Armor queue 四个完整文件 4/4，Node 30517.106ms。其 2785 项宽输入收据诚实保留 `inputHashesMatch=false`：并行历史适配只改了不被本轮调用的 actor-damage-parity 帮助脚本。补充审计确认 139 项静态模块引用闭包及其他全部输入不变；该审计不是运行时 loader trace，没有重贴为整个宽集合完全相同。
- 当前来源增加四路径精确 outer epoch，保留 339 项完整前驱及全部历史 metadata，当前鲜读 raw owner 为 53。旧 51-owner facade 完整冻结，不缓存 owner 授权。
- 来源 5/5、原 Formation 11/11、实际 facade 消费者 16/16、Actor/Combat/status-view 历史回放 4/4、旧 live reader 三项 3/3通过。旧 Actor 回放装配准确的旧 Powers/Stasis 配套，不改冻结 Lua、原断言或生产 fallback。
- 来源整文件的宽输入收据也保留同一个无关 Actor damage parity 并行编辑；CI 的窄收据仅绑定实际来源模块闭包，原始宽收据完整保留，不声称全部宽输入一致。
- 开发用 Actor damage parity 脚本也保持版本配套，但本轮只做语法验证，没有执行其完整开发回放。

行为与边界收据记录的是已捕获输入集合，不是穷尽递归导入。行为收据缺少 build-lua-data 的两个间接 JS 输入；边界收据缺少 build-native-candidate 的五个 art 间接输入。独审已明确指出，原收据、规划 floor 与其 hash 不重写。`receipt-scope-correction.json` 列出遗漏路径；当前 CI 的 3561 输入收据另行完整核对，不把一次收据的范围扩给另一轮。

新 Stasis 冻结源码、helper 与证据增加精确 LF/二进制属性，确保 Windows autocrlf 不破坏原始字节合同；不改变任何既有路径的换行规则。真实 Git autocrlf 检查 88 个当轮文件；其中检查脚本随后归档为实际执行的 -f 修正版，原被检查字节及单独说明均保留，其余 87 个不变。该检查不冒充 Windows runtime。

## 成本与交付

当前完整库存为 803 JS / 1410 Lua；仅追加三个真实完整文件的规划 floor，原 32 项 floor、unknown10000、17/15 分片、并发12、Lua worker2、预算及 60000ms 预留全部保持。含预留预测 Windows 1796375ms，余 3625ms；POSIX 1131411ms，余 68589ms。它们是规划值，不是 Hosted 或端到端实测。

原 800 库存的 1794163/1128812 预测及更早失败证据继续明确保留，不把新库存误塞入旧断言。7 个完整 CI 消费者 85/85，通过时 3561 项输入前后 hash 一致，墙钟 58990ms；11 个导出来源投影函数与完整前驱的结果及异常等价。静态影响闭包 523 个测试并不表示全部执行。

生产/冻结来源先本地保全 `369b1884c6857c793faf403228acefbb50153b4e`，tree `b3bd403f21e869e3a69b89d441708c1ec8c38e9c`；它只是检查点，不是完整交付身份。最终提交另绑定全部历史、成本、审查和证据文件。

独立最终局部深审 PASS，未解决发现为空；未发现生产/架构缺陷，另验证 Combat require 抛出表错误时的完整旧新状态一致；2093 份既有历史文件逐字未动，371 行为输入复核一致。CI 与独立最终局部复审已收口，精确提交身份及发布回读继续绑定同一轮。

Backlog 范围与指引检查通过；doctor 仍报告 5 组既有重复 ID，保留 exit 1，不算全绿。全部证据见 `docs/evidence/m7-stasis-owner-20261109/`。初次边界测试策略字段错误、来源测试错误地把合法 JSON 末尾换行视为无效、CI 探针的 import.meta.url 装配错误以及没有完整原日志的终端转录均分开保留，不虚构原始收据。

保持原正常准入：#564 管理员队列入口及前置链仍待；旧 Full 绿灯不覆盖本片。未重复 Full、未 ready/入队/合并/部署，未绕过质量门禁，也没有使用用户电脑或 Codex。前置实际合入后仍需鲜查 develop，并对最终精确 HEAD 执行原独审、Hosted Full、正常准入和合后目标分支验证。

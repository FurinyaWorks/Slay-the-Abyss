# Enemy AI 与已有职责片本地合流

## 范围与保全

最新远端 develop 仍为 `d8a57cae2a867200ca8e588abc0d368e6cdb3799`。核对 18 个开放 PR 完整文件清单，本组合九个生产改动文件与它们没有交集。继续现有 TASK-74.20 指派，不新领任务、不改 owner/status/AC。

保全合流本地 `126e5f9c`（Scry、Shivs、Act3 AI、职业药水与 Watcher）和 `1f454854`（Enemy AI）。333 个生产文件逐一验证为两父分支的精确字节并集；4499 个生产、旧测试、fixture、helper 与历史证据文件逐一核对 Git blob。共享静态门禁取并集；Enemy initialize 的 CC21 残余来自原已审切片，不是本轮放宽，新 helper 仍受 CC15 门禁。

全部原规划下界、平台实测、unknown 成本、安全成本与旧纯投影 helper 保留。新增完整字节双向 planning 层可以精确恢复任一父分支时点；旧断言继续核对原时点，当前三项下界并集另行验证。旧 Watcher/potion 两项规划测试起初按预期拒绝未知组合，保留失败日志后只在其输入增加精确完整字节投影，未改旧 helper 或删断言。任意漂移不能进入历史时点。

## 本轮新鲜测量

基线和组合分别在隔离树重新采集，不将历史数字相加代替测量：

- 333 模块，5386 → 5410 完整测量，无缺测；原 14 条静态告警无新增。
- Combat SCC：81/623/400 → 79/615/394（成员/内部引用位置/唯一模块对）。Session SCC 保持 15/62/41。
- CC > 30：58 → 53；CC > 15：237 → 233；最大 75 保持。相对 `126e5f9c`，Enemy 贡献 CC > 30 减 2、CC > 15 减 1，不增加 SCC 收益。
- 全图 require 位置 1920 → 1919，唯一模块对 1546 保持；即时和延迟边全部计入。

组合工程报告在提交前采集，revision 字段是父 SHA；完整模块与输入哈希绑定真实被测字节，不冒称父提交的源码被测得这些组合数字。

## 定向验证与预算

Enemy/Watcher 行为 21/21，通过原旧新 VM、读取/写入/RNG/别名/失败合同及语义负控。队列 roll/status 与真实 Act3 Shapes/Orb Walker 四份 Lua 集成合计 70 组通过。没有重复职业药水大图或 Full。

共享 CI 21/21、分片/队列合同 53/53、M7 原来源 1/1；来源首轮 25/27，修正两项历史规划输入后两来源文件与实际 delivery 测试 48/48，所有来源测试均有本轮通过结果。原生 UI 离线合同 6/6，四个指定变异均被断言杀死；不代表全库 mutation score 或设备验收。data/theme/ui 构建、工程门禁、guidance、verify:backlog 通过。doctor 仍为原五组重复 ID 与 legacy completed 目录问题，exit 1，不算绿。

完整库存 755 JS / 1403 Lua，12 项规划下界。Windows 17、POSIX 14、Lua worker 2、并发 12、预留 60000 ms 均保持。含预留预测 Windows 1729245/1800000 ms，余 70755 ms；POSIX 1131758/1200000 ms，余 68242 ms。旧 POSIX 13 仍超 14202 ms。这只是规划，不是 Hosted 观测、Full 通过或合并准入。

## 交付边界

仅本地合流、提交与独立审查。此前公开源码/规划上传被拒后未取得新授权，本轮没有重试、换渠道上传、创建 PR、触发 Full、挂自动合并或合入 develop。没有用户电脑/Codex/GUI、官方导入、真实 ready 或设备证据，M7 及任务 AC 不提前完成。

完整报告、原失败日志、预算分配、开放 PR 占用与保全清单：`docs/evidence/enemy-integration-20261108/`。根收据：`docs/evidence/m7-enemy-ai-refactor-integration-20261108.json`。最终精确 commit/tree 独审另存，避免自引用。

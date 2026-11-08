# Scry 确认职责分层

基线：develop `d8a57cae2a867200ca8e588abc0d368e6cdb3799`。接续 TASK-74.20 的既有 M7 工作，不新领任务、不改变 owner/status/AC。

## 问题与边界

`Scry.choose` 原先以一个 CC38 函数同时处理陈旧 token/牌堆检查、用户选择解析、Weave 队列前提、弃牌及回调提交。验证先后决定拒绝原因，提交先后决定回调所见状态和失败后的部分写入，不能改成无序表分派或提前清理 pending。

本片仅改一个生产模块 `abyss_scry.lua`：
- `allowedCandidates` 验证候选仍对应当前牌堆，保留原短路和读取顺序。
- `selectedCards` 验证数量/UID并收集原卡引用，严格保留选择顺序。
- `hasWeaveQueue` 单独判断这次确认是否需要 Weave 动作队列。
- `discardSelected` 提交弃牌并执行原 Corruption/Accuracy 和事件回调。
- `choose` 保留 token、错误返回、最终 pending 清理和队列协调。所有验证仍在第一次移动之前完成。

不改变 begin、公共表/元表、动态方法槽、require目标、事务 owner、数值或随机算法。原 `piles` CC19 未处理，继续完整报告，不将其隐去。

## 不重叠核对

实时读取十个开放 PR：#543、#545、#548、#549、#550、#551、#553、#554、#555、#556，并核对本地全部工作树生产差分。没有其他切片修改 Scry。CI与静态门禁、TASK-74.20是共享登记，后续合流须保留并集，不能覆盖另一片的合同。未重试被拒绝的 Act3、中毒或药水发布，也未动用户电脑或 GUI。

`task:pick` 返回 HOLD，因为 TASK-74.20 已在进行中；本片是 Owner 明确要求持续治理的既有任务接续，而不是重复认领或改变任务状态。初次新树因继承 sparse 设置暂缺 backlog，补齐本树检出后完成上述检查，未修改其他树。

## 完整指标

固定 Luacheck 1.2.0、完整 AST，保留匿名函数、初始化块、即时和 deferred require边：

| 指标 | 原 | 本片 |
| --- | ---: | ---: |
| 手写模块 | 333 | 333 |
| 完整测量 | 5386 | 5390 |
| CC > 30 | 58 | 57 |
| CC > 15 | 237 | 236 |
| 最大 CC | 75 | 75 |
| choose | 38 | 10 |
| 新四 helper | 无 | 11 / 9 / 7 / 8 |
| require 位置 / 唯一对 | 1920 / 1546 | 1920 / 1546 |
| Combat SCC 成员 / 内部位置 / 唯一对 | 81 / 623 / 400 | 81 / 623 / 400 |
| Session SCC 成员 / 内部位置 / 唯一对 | 15 / 62 / 41 | 15 / 62 / 41 |

五个职责及其嵌套函数进入原 CC15 硬门禁，并测试超标及缺失必须失败。原14条告警、质量阈值和全部旧门禁保持。完整未删减工程报告在同名前缀 baseline/current gzip，不能只看上述摘要推定全库通过。

## 验证

- 原 `watcher_scry` 18项、Run scry事务2组及 `watcher_flow_build` 28项通过。一次误写不存在的 watcher_flow_weave 路径未执行，失败原文保留，随后只运行正确28项，没有重复已过部分。
- 新完整测试8/8：两组旧/新独立VM逐字图对照；三项真实语义负控分别在旧/新源码执行。
- direct 147点、213153字节；真实Combat事务8点、400827字节。图保留状态、别名、返回、table错误、回调、队列和RNG；完整图与摘要均已归档。
- 包含 token/draw/count/UID 的拒绝优先级、零/多选、Weave缺队列及召回、真实buff、动态替换、元表访问、逐阶段部分写入、真实出牌后续回滚和再次恢复。
- 只映射已验证完整错误字符串 `src/lua/abyss_scry.lua:103: missing scry events` 到新113行的同文错误；没有一般性剥离位置或错误文字。
- 原 before 全文同时核验 LF SHA256与Git blob；不改旧 fixture/source-inverse/history。静态及既有 M7 合同25/25、CI库存8/8通过；另一次定点调用只实际执行2项，未匹配来源测试的空文件结果不计有效覆盖；未重复Full。
- guidance与backlog范围通过；Backlog doctor仍为基线已有5组重号，exit1，不宣称通过。

本片完整测试外部 wall 2360.894ms，低于现有 unknown 10000ms；保留原保守未知成本，不伪造Hosted记录、不降低九项旧floor，也不改17/13布局、worker、安全分类或超时预算。当前Full发现新增文件，旧年代库存只在历史重建中排除它。

证据：[机器收据与原始日志](../evidence/m7-scry-choice-responsibilities-20261107.json)。独立深审收据在精确提交冻结后另行绑定，不能在提交内循环宣称自身SHA已审。正常首次Draft、远端精确HEAD独审、CI、merge:auto及合后验收分别完成；本文不宣称已合并、已发布或实机验收。

# EndingHistory 胜利身份职责接续

## 范围与来源

本轮恢复已公开但未提 PR 的 `feat/m7-ending-terminal-responsibilities@57b277154ef1239fae4bcc4420607e01464f612c`，保留原提交，与最新 `develop@ab65ed3b5b4240eb653af4651a13c1b8c72b2e04` 无冲突合流。原 Winding 成果仅剩空分支，本轮不重复其实现。现有 TASK-74.20 仍 In Progress、负责人 Furinya、AC 未勾，不新领或复制任务。

只拆分 EndingHistory 的既有 terminal 判定：登记 run 身份、ending flow、boss result、地图来源及唯一结局节点。原 flow/result 在身份校验前的快照、短路读取、错误对象、持久化调用、Run/Host owner 和玩法全部保留。没有新增职业或第三幕内容，没有修改身份剩余规则。

## 本轮真实验证

- 固定 Luacheck 1.2.0、完整 AST 与同源采集：338 模块，5604→5609 项完整测量；terminal CC39→5，五个 helper 分别8/8/7/13/7，并纳入原 CC15 硬门禁。CC>30 为33→32，CC>15 为209→208，最大61；原 identity CC17 残余明确保留。
- 1929 个引用位置、1558 个依赖对及完整 SCC68/11/2 逐项不变，不宣称消环。14 项原静态告警不变，没有扩大豁免。
- 三个新完整文件首轮28/28通过：两独立 VM 各831个完整状态图检查点，原 ending_history 与 ending_history_host 断言保持；10个具名真实语义负控全部检出，不用超时当 kill。
- 完整旧源码 Git blob、52-owner 当前来源、LF/CRLF、暖读污染、缺失/无效reader与独立闭包检查通过。原冻结来源不刷新。
- 指引、Backlog 范围和 diff 检查通过。首次指引检查因稀疏工作树缺 `.cursor` 输入失败，恢复当前基线原文件后通过。Backlog 原5组重号仍存在，未自动修号。

原始日志与机器清单在 [本轮证据](../evidence/m7-ending-terminal-20261110/README.md)。独立审查和新增 CI 成本登记另在该目录记录，不能以本节局部通过代替最终准入。

## 交付边界

仍需最终源码/成本/历史消费者独审、精确 HEAD 的正常 Hosted 检查、原生合并入口及实际合后验收。本轮不重复整套 Full、不手动重跑或分派、不操作用户键鼠、不运行官方客户端、不发布游戏；官方导入、ready、PC/手机和产品验收均未执行。

## CI 成本与独审收口

三项新测试分别完整实测14/14、11/11、3/3。行为较慢成功27,752.824ms期间只有属性文件变动，明确保留为不稳定输入；稳定复测22,608.061ms不覆盖较慢样本，规划取保守27,753ms。来源18,865ms；复杂度1,049.912ms保留unknown10s。四个受影响CI消费者分别完整实测，并登记6个真实local floor；原全部托管测量、旧floor、预算、worker、并发和17/15形状不变。

最终注册后四个完整CI文件64/64通过。当前803JS/1410Lua独立库存与原800历史合同分开核对；Win含60秒预留为1,798,303ms，仅余1,697ms，POSIX为1,133,696ms，不能将规划当Hosted运行安全。当前精确hash测试在真实autocrlf checkout仍保持LF原字节，未放宽raw hash。

独立审查复核35项原集成消费者、11项Formation前代以及16旧入口×2输入×52owner共1664次暖读污染拒绝；CI10个完整before/after来源及6项receipt hash另核对。最终独审结论、精确提交和正常托管状态以PR及证据记录为准。

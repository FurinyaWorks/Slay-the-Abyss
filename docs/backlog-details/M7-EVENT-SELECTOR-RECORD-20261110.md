# TASK-81.1：纠正已合选测修复的任务记录

## 结论与边界

2026-11-07“未发现实现提交或在途 PR”的看板结论不成立。五个事件源码输入的相关选测漏边已随 [PR #525](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/525) 合入 develop。当前基线 `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04` 完整保留该实现，不应重新开发或重复领取。

本次只把任务由 To Do 更正为 In Progress，保留 Furinya、原计划、历史记录、AC1/2 与未勾 AC3。**没有把任务标为 Done，也没有把原交付改成 merged_passed。**

## 已合来源与原失败

- 原独立审查：[完整15文件组合 PASS](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/525#issuecomment-6676527126)，绑定 HEAD `22ba86b15bf1596e6a9ec98cd1c19dc1cd5b1b9d`、BASE `dedb9ed5af52fc595031d64d3e8fd84bc908b2c8`，未解决项为空。
- 原 PR [Quality 42160034221](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42160034221) 成功；原队列 [Quality 42164576994](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42164576994) 成功。实际 squash 为 `c20f9898462194d5f720f901274898e171a17ed5`。
- 该 squash 的 [push Quality 42168995589](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42168995589) **失败**。[原始报告](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/525#issuecomment-6678058788) 记录 Sapphire 准备后剩余预算不足和 Windows5 超时。此历史失败保留，当前后继提交成功不能代替原 squash 的合后验收。
- 本次核对已合祖先与 Git blob：`event-combat-routes-source.test.mjs` 和 `test-affected.test.mjs` 从该 squash 到当前 develop 均逐字未变。

## 当前验证

在当前 develop 的独立工作树执行原两个完整测试文件：**111/111 通过，0 失败、跳过、取消**。没有修改测试、选择器、游戏源码、成本、工作流或门槛。

独立探针使用真实消费者和原选择算法：当前五路径均保留源码合同及已映射 Lua 夹具；只恢复合前消费者后，Colosseum、Masked Bandits、combat_enemies 三项重新漏选，已有 Lua 映射仍保留。该反例证明原修复仍有效，不是因未知输入回退 Full 才得到通过。

另只读核对当前 develop 的 [push Quality 42772190615](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42772190615)：attempt1，17 Windows、15 POSIX 与前置/汇总作业共37项，36成功、预期 fast 跳过；[Licenses 42772190592](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42772190592) 成功。四份真实作业日志明确记录两个目标文件在双平台成功，六个选测回归也均执行。

本次只读 API 运行身份、完整作业表和日志；未下载核验不可变 checkout artifact 的实际 ZIP 字节，不将绿色元数据冒充完整交付验证器回执。没有重新运行 Full、手动 rerun/dispatch 或操作用户设备。

## 剩余关口

AC3 仍保持未勾。后续须由原交付协调按当前仓库规则确定合法的收口证据，不能用后继绿色运行改写 #525 失败历史，也不能为补任务状态而重做已合代码或无目的重复 Full。父 TASK-81 的 Fast 性能与总体交付验收不随本次记录纠错完成。

本次证据：[身份与运行](../evidence/m7-event-selector-record-20261110/evidence.json)、[源码绑定](../evidence/m7-event-selector-record-20261110/source-bindings.json)、[完整定向日志](../evidence/m7-event-selector-record-20261110/targeted.txt)、[双平台日志摘录及摘要](../evidence/m7-event-selector-record-20261110/hosted-test-excerpts.json)。

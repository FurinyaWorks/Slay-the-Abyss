# PR583：WarriorStatus Windows CRLF 语义负控修复

## 范围与根因

接续既有 TASK-74.20 / PR583，不新增任务领取。父提交 `7df12df61e3598224dab8c1830fb7b20c18a9f8d`，develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。

[旧 Full](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42563842632) 的 [Windows 2/17](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42563842632/job/128986606663) 已通过原始 68 图对照和 CC15 检查，前五项真实语义变异也被检出，第六项多行 LF 锚点未匹配 CRLF 检出文件，唯一性断言实际 1、预期 2。该运行另有十二个 Luacheck 安装失败作业和两个失败汇总，不能将整轮失败归因于这一个测试。

本次只在原测试中把**变异输入的内存副本**规范为 LF。原始源码、冻结旧源 hash、原图对照、六个真实变异及具名失败断言、唯一锚点、磁盘不变性和全部 CC 断言均保留；新增 LF / CRLF / 混合换行的轻量规范化检查。生产、共享 helper、来源档案、CI 成本、预算、工作流及库存均不改。

## 本轮验证

- 原 CRLF 磁盘输入先红，复现相同第六锚点失败。
- 最终同一测试文件在 LF / CRLF 磁盘副本各 3/3，仍是 **3 个不同测试**，不重复计数。分别 24,126.455173ms / 5,460.973985ms；较慢值完整保留，不当作 Hosted 速度或预算安全证明。
- 最终每次只执行原六个真实变异；初版双换行逐个执行十二项变异也通过，但为避免增加日常 VM 工作量而收敛，初版两份日志完整保留。
- 独立验证：LF / CRLF 原始 68 图一致；六个真实变异两种换行均被检出，24 个缺失/重复锚点反例均拒绝。最终单六变异版本另经独立定向验证。
- `verify:backlog`、`check:guidance`、语法及 diff 检查通过。Backlog doctor 仍报告既有 5 组重复 ID、93 个旧归档位置，不擅自修理或冒称通过。
- CRLF 磁盘试验后生产文件已恢复，Git blob 为 `9a46b81bee78cfceb7930844121bd56599916460`；所有其他生产路径与父提交无差异。

[索引与原始日志摘要](index.json)记录每份 gzip 的压缩与解压 SHA-256；[独立增量复审](review.json)绑定最终测试及保护路径。独立探针由仓库根目录执行 `node docs/evidence/m7-warrior-status-crlf-20261110/independent-eol-probe.mjs`，仅做离线语义验证，不是正式游戏或设备验收。

## 未完成边界

仅 Linux Node 24.22.1 本地验证，不能冒充 Hosted Windows / Node 24.18.0。原 PR 已记录的 source 文件成本高于 unknown 10 秒、Windows 模型余量仅 4.767 秒的风险保持，未修改或降低成本来掩盖。旧 Full 的安装失败也未在本地测试中解决。

保留 Draft；新精确 HEAD 正常 Hosted CI、独立审查状态握手、原生 Merge Queue 和实际合后验收仍待。未重复本地 Full、rerun/dispatch、修改保护或操作用户电脑，TASK-74.20 状态、负责人及未验 AC 均保持。

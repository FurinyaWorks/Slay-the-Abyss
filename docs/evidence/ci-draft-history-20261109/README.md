# PR584：恢复 Draft/Fast 改动后的历史工作流合同

## 结论与边界

基于 develop `1eb288472d7b33b7450eec97a624ca2ffa526f39` 和 PR584 原 HEAD `53b55d4ddd4ed0f2adc5458e53d7d2da5fab51c3` 接续。当前 Sprint 已过期，自主新任务 intake 为 HOLD；本轮只修复既有 PR，不新增 M7 领取、不改排期、任务负责人、状态或 AC。

原 PR 让180秒成为反馈目标而非扩大测试范围的条件，并将草稿正式 Quality 延后到 Ready。本次修复不改变这些生产策略，仅补历史合同的输入适配。原失败 Hosted Full：[42565230276](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42565230276)；原始诊断与日志链接见 [PR评论](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/584#issuecomment-6733797045)。不借旧成功、失败或跳过结果认证新 HEAD。

## 根因与最小修复

- 新 Draft 条件使原 `beforeExecutionTimeoutWorkflow` 的完整五项匹配失效，旧20分钟、完整工作流与执行余量合同因此报错。
- impact 条件和 `converted_to_draft` 也令旧 Auto-merge 完整块匹配失败，其后平台和工程产物历史投影无法执行。
- 新外层只还原完整且唯一出现的六项已审 Draft/Fast 工作流变更，再进入原历史链。部分、重复和修改过的块保持可见；无关字节不删除。
- 若内层执行余量迁移不完整，返回原始输入，避免只还原外层造成半投影。
- 旧执行余量测试仅在读取边界投影至其真正历史输入；原断言、旧hash、档案、Full矩阵、作业/夹具预算和全部队列准入均保持。

## 验证

环境：Linux、Node 24.22.1。不是工作流固定 Node 24.18.0 的 Hosted 或 Windows 证明。未运行本地 Full，未操作用户电脑或 GUI。

- 原四份策略测试21/21通过，但另外三份完整文件复现4个原失败，保留 `initial-policy` / `initial-history` 日志。
- 修复后原三份历史文件24/24、最终 summary 7/7、calibration/engineering 56/56、runtime/impact/双平台分片/queue/delivery 86/86、platform wiring 3/3。去重为176个不同用例，不把重跑重复累计。
- 新测试覆盖 LF/CRLF、全部63种不完整组合、重复块、政策漂移、无关字节保留及内层原子性。最初两次负控夹具写错定位，一次把空格加在匹配块之后、一次命中较早 rules 门禁；保留两份失败日志，修正定位而非放宽断言。
- 独立复审 PASS。额外逐一改变533个非空工作流行，并检查旧块注入、六块搬移、逐行混合换行和历史幂等性；没有漂移被抹成已接受的完整源。审查绑定最终代码摘要，见 `independent-review.json`。
- 原800 JS/1410 Lua库存及全部时序输入不变。现有完整规划预测 Windows 1,794,163ms、POSIX 1,128,812ms；这是原模型，不是 Hosted 用时证明，不增加未知成本豁免。
- verify:backlog 与 guidance通过。guidance首轮缺失稀疏检出的既有 `.cursor` 文件，补齐原文件后通过，无指导文件修改。Backlog doctor保留既有5组重复ID与旧归档警告，未擅自修复。

`validation.json` 列出每轮完整文件和结果；`artifact-index.json` 绑定所有原始压缩日志及独审文件。原失败、不利观察与未验阶段均保留。

精确新HEAD Hosted Full、正常原生队列及实际合后验收仍待。不直接合并、不绕过独立审查握手，不手动 rerun/dispatch 刷样本；仅允许正常上传触发新HEAD验证。

# 任务准入元数据拒绝歧义

基线 `develop@3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。接续 TASK-87 的现有指引工具维护范围；没有新增任务或重做已合入的指引系统。

## 已复现并修正

原 `loadTask` 对重复 `status: To Do` / `status: In Progress`、缺少结束分隔符、正文中的伪头部和不成对引号均返回可领取记录。真实 CLI 因而输出 ALLOW，可能把进行中工作误作待办。

现在只读取文件首个完整 frontmatter，要求所用字段唯一、非空且为单行标量。空头部不能继续扫描正文，缩进续行不能截断为 To Do，不支持的显式/转义/合并键语法直接拒绝。本工具只解析 Backlog 原生元数据所需的子集，不宣称是完整 YAML 校验器；非原生形式可能保守返回 HOLD。

`evaluateIntake`、Owner 审批清单、状态政策、无日期/里程碑顺序门禁全部不变。未修改 Backlog、共享来源层、生产 Lua、CI 库存/成本/预算或他人分支。没有新增依赖、测试文件或任务锁。

## 实际验证

- 原源码加回归：15项中11通过、4失败，保留 RED。
- 修复后的同一完整 intake 文件：15/15通过，无失败/跳过/取消。独立复审另跑15/15及10项边界。
- 全173个当前 Backlog 文件与原源码逐项比较：元数据、准入决定及理由全部相同。
- 既有 guidance 完整文件7/7通过；guidance、Backlog、network、完整 JavaScript syntax 检查通过，最终两份变更源码再次 `node --check` 和 diff 检查通过。
- 独审第一轮发现空首头部及多行状态漏挡，已修复并增加回归；显式/转义键也已补拒绝。旧阻断记录不改写，最终源码复审 PASS、unresolved=[]，两源码 SHA 见 manifest。
- 相关选测只生成计划，未运行其宽选集。没有重复 Full、Windows、官方导入、ready、设备或合并准入证明。

## 交付边界

本环境没有 Backlog CLI，因此未认领/修改状态或 AC，不声称 TASK-87 已完成。`task:pick TASK-87` 为 ALLOW，仅是只读初筛。当前 gh 未登录，不能执行原 merge:auto 身份握手；提交作为 Draft 交付，之后仍需精确 HEAD/BASE 独审授权、正式 CI 和原生队列，不绕过门禁。

`validation.json.gz` 保存原始各阶段日志和退出码，包含历史失败与独审；`manifest.json` 绑定源码及证据。原始环境路径只用于复核本次本地日志，不是设备或托管验收。

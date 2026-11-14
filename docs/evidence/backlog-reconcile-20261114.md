# Backlog 生产状态对账

基线：`origin/develop@9f2f44e4`。用户明确要求核查 M7、M8、无里程碑旧项、重复实现及新旧方案冲突。

## 已验证交付

- PR634：HEAD `5694b8cd91bdb37d621c0f98735ef0f90891540d`，BASE `3a061a76b5eb917ac0f4213c01a9cbafd28d1824`，实际 squash `903bf2a31e91f10fb24763ab4cea23d586d0bb83`。
- PR Full `43211206190`、merge_group Full `43219327412`、push Full `43229600772` 均 success。
- 本轮原入口 `npm run verify:delivery -- 634 "F:\New folder\.artifacts\pr-cleanup-20261112\auto-merge-634-5694b8cd91bd.json" --merged` 实际返回 `merged_passed`；完整原始采证：GUI 工作树 `build/delivery/bbd96f62-7d15-4932-9139-2b37f349166a/`。
- PR348：实际合入 `c3c1af6b`，合后 Quality `40926116809` 成功；TASK-87 不需要手机验收。
- PR340：实际合入 `ea70cf0c`，原 push Quality `40884875530` 是 cancelled，不追改。TASK-86 采用后续完整集成交付证据。
- PR606/607 合后分别 `42846223187` success / `42878014144` attempt 2 success；旧失败保留。
- PR613：实际合入 `3a061a76`，queue `42955085580` success，push `42964902712` attempt 2 success。差分/Tween 实验 EARLY_STOPPED、两项 NO-GO，不因合并补勾未执行实验。

## 重复工作与损坏记录

- TASK-74.22 仍挂 In Progress/0 AC，但质量棘轮已由 PR634 实际交付。原始来源 `docs/reviews/closeout-20261112/sources.json` 明确 PR616 为 integrated-source。确认的是漏同步及重复领取风险，没有据此声称已发生第二套生产棘轮。
- TASK-81.1 在 11/7 被误判未实现；其 11/10 记录已纠正为实现已合。TASK-87/86 又被笼统要求官方/手机验收，均与自身 AC 不符。
- TASK-74.19：原 `updated_date` 两次分别为 `2026-11-11T09:22:00Z`、`2026-11-11T04:33:00Z`。
- TASK-74.20：原 `created_date` 两次均为 `2026-11-06 01:46`；原 `updated_date` 为 `2026-11-11T10:32:00Z`、`2026-11-11 01:13`、`2026-11-11T01:30:00Z`。
- CLI list/view 漏读上述两份记录，doctor/verify:backlog 却通过。用户本轮明确批准仅规范化两文件重复元数据；保留最初创建时间及最新更新时间，正文、AC及证据逐字不动。原字节仍可从本基线 `git show 9f2f44e4:<原路径>` 恢复；之后所有任务更新继续通过 CLI。

## 本轮验证

- 原质量棘轮、quick-feedback、Backlog、task-intake 四文件 95/95 通过，0 skip，Node 24.18.0；真实 CC16/匿名借债/SCC/提交源绑定及零语料 IO 负控均执行。
- 首轮 TEMP 写入 EPERM、缺 Luacheck 和一次本机超时保留为失败；安装固定 SHA Luacheck 后，将进程 TEMP/TMP 指向本工作树 `build`，同原用例全部通过；没有放宽预算或删断言。
- `verify:outcome` 返回 DIAGNOSED / productStatus UNVERIFIED；诊断机制完成不认证产品、官方或手机通过。

逐项处置和剩余范围由 Backlog `doc-27` 与任务本轮 notes 记录。该文只保存技术证据，不另建任务事实库。

## 最终队列与机制验证

- 新核准收口 13 项，连同原 68 项，共 81 条 Done 经 CLI 移入 completed；15 条未来/被替代/停止实验归档。
- CLI 活动任务 175→82，进行中 30→5；另恢复此前漏读的两份任务，并新增本轮 TASK-87.1。不能把两个计数当作同一完整集合直接相减。
- 实际 GUI `GET http://127.0.0.1:6420/api/tasks` 与 CLI 均 82 条，ID 集合完全相等；页面 HTTP200。最终活动状态为 To Do 77、In Progress 5。
- 新机制三文件最终 102/102，通过且0跳过：`sprint-intake.test.mjs`、`backlog-roadmap.test.mjs`、`delivery.test.mjs`。
- 相邻交付协议 96/96，通过且0跳过：`auto-merge.test.mjs`、`merge-queue.test.mjs`、`merge-queue-admission.test.mjs`、`pr-quality-evidence.test.mjs`。
- 默认 Windows CLI 适配器初次将数组表达式作为单一参数传递，真实调用失败；改为变量 splatting 后，实际 TASK-87.1 写入及 JSON 读回 `cliWriteReadback:true`。测试没有依赖已安装 CLI 的伪 mock 冒充这个边界。
- 独立复审 `ses_e27453480ffeyQKlk8niIDnqTF`：发现并修复旧任务快照覆盖、completed 诊断门禁遗漏、替代引用读回、部分失败重复备注及承接元数据损坏。最终针对性复核解除原 P1，无新的阻断。
- 旧 marker+后续 Blocked+AC不变的真实 Git 反例先 RED，修后 GREEN；旧 marker 本身不授权写入。重试只接受已有 `build/delivery/backlog-<PR>-<merge>.json` 中记录的同 HEAD、声明与完整任务/承接快照摘要；正文、状态、依赖、路径任一后来变动均拒绝借用。该文件只是本地可恢复步骤的交付证据，不另管任务状态。
- `verify:backlog`、doctor、guidance 通过；变更没有游戏Lua、棘轮阈值、工作流权限或新增后台轮询。当前新机制尚未提交/合入远端，不把本地对账当作已经部署，也未为它声明 Hosted Full 通过。

## 第二轮纠正：待验不是未开始（当前有效状态）

用户继续指出 M7 和其他已开展任务被错误留为 To Do。上一节的 77 To Do / 5 In Progress 是第一轮快照，不能作为当前状态；将“没有执行者正在施工”误用为“整个任务未开始”，是本轮明确修复的语义错误。

- 逐项通过 CLI 读取全部77条旧 To Do。M7的74/74.19/74.20/75/81/81.2/100/101均有已实施、测量或交付证据，先恢复In Progress；加上103，M7现9项全部In Progress。
- 其余已开展的61项恢复In Progress；19、74.1、4.19虽然0项AC通过，技术附件/候选/provider仍有实际进展，不据AC未勾误判未开始。25.5/89原“未发现实现”备注与同任务已记录回归相矛盾，一并纠正。
- 85/96/97/62/64按既有明确审批政策标Blocked，保留原成果、依赖和未勾AC，不凭用户要求清理看板解除批准限制。
- 仅4.2、42、90保留To Do，分别缺本项正式背景装配、当前候选完整PC设备矩阵、非瓶装限制调查的已开展证据。各项已写明理由。
- 当前82项：In Progress74、To Do3、Blocked5；CLI与实际GUI的ID及status集合一致。全部创建时间不改，状态整理未补勾验收。
- 真实GUI资源 `/chunk-2ft9tqrz.js` 的卡片底栏渲染为 `I(Z.createdDate)`；详情独立显示 `Updated`。因此卡片的“three weeks ago”是创建时间，不能当作最后更新时间。API已读回M7的createdDate与updatedDate分别存在。
- `verify`处置修为In Progress/待验，不再退回To Do，且不得隐式解除Blocked；现有Backlog检查拒绝To Do与待验标签矛盾。两条新反例先2/2 RED，修后原三文件104/104通过，0跳过；doctor、verify:backlog、guidance、syntax通过。
- 同一独立复审 `ses_e27453480ffeyQKlk8niIDnqTF` 针对本轮语义做7组只读断言/检查及M7/0AC抽查，结论可接受、无阻断；未声称逐份独立审完77项所有历史证据。
- 后续仍沿TASK-87.1的集成AC：当前工作树本地修改未提交或合入远端。本轮没有新增玩法、设备实测或Hosted Full完成声明。

## PR 集成交接授权

用户随后明确要求将本轮任务整理及反复确认的全部机制一起提交、推送、创建PR并挂原生自动合并，供后续人工核对版本号与发布内容。当前版本规划仍沿真实生产提交、任务AC及候选证据，本次状态收口不把历史实现算成本PR新增玩法。

准备PR时发现清理型PR已通过CLI移入completed/archive的记录也需要合后对账，补充显式 `recorded` 只读处置：沿同一Git快照与Done AC校验，不重做归档/移动/备注。新增反例先RED；此处置不修改活动状态、不勾AC、不解除审批。当前新实现仍由TASK-87.1跟踪，合后验收前保留AC5未完成。

精确提交4ce7c397的独审进一步复现25.3/61/64三个当前任务与既存同号历史归档的快照冲突。合入树选择现与工作树选择一致：当前/completed优先于同号旧归档，权威范围内重复仍拒绝；三个真实ID的隔离Git回归先RED再修正，历史记录不删改。

同轮推送时GitHub返回改名到Slay-the-Heavens；`/repositories/1429751262`及两个旧repo API实际都返回 `FurinyaWorks/Slay-the-Heavens`、同一数字ID。补登记该精确名称并以固定ID拒绝fork/旧名被占用，保留历史收据见证，不修改保护、CI权限或Git远端配置。新增改名/原文/错误ID负控先RED。

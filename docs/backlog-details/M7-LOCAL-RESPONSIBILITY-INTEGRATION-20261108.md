# M7 三片职责本地整合

接续 TASK-74.20；本轮入口和收口两次读取远端 develop 均为 `d8a57cae2a867200ca8e588abc0d368e6cdb3799`，16 个开放 PR 的 head 未变化，三个生产文件未被占用。公共静态门禁、CI 库存和任务记录与多个在途 PR 有共享写入范围，本片只整合下述三个本地来源，不宣称已兼容或合入其他 PR。

## 来源与整合方式

- Scry：`68f6b914b15cc2189399b2a82b28fcdc677bbec4`。
- Shivs：`8d3ce9db78408640430be9ef619ace54e5c3721f`。
- Act3 AI：`4fe31ed4a3aa240cc21e438dceb04483e5e4337c`。

三个生产文件、冻结旧源码、专属测试和原始证据共32个独有文件，均与对应来源提交逐字节一致；三个 before fixture 与 develop 原始生产源码一致。来源分支和工作树保全。四个公共文件按并集整合：保留 Scry 五个具名职责及其嵌套函数 CC15，保留 Shivs 和 Act3 AI 全模块 CC15，保留全部原门禁和三片新增门禁测试；CI只登记三份新JS文件为未测成本，不刷新历史记录。TASK-74.20 的原计划、历史注记、三片记录与文档引用均保留，通过 Backlog CLI 追加本轮记录；Furinya、In Progress、四项未勾 AC 不变。

## 本轮重新采集

基线和集成源码在隔离工作树采集，不借单片报告作本轮通过依据。完整机器结果见 [整合证据](../evidence/m7-local-responsibility-integration-20261108.json)，完整原始采集见同目录的 baseline/current engineering 压缩报告。

- 333 模块；5386/5386 → 5399/5399 函数及初始化块完整测量。
- CC>30：58 → 55；CC>15：237 → 234；最大 CC75 不变。
- Scry.choose：38 → 10；Shivs.startTurn：33 → 6；Act3 AI.advance：46 → 14。新增 helper 均≤15。
- SCC 仍为81模块/623引用位置/400依赖对，以及15模块/62位置/41对，循环依赖降幅为0；全库1920引用位置和1546唯一依赖对不变。
- 14项原静态告警不变，无新增豁免。完整静态门禁通过，职责测量1769 → 1805。

## 定向验证与独审

三个新差分套件及公共门禁共49项最终通过，三片完整旧新图合计2048个逐侧检查点。首次Scry Combat因当前工作树未生成 abyss_data 失败，补跑原 build:data/theme/ui 后只重跑Scry整文件8/8通过，未重跑全部49项。其余首次通过结果保留。Act3既有集成13/13通过；Scry、选择事务、Weave、Shivs、Master Reality五个完整Lua夹具通过。CI库存及历史成本17/17通过。

独立审查在另外的隔离快照同时切换三个生产模块的旧/新版本，213个组合完整图检查点一致；公共门禁/历史库存27/27通过，无阻断项。审查ID为 `local-independent-integration-20261108-213graphs-27gates`，最终head/base/tree绑定由外置独审收据记录，不将单片旧审查冒充集成审核。

guidance、verify:backlog通过。新工作树因稀疏检出缺少两个原有指引入口，首次guidance失败；补齐原HEAD的.codebuddy/.cursor文件后通过，未修改门禁。Backlog doctor仍报告原5组重号并退出1，未处理、不计为通过。一次临时规划脚本错误地修改了后续分片的初始负载，该结果作废并保留；最终规划采用原测试中的固定初始负载和双worker排程算法。

## 成本与未完成边界

当前749个顶层JS及1402个顶层Lua保留完整库存。三个新增JS仍按每文件unknown10秒计入，无伪造Hosted观测；原9项floor、worker2、并发12、平台预算和60秒预留不变。Windows17片含预留最大1712826ms，余87174ms；POSIX13片1193435ms，余6565ms。POSIX余量较窄，但这里只是规划，不能保证托管耗时。

此次没有任何远端写入、PR、Hosted CI、Full、合并或合后验收，也没有用户电脑、Codex、官方导入、ready或设备证据。此前的公开仓库源码/规划材料上传拒绝没有解除；不重试、不换路径、不删掉被拒文件规避。未来若获得有效授权，仍须按原流程执行精确远端HEAD/BASE独审、完整Quality与merge:auto准入。M7整体验收和任务AC保持未完成。

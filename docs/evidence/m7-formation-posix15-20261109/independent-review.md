# Formation 与 POSIX15 真实合并独立审查

独立评审标识：Formation–POSIX15 independent merge review, 2026-11-09。评审者未参与生产或两个共享 CI 文件的实现；仅写本目录的 independent-* 证据。

## 结论与范围

**局部 PASS，无未解决源码问题**：两侧整树保留、四个文本冲突的解决策略、完整来源投影组合、旧797与当前800库存的明确区分、当前17/15规划及严格 CI 消费者合同均通过本轮独立审查。未发现放宽预算、降低 floor、删原断言、隐藏原失败或让历史来源接管当前执行的变更。

**整体准入仍 BLOCKED / 未验证**：本轮没有实际 Hosted Full37、远端当前 Ruleset/原生队列准入、精确最终 HEAD 的正常合并资格、develop 合后 Full 或官方设备验收。局部 PASS 不授权 ready、入队、合并或发布。提交前的本报告以文件摘要绑定候选；最终提交/tree须由独立只读 attestation另行读回，不能将旧HEAD冒充最终组合。

## 精确原始身份

- Formation父：d21be2fb2d84f68767c3b1ef827b61a2b63aa323，tree a46ccfe3fe820617290aa1d3b9aae2ba345dd671。
- POSIX15父：841510b78172b923b1a613216b5c3dcb2c3e062e，tree aabc61f3140e9e4803f3017dbaaa14b4b6ae7692。
- 共同基线：fb04fd36ab4fbdba71c0da08bf71d2899143f69b。
- 本评审独立读取本地 Git 原始对象，核对父/tree/merge-base。远端父身份核对由协调者另行完成，不把本地对象读回当远端发布证明。

## 整树与历史保留

按共同基线、两份完整父树为每个非冲突路径计算三方合并期望，再直接对工作文件计算 Git blob：**8125个非冲突原路径全部一致，0漂移/遗漏**。包括全部338生产Lua、331冻结夹具/压缩来源档案、1633原 evidence 文件。原Formation生产、门禁、timings以及POSIX15入口/消费者均保留各自已发布父的字节。完整记录见 independent-original-preservation.json。

只存在四个共享修改路径：.gitattributes、TASK-74.20、ci-complete-calibration.test.mjs及其source-inverse helper。属性文件保留两侧全部原行，只新增本轮证据的LF/二进制约束；任务通过Backlog CLI保留两侧计划与原叙述，未提前勾AC。两个CI文件的解决没有整段择一覆盖。

原Formation四份行为/来源收据的363、60、60、60个当前输入再次逐项核验相等。这支持保留其原运行结论，不是本轮重新执行行为、全源度量或双VM。原14片超预算、首次冲突语法失败、组合首次41项39过2败（旧797/1126323与新800/1128812混用）均保留真实日志与hash，未改为成功。

## 组合来源与断言深审

共享helper相对Formation父只增加POSIX15 import及preCurrentCiPlacementSource的精确外层投影调用，原Formation完整投影继续保留。POSIX15仅识别精确path和完整after SHA，返回冻结14源；Formation仅识别自己的完整源身份。两者不刷新旧archive、不使用通用删floor退路，不参与真实执行入口。

冻结阅读层依次恢复Formation、POSIX15与Defect前层；当前库存、timings、matrix及规划仍用真实disk/import。旧797测试明确使用Formation冻结完整库存及冻结timings，继续验证14和15两种原规划；新800测试单独验证当前全部文件。对旧797的修改是明确历史来源，不是把当前800悄悄过滤成旧库存。原预算失败仍在新800的14片负对照中可重现。

独立加载三个原始父/基线helper的完整源码，只重定位相对module URL，不改可执行投影逻辑：28个完整来源、全部11个导出函数、合法/未知epoch、LF/CRLF、字节漂移、外来path、非字符串及错误结果共**13455次等价比较**通过。另17个直接桥拒绝负控通过，包括改Windows/POSIX片数、降低真实floor/unknown成本、删旧floor与原型路径。36个相关输入执行前后相等。见 independent-merge-probe.mjs、independent-merge-probe-receipt.json及日志。

作者双边界证据也已审读并核hash：28完整来源4370比较；3488个当前完整文本在两个placement入口共6976比较。回放记录的19个来源输入及3488文本当前均无漂移。反向静态闭包91测试仅代表字面导入依赖，**不是91文件全数执行**；计算/模板导入不在静态证明范围。

## 当前成本、覆盖与保护

独立重新发现800 JS与1410 Lua；Windows17/POSIX15的JS分配及Windows17两worker的Lua分配均完整恰好一次。37个当前Full作业身份来自共享shape，不以伪造jobTotal放行。

含原60000ms预留的规划：

- 当前800：Windows17为1794163/1800000ms，余5837ms；POSIX15为1128812/1200000ms，余71188ms。
- 当前800的POSIX14仍为1205156ms，超原目标5156ms。
- 冻结797：POSIX14为1202485ms，POSIX15为1126323ms，原超2485ms历史可复现。
- POSIX总规划工作量15994730→16032072ms，仅增加三个Formation文件有效成本37342ms；14/15重新分配不降低总工作量。当前总量即使理想均衡也需要至少15个原预算窗口。
- 原30项floor完整保留，加Formation两项后32项；Defect89852/13784、unknown10000及所有实测地图均未降。行为7322的本地floor仍受10000未知文件下限约束。

Windows17、max-parallel12、Lua两worker资格、1200000/1800000性能目标、60000预留、POSIX30分钟与Windows45分钟执行防卡死保护均不变。workflow、dispatcher、sharder、Lua runner、timeout policy、Full/queue publisher、delivery verifier与共同基线逐字相等。只通过中央shape把POSIX14改为15，没有降低保护或新增执行特权。

独立调用真实fullGateErrors、queueFullErrors、verifyDelivery及verifyMergedDelivery，以四个正对照和**40个合成负对照**验证：缺15片、额外片、旧14全绿、错HEAD、错run、重复片、伪造总数、failure/skipped/cancelled均被拒。它们证明本地validator，不是实际远端作业或Ruleset状态。

Windows规划仅余约5.8秒是需要保留的风险信息，不是新增放宽预算的理由；本轮没有证明Hosted实际耗时。

## 已执行与未执行

独立实际执行：上述13455来源等价、17直接桥负控、40 validator负控、完整分配/规划与字节/收据核验。未重跑昂贵已稳行为或Full。

作者当前**23个完整定向文件245/245**、0失败/取消/跳过，101267.758538ms。独立核对压缩与解压日志、计数、命令及前后3576输入相等；其中3575运行相关输入与当前完全相等。唯一当前差异为ci-verify.py后加“必须新输出目录”保护；实际执行的原wrapper已完整冻结在ci-verify-executed-source.py.gz，其解压SHA与原收据相等。该安全包装改动没有改测试命令/快照/结果逻辑，不冒称执行后源码全未变。

完整边界见 independent-receipt-audit.json。未执行：Hosted Windows/POSIX Full37、完整91文件来源闭包、缺pwsh的原下载测试、全量行为/双VM/复杂度再采集、平台导入/ready/设备体验。#574原缺pwsh失败及中断证据原样保留。

## 交付边界

本轮恢复的是当前POSIX规划目标内的真实组合和局部合同，不是凭旧CI绿灯证明新HEAD可合入。保持既有Strict、原required contexts、independent-review/pr-quality、Squash/ALLGREEN、无bypass及精确SHA/真实checkout收据合同；本评审没有修改远端保护。协调者应在形成最终提交后核对双父、tree和文件摘要，再按原Draft流程发布。本报告不代替正常精确HEAD/基线准入。

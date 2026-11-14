# 独立评审协议

## 任务与写权限

|任务|审查范围|仅允许写入的独立分支与目录|
|---|---|---|
|胡桃机制独立评审|第一性原理/因果假说、玩家主动选择、启动摩擦、半血/回血反激励、单点依赖、角色循环|feat/hutao-v6-review-decisions-20261114；experiments/characters/hutao-v6-lab/reviews/decisions/|
|胡桃平衡独立评审|生命/能量/牌差、自然获取、跨战/营地、支配与冗余、循环滥用、实验方法与留出验证|feat/hutao-v6-review-economy-20261114；experiments/characters/hutao-v6-lab/reviews/economy/|
|胡桃呈现独立评审|卡面/实际效果一致、灰牌理由、完整交互、命名来源/人物表达、桌面与窄屏|feat/hutao-v6-review-presentation-20261114；experiments/characters/hutao-v6-lab/reviews/presentation/|

以上报告分支在首轮实际执行时才从已读精确实施提交创建；此文件不声称它们已存在。审查者不能修改实施代码、作者状态或其他审查结果。作者只读取、登记、修复；不合并任何评审分支，不替审查者签字。

## 冻结与独立性

先从 STATUS.json 找当前 candidate_id 与 immutable source_ref/source_blobs；读取实际冻结源码而非可变HEAD。报告至少记录 task_name、真实run标识（若宿主不提供则明确 unavailable，记录任务身份与执行时间而非编造）、role、candidate_id、source_ref、source_blobs、checked_at、method、commands/seeds、findings、evidence_paths、limitations、verdict。每项发现包含 severity、复现输入、实际/期望、事实或设计判断、建议及反例。

先独立看规则/代码/交互并形成发现，再读作者论证和其他审查意见，保留两阶段原始记录，减少锚定。不同任务运行的评审是自动审查，不冒称真人或不同模型；作者切换口吻不算独立执行。必须同时有独立身份和同源码证据，字段齐全不自动等于审查真实。

结论：PASS_FOR_CANDIDATE / CHANGES_REQUESTED / BLOCKED。不能运行则将对应动态项BLOCKED，不把静态阅读写成实测。不得编造截图、网页交互、官方来源、人审或CI。基线审查通过不意味着新候选通过。重大规则变化使之前评审过期；仅报告/文档追加不自动改变规则身份。正文若与manifest不一致，停止并报SOURCE_MISMATCH。

## 实验不可偷换

A/B相同敌人、输入状态、抽牌/奖励seed与策略计算预算；预登记训练/留出seed，不根据候选结果挑样。单卡人工手牌与自然抽取、强制胜利与真实胜利、静态收益与实际结算必须分别记。付血、敌伤、治疗、溢出治疗、营地机会成本单列；无条件下限、条件加成、可打率分别评估。无状态不能打与能打无收益不能混成一个指标。

至少检验保血、防守持续、主动付血爆发等不同策略，不能让脚本强制使用E再宣称E合理。看首轮/首场、跨战、少奖励/坏抽牌、低血/满血、成长/爆发、零费/回能/抽牌循环。胜率需样本数、失败与不确定性；指标改善不自动证明有趣。

## 来源与文案

继承P1官方战斗>P2官方人物/语音>P3有据文化武术>P4少量原创；降级要检索与否决记录。P3真实术语不是直接照搬的卡名。分别核官方原文/改编身份、人物气质、效果对应、同池区分。用户已否决名称不可复活。自动审查结论不能变成人工批准。

## 资源/停止

低并发离线增量，不跑共享Full CI、不抢前台/设备；不创建PR、入队、auto-merge、合并、Tag或发布。不修改主线/发版与正式资源。无新快照不重复工作、不发用户通知；成熟验玩由作者一次汇总。READY_FOR_OWNER_PLAYTEST后各任务暂停等用户反馈；合并仍需新的明确授权。

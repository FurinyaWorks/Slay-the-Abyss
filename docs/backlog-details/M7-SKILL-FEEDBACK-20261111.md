# M7 已提交事件反馈分类职责

TASK-74.20 的有界接续，基线为 develop `3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。核对开放 PR 与本地全部分支后，`abyss_skill_feedback.lua` 从 #449 起无其他在途修改；不重做已有 EndingHistory、RelicPending、PotionText 切片，不触碰 #620、#618、#622、CharacterProfiles 和 V25 UI 的占用。

## 实际变更

只把已提交事件反馈的三种职责分开：事件/显式效果优先级、敌人意图与效果回退、真实伤害的样式修饰。保留重复字段读取、Lua 短路顺序、未知 truthy family、nil/false override、damage 早退和 block > buff > debuff。独立 handled 标记区分“未处理”和“已处理但返回 nil/false”。所有输入只读，无 RNG、加载或状态提交。

原 sample / travel / cue 及其注释后缀逐字不变，无新依赖、模块、文案、数值或画面设计。现有静态入口对完整模块（含初始化、全部旧新 helper 和匿名回调）执行 CC15；未放宽既有规则。

## 同算法全库结果

- 345 模块，完整测量 5918 → 5923，无遗漏；resolve CC34 → 5，effectsFamily 19 → 13，完整模块最大14。
- CC>30：34 → 33；CC>15：218 → 216；全库最大72保持，不冒称全部热点已解决。
- SCC 68/11/2、1578 唯一依赖对、1953 引用位置及14条历史告警逐项相同。没有解环收益，不把拆函数说成依赖治理。
- 全量指标、所有函数、输入和工具身份见 [机器证据](../evidence/m7-skill-feedback-20261111/metrics.json) 及原始 before/after gzip。

## 验证与独审

1. 先接入硬门禁，旧 resolve34/effectsFamily19 被真实固定 Luacheck 拒绝；重构后完整 check:engineering 通过，包括4个既有语义变异与6个原生合同。
2. 两个新鲜独立 Fengari VM 在同一场景文件上比较1533条返回值、顺序读取、受控错误前缀，禁止输入写入、RNG与额外加载；6个真实语义变异均检出。原54断言/120生产意图、7个原生反馈回归通过。
3. 现有责任与UI门禁文件24项通过；真实 Luacheck 分别拒绝旧两热点及7个入口/helper超限变异。没有新增 JS/raw Lua 测试文件，原发现集合与分片不变。
4. 独立审查另外执行25938个边界组合、读取metatable及5个语义负控。审查指出新测试的 false 序列被 `and/or` 折为 nil，已修正测试分支并完整复验4/4；生产 handled 语义本来正确。最终精确提交记录另附，不用本说明替代准入。
5. 一个原始 battle-life 历史合同窄测通过，只证明其冻结历史输入，不冒充当前全部来源闭包。SkillFeedback 当前不是共享 epoch owner；本轮不抢改他人管理的来源层、历史档案或成本配置。

## 交付边界

仍需精确 HEAD/实际 develop 的正常 Hosted CI、独立审查准入、原 merge:auto/队列与合后 push。不手动重复 Full，不绕过分支保护。云端 gh 未登录时不能执行原生 merge:auto，不用 GitHub 插件代替这条合并握手。

测试日志记录本地环境实际耗时，不用于宣称提速：source-intent-power-feedback 新4项完整批次有10.314s与复审修正后的54.154s两个观测，后者原有 source-power 用例占48.793s。环境样本不稳定，既有分配10s不是本轮完整托管耗时证据。保留真实收据，由当前 CI 整合者按同源完整成功样本核对成本，不静默修改共享历史预算、分片或超时。

无本轮官方导入、ready、PC/手机实测、容量或发布证据。TASK-74.20 owner/status/全部 AC 保持未完成。

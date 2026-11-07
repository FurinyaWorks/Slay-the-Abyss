# 奖励查询与会话命令的职责边界

接续 TASK-74.19，基于 develop `d8a57cae2a867200ca8e588abc0d368e6cdb3799`。已核14个开放PR和保留的未发布工作，生产仅改 RelicCardRewards、RelicChoices、RelicPending 三文件六处调用，不碰其它切片或Act3交付。task:pick 对既有 In Progress 返回HOLD，本轮是主控指派接续，不另认领；Furinya、状态及未勾AC保持。

## 实际职责变化

三个奖励消费者直接调用现有 RelicQueries.hooks.owns 与 RelicFamilyCombat.common.previewCardReward，不再为了查询和预览加载 RelicHooks 会话命令门面。现有提供者早已将这两项方法映射到同一固定能力槽；本次不改任何provider的公开raw字段、元表或函数实现，每次调用仍读取当前方法槽，不缓存函数。Run 的事务、永久授予与状态提交路径全部保留。

普通动态赋值、nil、恢复、callable table、truthy返回及错误对象身份都验证。绕过门面元表的rawset、替换整个package.loaded或namespace表不属于原固定共享槽合同，不宣称这些操作等价。没有通过新代理表、持久宿主注册或隐藏动态加载来移除依赖。

## 同口径指标

新鲜完整333模块、5386/5386测量，5053函数，没有缺测。

- Combat SCC：81成员、623内部引用位置、400唯一对，保持。
- Session SCC：15成员保持；内部引用62→56，唯一对41→38。
- 全图require位置1920保持，唯一模块对1546→1548是目标分流。即时准入图仍无环。
- CC>15 237、CC>30 58、最大CC75，均不变；本片CC降幅0、SCC成员降幅0。
- 原14项静态告警与所有门槛保留。

[完整证据](../evidence/m7-reward-query-boundary-20261107.json)链接两个未删减、无损压缩的原工程报告，含全部测量和完整AST图。旧基线每个333源hash及Git blob已对真实d8核验，不把旧测量冒充本轮重跑。

## 行为、来源与原失败

4组独立旧/新VM分别从完整333源码快照运行，仅旧侧替换冻结的三consumer。原observer遍历每个字段、别名、元表；原卡奖励和商店fixture保持字节不变。每侧215检查点、29,218,426字节完整图逐字相同；无损图文件保存在证据中，旧/新原过程收据分别保留。

完整行为9/9通过，之后仅加强3个负控与各自完整错误消息的绑定，复跑3/3；没有重复两组大回放。原89个ordinary共享槽合同通过，原两项奖励/商店UI窄测通过。新来源6项、旧来源34项、原m7来源1项，以及成本接入后CI-complete10项、runtime9项全部通过。

新的完整三owner/config outer每次鲜读并核验全部owner，保留unknown/history零I/O、LF/CRLF、旧source chain和四处隔离复制闭包。配置只加这一consumer边界，并精确删除已经不存在的choices→RelicHooks deferred例外，不能通过忽略stale异常放行。

保留所有真实失败：首次库存检查时新行为文件未落盘；最初架构stale例外；UI窄测首次缺正常生成的theme（补build:theme/build:ui后通过）；成本接线临时fixture误改import（修复后原合同通过）。没有改变旧oracle、归档或刷新golden。guidance与verify:backlog通过；Backlog doctor仍报告原5组重号exit1，不计绿。

## 成本与交付边界

首次完整9/9文件wall为50215.198307996616ms、Node为50154.478871ms，新增planning floor为50216ms。收据保存当时完整测试源码、384执行输入、原log和11组进程/manifest，并精确记录后来的断言加强；不声称当前更强断言版本整文件重新测量，也不声称Hosted观测。原9项floor逐字保留，平台实测表、raw安全权重、unknown、17Windows/13POSIX、worker2、并发12、预算和60秒预留都不改。

当前748 JS/1402顶层Lua完整一次分片。原算法含预留预测Windows1714675ms、POSIX1195761ms，POSIX余4239ms；这不是Hosted通过或合并准入。独审须绑定最终精确HEAD；远端正常CI、merge:auto及实际合后验证仍待。尚未合并、没有发版、官方导入或用户设备验收；不重复Full。

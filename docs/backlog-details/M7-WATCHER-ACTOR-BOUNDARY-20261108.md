# Watcher 卡牌规划与 Actor 能力边界

接续 TASK-74.19，基线 develop d8a57cae。已核最新远端、18 个开放 PR 和本地保留切片；避开 #541–#558 的生产文件及 Scry/Shiv/Act3 AI/职业药水整合。只改 WatcherAttack 和 CombatQueuedPlay 两份生产源码，不变牌表、数值、状态提交或队列协议。

## 职责

WatcherAttack 负责独立牌表、Bowling Bash 展开与 Halt 的构造期快照。此前它为 Halt 两次格挡查询加载完整 Actor，进入 Combat 大环。现在既有 queued-play 宿主逐次提供延迟 Actor 能力；规划器在原位置解析一次，仍分别读取两次动态 blockAmount。

Halt 的内部 prepareEffect 接口增加必需 actorHost 参数，唯一生产调用及一处直接测试调用已迁移。非 Halt 不读取该能力。外部两参数 Halt 调用不属于兼容承诺，不能称 API 完全不变。未用全局服务注册表、package.loaded 代理或隐藏缓存，也不把能力保存进游戏状态。

原复制、双输入校验、两次算术和 prepared 写入顺序保持。先前冻结的 M9 协议正文不改写；专属 Halt 对照把历史宿主与完整原 Watcher 源配对，再与当前宿主比较完整状态图。

## 实测

333 模块完整覆盖，5386→5387 测量。Combat SCC 81/623/400→80/619/396（成员/内部引用位置/唯一依赖对），仅 WatcherAttack 退出。Session 15/62/41 保持；全部即时/延迟引用位置仍1920，唯一对1546→1545。

CC>30 仍58，CC>15仍237，最大75。本片没有CC降幅，Halt规划CC9保持；新增宿主函数CC1。原14条静态告警无新增，原门槛不放宽。两份未删减工程报告与源码摘要见证据目录。

## 本轮验证

73项不同测试的最近结果通过，不是一次完整 Full：
- 新边界10项，包括原 watcher_attack_build 23组和 early-turn autoplay 的独立旧/新VM完整图、延迟能力/双动态槽/原始错误对象/事务回滚，以及冻结协议Halt对照。
- 历史来源与新三owner精确桥38项。完整原源绑定 Git blob；每次重新读取全部相关owner，拒绝混合、缺失、重复、漂移，四处隔离复制依赖闭包补齐。
- 当前CI/规划与新增floor共18项额外唯一测试；原M9协议6项（含4个原语义变异）和M7来源epoch1项。

保留原始失败：新图测试把 reviewedDeferred 例外标志误当语法延迟属性，已改为两个真实引用位置及函数内位置；首轮CI18/22后修正新floor的历史投影/当前验证；稀疏checkout补回指引目录后guidance通过。未通过旧失败记录宣称单次全绿。Backlog doctor 仍为原5组重复ID与legacy目录问题，exit1不计绿。任务owner/status/AC不变，只经CLI追加计划/进度。

## 成本与交付

完整本地首次边界文件21763.220989ms（8/9，见上）加新增冻结协议1218.265678ms，以30000ms保守planning floor登记，非Hosted测量。748 JS/1402 Lua全库存，旧9项floor、unknown成本、预算、worker2、并发12和17Windows/13POSIX均保留。含60秒预留，预测Windows1713421ms，POSIX1194206ms，分别余86579ms与5794ms；仅规划，不代表托管准入。

先前公开源码/规划上传被拒，本轮无新授权，不重试或换路。本片只本地提交与独审；未上传、开PR、重跑Full、入队、合并、官方导入或设备验收。后续合流必须保留其他切片的来源桥/库存/floor并集并测实际组合，不能直接累计独立降幅。

证据：[完整收据](../evidence/m7-watcher-actor-boundary-20261108.json)，原日志、全量工程测量与规划在 watcher-actor-20261108 目录。最终精确提交独审收据另行绑定，本文不提前声称完成审查。

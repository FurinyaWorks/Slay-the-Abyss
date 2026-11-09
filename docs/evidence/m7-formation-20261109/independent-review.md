# EncounterFormation 独立职责深审

## 当前结论

生产职责拆分、行为回归、来源 outer 与当前静态门禁独立评审 **PASS**，无未解决的局部源码问题。整体准入仍 **BLOCKED / 未完成**：当前POSIX规划超原预算5,156 ms，精确最终 HEAD 的 Full 与正常准入仍未完成。CI来源、两个floor、补充投影等价与实际消费者验证已核验。此报告不能替代合并准入、Full 或平台验收。

独立审查者：EncounterFormation independent reviewer（非实现者）。执行目录为本轮 `m7-formation` 工作树，未改生产、公共来源或其他工作线，未执行 Full。

## 已验证身份

- 旧完整 fixture 与 `fb04fd36ab4fbdba71c0da08bf71d2899143f69b:src/lua/abyss_encounter_formation.lua` 逐字节相等，SHA256 `de7afe27c70b14e724aa7f0ea67509e41df882e1e055904b82cc7be56916e8ec`。
- 当前生产 SHA256 `c31b3aa4711fcd53613e00e689c5e2ede15ecb0ba2fb89d9fa16b6fb8d3abd63`；与保全提交 `f06295676961417a86226c87b3a453bd84551c53` 中同路径一致。
- 保全提交 tree 经 Git 读回为 `af4b09c2dc9c5fd5935f9228c9cbe9e848003e95`。它不是尚未产生的最终测试提交。
- 审阅门禁 SHA256 `b0beb25d11044e525285d778d60c82a552c31d518228a04f4c3967fe25936066`，明确列入 `M.assemble` 与六个新族函数。

## 职责与行为

1. 固定阵型、形状池、地精池、史莱姆、虱子与混合候选分别归于六个局部责任函数。属于可解释的领域边界，不是隐藏分支或单纯层层转发。各路径未提前读取外部能力，调用局部状态彼此隔离。
2. 支持性检查仍先于 boundary 检查；`boundary.misc` 的两次入场读取与随后局部捕获未改变。`misc.boolean` / `misc.integer` / `boundary.construct` / `boundary.visualFloat` 仍按原时点动态读取，未缓存成新能力表。
3. 构造、随机取样、二进制32位偏移顺序及边界错误的停止点保持。混合阵型全部候选仍即时构造，选中对象不复制。可变 `M.supports` 放行未知值时的 Wildlife fallback 保留。
4. 新函数只产生额外局部调用栈及闭包。没有观察到数据、RNG、选中别名或失败前缀改变；不宣称性能或原生设备已验收。

## 独立已运行探针

- `independent-boundary-probe.lua`：18 阵型 × 3 模式，共1,884次旧新执行、888对逐外部边界失败前缀。检查返回表身份、所有候选共用同一对象时的别名、每次 getter 返回新能力、入场 misc 与实际 misc 不同、动态 supports、先抛支持性错误、同线程重入。日志为 `independent-boundary-probe.log`。
- `independent-complexity-probe.mjs`：真实固定 Luacheck 1.2.0，完整旧源入口 CC31 被拒；当前入口 CC8，六新函数依次7/7/4/8/6/2，包含8个原 helper 共15个受限函数。逐一注入16分支及匿名嵌套超限，全部被拒；17个实际测量逐项缺失/坐标偏移/重复、未知格式与缺模块/入口均失败关闭。日志为 `independent-complexity-probe.log`。
- 上述边界探针另实际杀死3个临时生产变异：缓存 constructor、复制选中 actor、略去 discarded eager 候选。临时目录已清理，生产未写入。
- 已知 Fengari 直接脚本入口可能异常退出仍返回0；独立 probe 的通过以完整三条 PASS 为准，变异验证同时要求失败内容且没有最终 PASS，未把异常进程退出码当自动通过。

## 常规覆盖与一次性大对照

同意将本轮新加入的 jaw_worm_horde / darklings / awakened_one 三个完整旧新双VM对照转为可复现一次性证据，而不是每个PR重复执行它们全部用例。原三份Lua与 encounter_formation_combat 仍在 `tests/lua`，现有 Full 自动发现全部Lua，继续执行真实Run/Combat、构造采样与事务断言。常规新集保留边界图、完整 encounter_formations 与11个具名语义变异，连同旧blob身份应为14项；这不是删除原断言或降低原Full范围。

最终14项与保留17项均已完成，实际收据及下述独立读回支持此判断。仍不把局部双VM或本地来源回归当作Full。


## 最终行为与来源收据复核

复核时刻：2026-11-08T23:53:57.165Z。当时工作树基底 HEAD 仍为 `fb04fd36ab4fbdba71c0da08bf71d2899143f69b`；测试的是明确记录输入摘要的脏工作树，不冒充最终提交。

- 常规行为：14/14，7,321.271067 ms，362个边界场景；每侧1,160个边界图点及372个原 formation 图点，共1,532点。11个语义变异要求精确具名断言失败，超时、无效语法及运行基础设施失败不算kill。
- 保留大对照：原17/17，77,623.482649 ms。Jaw Worm Horde / Darklings / Awakened One 的原断言与完整旧新观测均实际运行。保留 runner 与原执行文件摘要一致，1,909项运行后输入清单读回仅存在已说明的常规文件17→14项裁剪；其它记录输入未变。运行后清单不是前后hash见证，此限制保持。
- 新来源11/11、原Defect来源11/11、集成来源38/38。独立逐项复核四份最终收据的压缩/解压日志、测试源码、所有记录输入摘要和成功计数；来源三收据的前后清单相等。行为收据345个输入与17个生成输入全部匹配当前字节。
- outer archive 的压缩与完整身份固定，旧 facade 完整保留为独立前层且与Git基底原文件逐字节相等；所有前层 target/binding 保持不变，只有 Formation 的 current binding 改变，公共 owner 集合恰为51个实际改动路径。
- 独立 source 窄探针核对339个当前配置/源码输入，执行19个暖成功之后的fresh负控，包括不同owner缺失/漂移、reader复用/转目标、未知target及压缩归档破坏。均按合同拒绝。配置只允许合法JSON空白布局；外来输入不读owner、不获投影授权。未增加授权缓存。

证据：`independent-source-receipt-probe.mjs`、`.log` 和 `independent-source-receipt-review.json`。该轮独立探针初稿修正过三处测试假设：外来源本来就应原样返回、配置尾换行是允许的布局、gzip必须按二进制hash；对应失败日志保留为 `independent-source-receipt-probe-{initial,layout-correction,binary-correction}.log`，均非生产失败或被隐藏的失败。

## 全库指标独立读回

使用Git archive重新验证旧报告全部338份源码确为fb04fd36，重新验证当前报告全部338份源码与全部报告工具输入。工具路径因工作树不同而不同，比较固定工具版本/二进制hash而非要求路径相同。除Formation外，每个模块测量条目均完全不变；完整依赖边及SCC结构完全不变。

- 测量5598→5604，模块338不变。
- CC>30：34→33；CC>15：210→209。
- SCC成员68/11/2，内部引用513/44/2，全部引用1929，唯一依赖对1558不变。

这是现有完整指标的独立重验，不是新跑一轮全库采集。证据：`independent-metrics-probe.py`、`.log` 与 `independent-metrics-review.json`。初稿因把工具绝对路径当身份而失败，修正后通过，原日志保留。

## 未完成项

当前17/14形状的POSIX成本超预算5,156 ms，必须保持Draft阻塞。#574 POSIX15前置更新、精确最终HEAD及全部Full证据仍未完成。静态传递边界、投影等价与6个真实CI消费者的最终收据已独立读回；它们不替代Full。不复制前置未发布的15形状，不放宽门禁。


## CI来源与预算独立复核

复核时刻：2026-11-08T23:59:29.105Z。六个CI inverse绑定的完整旧文均与fb04fd36的对应Git源码逐字节相等；当前文本须完整hash匹配才能投影，LF/CRLF可匹配，其它字节变化、前层原文、非字符串及错路径保持不透明。独立执行60个这类负控。

- 仅新增两个真实本地完整文件floor：行为7,322 ms（实测7,321.271067 ms）、来源17,342 ms（实测17,341.023952 ms）。行为的有效规划成本仍为未知文件下限10,000 ms，未用较低观测降低保守成本。未增加一次性大对照floor或伪造hosted采样。
- 去掉这两项后，完整timings对象与前层完全一致；原floor、Lua安全/分配成本、unknown、worker、超时、并发、预算和预留不变。shape与执行入口逐字节对基底核验，仍Windows17/POSIX14。
- 完整discovery为800 JS / 1,410 Lua；原797 JS清单与基底一致，原1,410 Lua逐文件摘要未变。全部JS分片及Windows Lua分配恰好覆盖一次。
- 独立重新计算后，含60秒预留的Windows最大1,794,163 / 1,800,000 ms；POSIX最大1,205,156 / 1,200,000 ms，超5,156 ms。因此整体仍 **BLOCKED**，不是CI全绿。前层POSIX已超2,485 ms，本轮没有把历史超额隐藏为通过。
- 完整ci-runtime实际13/13，退出0；完整ci-calibration实际38/39，退出1，唯一失败是原POSIX预算断言。已核对两日志的压缩/解压hash、各14项前后输入清单及当前输入无漂移。该测试失败状态保留，不把局部probe退出0误当预算通过。

证据：`independent-ci-probe.mjs`、`independent-ci-probe.log`、`independent-ci-review.json`。此次未跑重复Full；补充投影与实际消费者的已验证范围见下段。


## CI补充证据与最终结论

最终读回时刻：2026-11-09T00:01:18.738Z。

- 静态反向导入闭包识别91个test文件、151个模块，仅字面相对import/export/dynamic import；计算或模板导入不在此静态范围。**未把这91份文件称为已全部执行**。
- `ci-boundary-equivalence.mjs` 读取fb04原模块，对27份完整已注册输入执行4,255个新旧输出/异常等价比较，含LF/CRLF、漂移、非字符串、未知epoch；11个导出函数与不可变元数据保留。原文与当前脚本hash、17项前后输入hash、结果及日志摘要均独立读回一致。此证明是来源投影合同，不是91份下游测试运行。
- 六个真实消费者完整串行执行：ci-impact、ci-posix-shards、full-quality、delivery、merge-queue、ui-regression-partitions，共87/87，11,338.880930 ms，0失败/取消/跳过。127项前后输入清单与当前输入一致，原始日志和收据hash匹配。
- CI三组总计139个不同用例，138通过、1失败。唯一失败仍为完整POSIX成本超原1,200,000 ms预算5,156 ms，未被跳过或降级。

**局部PASS**：生产职责、原行为与失败顺序、来源outer、静态复杂度门禁、CI来源与floor真实性、已声明的消费者合同。无尚未修复的局部语义缺陷。

**整体BLOCKED**：真实POSIX规划预算红灯及正常精确HEAD/Full准入待完成。不叫CI全绿，不以该报告授权合并，不代替官方导入、实际ready或实机体验。后续基线/矩阵或其他代码改变须重新复核相应范围。

评审文件由非实现者完成，冻结时刻：2026-11-09T00:02:23.830424+00:00；后续提交身份由协调者另行绑定，不将当前基底fb04或保全f062当最终已验收HEAD。

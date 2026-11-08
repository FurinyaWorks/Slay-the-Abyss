# M7 Act3 AI 出招职责

接续 TASK-74.20，基线为 develop `d8a57cae2a867200ca8e588abc0d368e6cdb3799`。实时核对16个开放 PR与本地源码占用，`abyss_act3_ai.lua` 未被其他切片修改。只维护既有 AI 的工程边界，不扩充 Act3 内容或开放比赛范围。`task:pick` 因任务已 In Progress 返回 HOLD，本轮为明确分派的原任务接续，不另领任务，不改变 Furinya、状态或 AC。

## 真实职责

唯一生产改动是 `abyss_act3_ai.lua`。`advance` 保留策略准入、Writhing 延迟委派和公共一次随机抽样；分别提取 Maw 计数/出招/历史帧替换、Spire Growth 连招与束缚决策、Shapes 出招和 Orb Walker 防三连策略。没有新增状态 owner、模块边、延迟依赖或可变注册器。

保持所有原比较与先后次序：随机回调之前捕获 policy；无效 policy 不取随机；即使出招固定也保留那次随机消费。Maw 先递增回合，再按原顺序逐项 Copy，最后替换 intents、写 last、查找 intent；旧帧保留原对象，未变化的 move 保持别名。Writhing 仍延迟 require并多值返回；initialize/afterAction 继续晚绑定公开 advance、丢弃其返回值。源码行号与调试调用栈会因提取变化，不宣称其不变。

## 指标与硬门禁

完整原始报告：`docs/evidence/m7-act3-ai-{baseline,current}-engineering-20261107.json.gz`。没有漏掉匿名函数、初始化块或延迟 require。

- 333模块；5386/5386 → 5390/5390完整测量。
- `advance` CC46 → 14；Maw8、Spire Growth9、Shape13、Orb Walker8。
- 全模块11项函数/初始化测量均≤15，未来 helper 与匿名函数同样受硬门禁约束。真实冻结旧源码重新测得CC46并被当前门禁拒绝。
- 全库 CC>30：58 → 57；CC>15：237 → 236；最大CC75保持。
- SCC81/623引用位置/400唯一依赖对与SCC15/62/41保持，SCC降幅为0。全库require位置1920、唯一依赖对1546不变。
- 原14项静态告警不变，无新增豁免。

## 验证

机器证据：`docs/evidence/m7-act3-ai-responsibilities-20261107.json`。冻结完整旧模块的Git blob与SHA256，不刷新旧历史oracle。

新差分逐侧覆盖1680个策略/随机阈值/历史状态组合和52个生命周期、返回、动态委派、错误、部分写入与回调修改状态的检查点。完整可重建对象图一致，含函数/对象别名、循环状态和旧帧引用。唯一位置映射是完整的 unsupported-policy 断言字符串；其余字符串错误和表错误原样比较。

旧/新两侧各5个真实语义负控：Maw直接改旧帧、Orb第三连招、Spiker上限错位、Transient多取随机、主随机边界99。10项均被具名断言检出。新差分与门禁29/29通过；既有Maw/Growth、Orb Walker、Shapes、Transient三组、Writhing/Parasite和组合owner回归13/13通过；CI库存及历史成本合同17/17通过。静态、架构、guidance和verify:backlog通过。Backlog doctor仍报告5组既有重号并exit1，未修复、未计为通过。

独立审查另验证Maw第二次Copy抛表对象的部分写入、随机回调替换intent/history/policy图；旧新都保持。独审未发现阻断项，精确提交绑定见外置审查收据。

首次运行出现的负控夹具遮蔽、整模块门禁注册缺项、缺生成theme、CI新文件库存缺项均已修正并定向重跑。作者基线采集曾短暂替换生产源导致另一条自己的静态命令读到混合版本；该次报告作废，恢复固定源码摘要后重跑静态及集成回归。失败经过记录在机器证据，未用失败结果声称当前通过。此后基线对照应通过内存输入或隔离目录，不替换正在受审的源码。

## 成本与交付状态

本片只新增1个顶层JS测试，747 JS / 1402顶层Lua仍按原unknown10秒进入完整库存。新测试约4秒，小于未知文件预算；没有改平台观测、原9项floor、worker安全成本、并发12、worker2或正式预算。当前规划见 `docs/evidence/act3-ai-planning-20261107.json`：Windows17片含60秒预留最大1711718ms，POSIX13片1191898ms，剩余88282ms/8102ms。这里只是规划，不是Hosted观测或Full通过。

此前向 FurinyaWorks/Slay-the-Abyss 发布源码已被拒，目的地授权问题未解除。本片只做本地源码、验证、独审与提交，不重试远端写入，也不换接口或切片规避限制。没有新PR、Hosted CI、合并、合后Full、官方导入或实机证据。未跑Full，未使用用户电脑、桌面、Codex或GUI。未来补齐有效目的地授权后，仍需精确远端HEAD/BASE、完整Quality和原merge:auto队列握手；不能直接merge绕过。与其他切片合流时共享门禁、CI库存和任务文本须保留并集。M7整体验收与任务AC保持未完成。

# M7 飞刃回合生成职责

接续 TASK-74.20，基线为 develop `d8a57cae2a867200ca8e588abc0d368e6cdb3799`。本轮实时核对全部开放 PR 的生产文件，并逐树检查本地工作树；`abyss_shivs.lua` 无重叠。未承接 #543–#556、Act3、中毒、药水或 Scry 的未合切片。任务仍由 Furinya 负责，状态和 AC 保持。

## 源码边界

仅修改 `abyss_shivs.lua` 的回合开始协调，把五项真实职责分开：敌人完整存活扫描、所有牌堆旧 UID 收集、生成器返回形状检查、落入手牌/弃牌堆的生成卡身份检查、历史生成帧的 Accuracy 补值。现有 `startTurn` 继续掌握先后顺序；Silent 生成器仍由调用栈传入并负责生成，不保存回调，不新增状态 owner 或模块依赖。

保持逐个动态读取 `Actors.isActive`，首个存活敌人不使扫描短路；Accuracy 在生成前捕获；先校验全部返回 UID，再给新卡写入 Accuracy；只修改本次生成事件中的既有历史帧实例，不改旧事件或重建帧。错误对象、返回 UID 表、部分写入及 Master Reality 每次读取顺序均属于验证范围。函数提取会改变源码行号和调用栈；不声明调试栈坐标不变。

## 完整测量

两份完整工程报告保存在 `docs/evidence/m7-shiv-turn-{baseline,current}-engineering-20261107.json.gz`，未删模块、匿名函数、初始化块或延迟 require。

- 333 模块；测量 5386/5386 → 5391/5391。
- `startTurn` CC33 → 6；五个新 helper 的 CC 依次为 3、3、7、13、6。
- 全库 CC>30：58 → 57；CC>15：237 → 236；最大 CC75 保持。
- Combat SCC81成员 / 623引用位置 / 400唯一依赖对保持；Session SCC15 / 62 / 41保持。SCC降幅为0。
- require位置1920、唯一模块对1546保持；原14项静态告警不变。
- Shivs完整模块全部函数、匿名函数和初始化块纳入原CC15硬门禁，包含以后新增helper。没有移动门槛或新增豁免。

## 验证和成本

详见机器证据 `docs/evidence/m7-shiv-turn-responsibilities-20261107.json`，包括完整旧/新图、错误映射、首次测试失败与后续定向修正的来源。原始191行旧模块固定到基线 Git blob 与 SHA256；不刷新旧夹具或已合历史oracle。

新完整图每侧161个检查点、1356804字节逐字一致；4种真实语义负控在旧/新两侧共8项均检出。最终 direct＋负控9项和Combat1项分别定向通过，wall为1.540s和1.684s；此前完整新文件10/10的2.674s只代表当时版本，不冒充最终完整文件重测。最初两类负控被测试数据遮蔽、精确错误行映射一次错位，失败与修正均保留，没有生产代码回退。只有六条已知完整断言字符串可按确切位置映射，其他错误保持原样。

原 `silent_shivs.lua` 25组通过；原 `watcher_master_reality_shivs.lua` 的真实生成、溢出、身份及 Infinite Blades 通过。原职责门禁加全Shivs负控后17项通过，CI库存和完整历史成本合同8项通过。架构与静态检查、guidance及verify:backlog通过。Backlog doctor仍报告5组既有重号并exit1，不计为绿。

本片新增一个顶层JS测试，当前库存747 JS / 1402顶层Lua，仍按原unknown10秒计入；原9项floor、平台观测、raw worker安全成本、并发12、worker2及预算不变。Windows17片含60秒预留的预测最大1711718ms，POSIX13片1191898ms，剩余分别88282ms和8102ms。这是本地规划，不是Hosted测量或准入。

## 交付状态

本片仅完成本地源码和定向验证；独审以外置精确提交收据为准。此前向 FurinyaWorks/Slay-the-Abyss 发布源码因目的地授权不匹配已被拒，本片未再次尝试远端写入，也未换通道上传。没有新PR、Hosted CI、合并、合后Full、官方导入或实机证据；未运行Full，未使用用户电脑、桌面、Codex或GUI。

未来需先补齐明确的仓库目的地/源码发布授权，才可进行正常远端交付；独审与CI必须绑定最终远端HEAD/BASE，使用仓库原`merge:auto`握手和队列，不以直接merge API替代。共享静态/CI/任务文件与其他切片合流时保留并集并重新核验组合，不机械覆盖。M7整体仍未验收，不勾任务AC。

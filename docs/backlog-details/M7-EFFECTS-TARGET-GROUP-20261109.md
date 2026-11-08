# M7：Effects 目标分组验证职责

本片继续 TASK-74.20，仅拆分 `abyss_effects.lua` 原 `targetGroup` 的遍历、数组形状、成员与成对验证；不新增玩法或依赖。原函数以外的生产字节保持一致。所有权、队列、状态提交与公开入口不变。

## 生产身份与架构收益

- 原 develop：`7821a7f44b518c09f6b565860e04e4823bc95153`。
- 独立生产保全：远端 `549e92aac19eaf4589e2f5ff869943becea78459`，本地 `eba244948d6116aeb478b409095680f5c3f8cdc9`；同一完整 tree `ef6ff1bd7ce4fe466ea52752bee6c9fd9eb5fc65`，源码逐字读回一致。
- `targetGroup` CC33→7；六个新 helper CC9/2/5/9/5/6。七项入口及嵌套函数使用原 CC15 硬门禁。
- 完整338模块、5561/5561测量：CC>30 40→39，CC>15 216→215，最大61、14条原告警保留。SCC按成员/内部引用/唯一对为68/513/324、11/44/26、2/2/2，均不变，不宣称降环。
- 原基线报告另对每个生产模块核对实际 Git blob；本轮完整测量及源码摘要在[指标](../evidence/m7-effects-target-group-20261109/metrics.json)。

## 行为及防回退

独立旧新完整模块各在新 VM 执行51场景×3入口，306个前后完整图检查点一致。覆盖table-key遍历、shared/active区分、循环、动态字段与pairs读取、别名、错误对象、返回元数、原RNG和未标记输入的部分写入。11个语义变异由完整图或明确断言检出，指令上限错误不得计为kill。实际固定Luacheck拒绝原CC33、七个超限helper与嵌套CC17。

新专项最终5/5，完整耗时7661.276801ms；旧支持能力双VM及13变异通过，Shockwave71/71、核心职责7/7、原复杂度合同19/19通过。首轮整数key变异缺少可区分见证、后续超时伪kill、旧门禁fixture缺新增root等真实失败均保留，不能用中间绿灯替代最终结果。

来源以独立完整原文件及Git blob认证；新增outer保留每份旧档、旧SHA与前驱元数据，当前46个raw owner每次鲜读。独立片来源48/48、动态合同19/19通过。仅追加真实完整文件7662ms规划floor，原unknown10000ms仍支配该文件成本，未降预算或改变worker/分片。

## #564 接续边界

最终草稿以 `#564@f256316c5b63adc7bbc1a72a8fedbc86f69079c6` 为前置，保留其全部历史来源、CRLF、GameUI及Battle耗时修复；不动#564 HEAD。7821→f256没有生产Lua、架构配置或workflow差异，已通过的本片生产与行为文件原字节保留。

真实交叉是.gitattributes、CI历史证明、combined facade及认证helper闭包；组合来源/CI验证和独立差分审查追加为独立证据，原独立片的GameUI基线红灯不会改写为通过。WatcherFlow #567、Silent #568 的生产文件与本片无交集，但共享来源与成本合同仍须在实际前置合入后统一组合，不能直接覆盖。

最终组合定向104/104通过，包含完整CI合同32/32；新增outer保留旧45-owner合同并验证当前46-owner布局输入、逐owner鲜读、无效reader及未知target边界。完整生产、行为收据输入、工程采集输入和35份独立片证据均逐字保留，故不重复未改的昂贵行为或全源码采集。详见[组合索引](../evidence/m7-effects-stack-20261109/integration-index.json)。

[完整原始索引](../evidence/m7-effects-target-group-20261109/index.json)保留独立片身份与失败记录。草稿与远端保全不是Hosted Full、正常准入、合并或合后验收；#564的Full不移用到本片。未触发重复Full、放宽保护、发布游戏或操作用户设备。TASK-74.20的Furinya负责人、In Progress与未验收AC保持。

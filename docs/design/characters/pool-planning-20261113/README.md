# 四角色 75 卡位阶段预算（HOLD）

本文件只规划职责容量，不是 300 张已设计卡牌。冻结快照共有 **29 张已有候选、271 个预留卡位、4 件已有初始遗物候选**。全部仍未获得本规划中的人类命名、平衡、G8 扩容或 G9 验收批准。升级形态、初始牌副本及遗物不计入 75 种卡。

以 [#635](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/635) 的[固定规则提交](https://github.com/FurinyaWorks/Slay-the-Abyss/tree/c53e3511dcc4af631f541f71e21afc66797c4dd2/docs/design/characters)为准。S0–S3 仅表示研究顺序，任何新增仍须按 G0–G9 准入。预算可缩减或重分配；75 不是填满授权。未分配储备不预设费用或稀有度。其他组费用为研究闭区间、稀有度为候选集合，均非逐卡批准或固定配额。未复制雷电历史稀有度分布。

范围仅为本目录文档与只读结构校验器。不修改四条实现分支、角色母表、数值、任务或正式运行时；不发 PR、不合并、不运行 Full。Backlog CLI 不可用，本轮不手工改任务。开发基线为 903bf2a31e91f10fb24763ab4cea23d586d0bb83；候选各自固定在下列 SHA，接续实现必须先核 owner 的新提交差异。

## 分角职责表

### 甘雨

[冻结候选](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/08dfa35304d2fcdd0fc20eed9189b3485a40ec08/experiments/characters/ganyu/cards.json) · SHA `08dfa35304d2fcdd0fc20eed9189b3485a40ec08` · blob `7bea7cad99803142ebf10e8b30cba2e55182dca1`。

|职责组|总预算|已有 ID|预留|费用候选|稀有度候选|阶段|
|---|---:|---|---:|---|---|---|
|foundation：基础攻防|2|ganyu-01, ganyu-02|0|1–1|basic|S0|
|immediate：无满蓄前置的即时单体处置|10|无|10|0–3|common/uncommon/rare|S1|
|payoff：蓄力兑现与单群选择|9|ganyu-03|8|1–3|common/uncommon/rare|S1|
|defense：即时防守兼收尾|10|ganyu-04|9|0–3|common/uncommon/rare|S1|
|supply：主动产蓄与遗物末回合存能竞争|9|ganyu-06|8|0–2|common/uncommon|S1|
|access：过牌调度改善核心可及性|8|ganyu-07|7|0–2|common/uncommon/rare|S1|
|rotation：低压轮转与防守预算|7|ganyu-08|6|1–2|common/uncommon|S2|
|persistent：持续群伤与即时绽发竞争|6|ganyu-05|5|1–3|uncommon/rare|S2|
|reserve：尚无论证的职责缺口|14|无|14|未定|未定|HOLD|

升级原则、排重反例及来源缺口逐组记录于 [plan.json](plan.json)。已有值以冻结母表为准，本规划没有第二份可写效果表。

初始遗物 `ganyu-starter-01`：[冻结来源](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/08dfa35304d2fcdd0fc20eed9189b3485a40ec08/experiments/characters/ganyu/relic.json)。将余能转蓄力；仅引用已有遗物合同。官方蓄力主题不证明回合余能转换或遗物名称。

风险：钩子重复归属；满蓄无箭；低费产蓄/检索消除等待代价；替换后来源不足。需补：相同牌序有无遗物比较；取消/重复结束/终局；满蓄/溢出/替换；连续战失血与兑现时间。

### 魈

[冻结候选](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/0cc6d58e828caa9c340a033c939fe92f5ccb142a/experiments/characters/xiao/cards.json) · SHA `0cc6d58e828caa9c340a033c939fe92f5ccb142a` · blob `73ed320435c6a391493b4f6e95561141d18cd36f`。

|职责组|总预算|已有 ID|预留|费用候选|稀有度候选|阶段|
|---|---:|---|---:|---|---|---|
|foundation：基础攻防、面具入口与范围兑现|4|x01, x02, x04, x05|0|1–1|basic|S0|
|immediate：常态单体可靠击杀|8|x03|7|1–2|common/uncommon|S1|
|defense：大伤/多段下等待窗口|9|无|9|1–2|common/uncommon|S1|
|payoff：面具窗口单群兑现|8|无|8|1–3|common/uncommon/rare|S1|
|timing：退出及窗口调度|5|x06|4|0–2|common/uncommon/rare|S1|
|access：入口/出口可及性及启动后手牌|7|x08|6|1–2|common/uncommon/rare|S1|
|hybrid：常态与面具攻守桥梁|6|x07|5|1–2|common/uncommon|S2|
|intent：当前可见意图条件行动|6|无|6|1–2|common/uncommon|S2|
|disruption：有限负面/塞牌应对|5|无|5|1–2|uncommon/rare|S3|
|longfight：长战有限回本|4|无|4|2–3|uncommon/rare|S3|
|rare_choices：稀有构筑缺口研究|5|无|5|2–3|rare|S3|
|reserve：无论证储备|8|无|8|未定|未定|HOLD|

升级原则、排重反例及来源缺口逐组记录于 [plan.json](plan.json)。已有值以冻结母表为准，本规划没有第二份可写效果表。

初始遗物 `xiao_relic_01`：[冻结来源](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/0cc6d58e828caa9c340a033c939fe92f5ccb142a/experiments/characters/xiao/cards.json)。首次成功进入面具后的抽牌；引用已有候选。面具主题有据，遗物名称和抽牌是本作改编。

风险：强制开面具；满手空牌堆；重复刷新领取；不能解决没抽到入口及付不起血。需补：有无遗物同牌组对照；入口见到/支付/有效抽牌率分报；失败取消死亡跨战重置；不奖励低血也不返还所付生命。

### 钟离

[冻结候选](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/54e97ae705b4fa55d8a97ce6ebeb5aee3fd64534/experiments/characters/zhongli/model.mjs) · SHA `54e97ae705b4fa55d8a97ce6ebeb5aee3fd64534` · blob `86fbde34eb0bb412792b5301f7743ed9ccb4a630`。

|职责组|总预算|已有 ID|预留|费用候选|稀有度候选|阶段|
|---|---:|---|---:|---|---|---|
|foundation：基础无前置攻防|2|zl01, zl02|0|1–1|basic|S0|
|persistent：跨回合防线来源|8|zl03|7|1–3|common/uncommon|S1|
|hybrid：当回合防御/留防/击杀预算|8|zl06, zl07, zl08|5|1–2|common/uncommon|S1|
|conversion：牺牲防线即时兑现|8|zl04|7|1–3|common/uncommon/rare|S1|
|independent：无玉璋击杀推进|8|zl05|7|1–3|common/uncommon/rare|S1|
|area：多敌威胁削减|6|无|6|1–3|common/uncommon/rare|S2|
|control：控敌争取行动窗口|6|无|6|1–3|uncommon/rare|S3|
|access：组件可及性|6|无|6|0–2|common/uncommon|S1|
|sequence：当前与下回合行动安排|5|无|5|0–2|uncommon|S3|
|matchup：负面塞牌特殊压力|4|无|4|1–2|common/uncommon|S3|
|longfight：长战启动与回本|4|无|4|2–3|uncommon/rare|S3|
|reserve：未分配职责缺口|10|无|10|未定|未定|HOLD|

升级原则、排重反例及来源缺口逐组记录于 [plan.json](plan.json)。已有值以冻结母表为准，本规划没有第二份可写效果表。

初始遗物 `zl-relic01`：[冻结来源](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/54e97ae705b4fa55d8a97ce6ebeb5aee3fd64534/experiments/characters/zhongli/battle.mjs)。开场有限防线，保留后续建立费用；引用已有候选。保护定位有据，开场赠玉璋与遗物名称为本作改编。

风险：掩盖来源牌底；低伤敌失去压力；跨战累计优势；防守贪心停滞。需补：有无遗物相同牌序；每战仅一次/取消重放不重复；首次兑现及失血；不得跨战积盾。

### 刻晴

[冻结候选](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/1735ad356467a468f62c8868dbcf133c72714285/experiments/characters/keqing/mechanics.mjs) · SHA `1735ad356467a468f62c8868dbcf133c72714285` · blob `7f0059f581f545c7609b9e1ddad065b6c743afaa`。

|职责组|总预算|已有 ID|预留|费用候选|稀有度候选|阶段|
|---|---:|---|---:|---|---|---|
|existing：既有核心五卡|5|KQ001, KQ002, KQ003, KQ004, KQ005|0|1–2|pending|S0|
|supply：雷楔来源与启动选择|8|无|8|1–2|common/uncommon|S1|
|infusion：再施与后续攻击|8|无|8|1–3|common/uncommon/rare|S2|
|detonate：雷楔引爆群敌|8|无|8|1–3|common/uncommon/rare|S2|
|defense：空资源/强化后/高压生存|10|无|10|1–2|common/uncommon|S1|
|access：牌底、早抽、厚牌组和满手调度|8|无|8|1–2|common/uncommon|S2|
|sword：无前置可靠剑术|8|无|8|1–3|common/uncommon|S1|
|matchup：特定遭遇及路线衔接|6|无|6|1–3|uncommon/rare|S3|
|reserve：尚无论证的弹性缺口|14|无|14|未定|未定|HOLD|

升级原则、排重反例及来源缺口逐组记录于 [plan.json](plan.json)。已有值以冻结母表为准，本规划没有第二份可写效果表。

初始遗物 `KQR001`：[冻结来源](https://github.com/FurinyaWorks/Slay-the-Abyss/blob/1735ad356467a468f62c8868dbcf133c72714285/experiments/characters/keqing/battle.mjs)。首次成功设楔的有限防守补偿；沿用当前候选。位移主题不证明原作遗物或格挡机制。

风险：首战技变必选；放大早抽优势；掩盖连续战经济；取消/再施重复领奖。需补：有无遗物相同牌序；来源首手/牌底；启动未兑现；取消/再施/跨战斗重置。

## 跨角色审核与扩容阻断

- 甘雨：即时用能与延后兑现须都有合理场景；免费资源、必定检索不能抹平机会成本。本表排除工作树中的 ganyu-09/10，仅计远端八卡，后续由 owner 重新映射。
- 魈：生命代价、进入/退出及有限窗口是核心取舍；不以固定治疗补平代价。保留升级延长面具的致死反例；不复刻胡桃低血收益。
- 钟离：官方保护、岩伤和控敌主题有证据，主动耗盾换伤没有原作机制证明。耗盾组必须先过人物合同，否则重分配。比较整回合，不能以孤立单卡死亡案例证明转换劣势。
- 刻晴：雷楔群体兑现与再施后行动预算竞争；元素附魔不能被说成官方每段加伤。多段、资源来源密度及防守补偿联算。
- 共通：零费抽牌/回收、长期留存/控制、升级减费都须排查正资源循环；现有样板回归通过不能代替自然奖励、精英/Boss、连续战生命经济和真人选择证据。未触碰的评估种子必须另行封存，已反复使用的集合不能继续称保留组。
- 所有角色的逐卡来源、中文命名、人审和平衡仍未齐。预算、AI 评审及远端备份均不能代替批准。

## 来源职责

以下是此前独立来源调查的记录；本次备份未将仅索引可读内容提升为原文证据。官方站点可能失效，精确命名需要逐卡存证，禁止发明引文。详细支持边界见 JSON。

|锚点|身份|可读状态|适用版本|支持范围与限制|
|---|---|---|---|---|
|[official-13](https://www.hoyolab.com/article/162350)|HoYoverse官方作者|原文可读|1.3（2021-02）|魈面具强化伴随生命流失；刻晴玉衡与质疑传统；钟离玉璋、岩脊与调整；不能证明回合制资源、逐卡中文名或遗物|
|[zhongli-position](https://www.hoyolab.com/article/100444)|HoYoverse官方作者|原文可读|1.1（2020-12）|钟离保护与群体控制定位；不证明主动消耗自己的护盾换伤|
|[zhongli-beta](https://www.hoyolab.com/article/118698)|HoYoverse官方作者|原文可读|1.3测试调整（非最终版）|调整讨论的历史背景；不能作为最终上线数值|
|[zhongli-intro](https://blog.playstation.com/2020/11/10/new-characters-and-events-arrive-in-genshin-impacts-first-version-update-out-today/)|HoYoverse署名作者发表于PlayStation|原文可读|1.1（2020-11）|往生堂顾问、沉稳博学；岩构造物、陨星与石化；不证明本作护盾消耗或控制回合数|
|[xiao-design](https://genshin.hoyoverse.com/zh-tw/news/detail/103849)|HoYoverse官方域名|仅检索索引可读；直开零正文|2021-02设计访谈|守护责任、痛苦与温柔、仪式面具的待核线索；须恢复原文才可作逐卡精确引文|
|[ganyu-intro](https://genshin.hoyoverse.com/en/news/detail/103816)|HoYoverse官方域名|仅检索索引可读；直开零正文|1.2（2021-01）|秘书、信息处理的性格线索；不能据此批准抽牌机制或中文名称|
|[update-12](https://genshin.hoyoverse.com/en/news/detail/103809)|HoYoverse官方域名|仅检索索引可读；直开零正文|1.2（2020-12）|甘雨冰莲与冰雨、刻晴再施后附魔线索；附魔不是本作每段加伤；中文逐字仍未核|
|[ganyu-tcg](https://ys.mihoyo.com/main/news/detail/118222)|miHoYo官方域名|仅检索索引；直开失败|3.7七圣召唤|霜华相关命名检索线索；不得混作1.2动作游戏技能全文|

两个杀戮尖塔对照均来自固定提交的**第三方反编译镜像**，不是 Mega Crit 官方源码，发行 build 未认证；不得冒充官方原始证据。

- [TwinStrike](https://raw.githubusercontent.com/purewhitelove/ButterflyGame/fc379c875c11e008e9c10548ac8e394c301c532f/%E6%9D%80%E6%88%AE%E5%B0%96%E5%A1%94%E5%8E%9F%E7%A0%81/cards/red/TwinStrike.java)：1费普通攻击，5伤×2；升级7伤×2。刻晴多段需按每段增益、护甲/反伤和过量伤害核算；不能将总伤视为单段等价。
- [Cleave](https://raw.githubusercontent.com/purewhitelove/ButterflyGame/fc379c875c11e008e9c10548ac8e394c301c532f/%E6%9D%80%E6%88%AE%E5%B0%96%E5%A1%94%E5%8E%9F%E7%A0%81/cards/red/Cleave.java)：1费普通全体攻击，8伤；升级11伤。四角群伤按敌人数、前置资源与机会成本比较，不能只比较单目标伤害。

这两项仅辅助比较；正式数值评审仍须核合法本地原版的版本和真实行为，不构成统一定价公式。

## 验证和交接

运行 `node docs/design/characters/pool-planning-20261113/validate.mjs` 可只读检查 JSON 计数、ID 一次映射、HOLD/false、空值及来源元数据。输出只表示规划结构，不验证官方真实性、游戏逻辑或平衡。本次已在工具 JavaScript 环境执行同一验证函数，结果为 300 / 29 / 271，四角各 75；未运行 Node 包装器或 Full。

四角规划由并行评审汇总；另一评审仅复核了发布边界，认为文档备份无阻断，未将该意见冒充三文件全文审查或人类批准。主审纠正甘雨脏树计数，将未定储备的费用及稀有度设为 null，并收紧 S1–S3 与 G 关口关系。

实现负责人只应从真实缺口选择下一张小样，先更新来源/人物合同与对照反例，再按既有流程申请对应关口。出现 owner 新提交时重新对照快照；不要把预留数量直接翻译为新增卡文件。

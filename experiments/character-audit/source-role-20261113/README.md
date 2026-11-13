# 四角色来源与同职责审计（2026-11-13 冻结快照）

范围是已实现的甘雨 46、魈 42、刻晴 17、钟离 17 张，共 122 张；不是每角 75 张已完成。具体提交及输入 Git blob 见 input-manifest.json。逐张记录见对应角色 JSON，实际模型探针见 mechanical.json；后续分支变化须另行重跑。未改角色数据或数值，未运行 Full，未批准官方来源、命名或平衡，也不代表正式游戏/原生设备试玩通过。

规则基线：仓库 #635，c53e3511dcc4af631f541f71e21afc66797c4dd2 的角色生产与平衡规则。B1 要求同职责 STS 证据，B6 区分费用、稀有度及基础/奖励获取；升级有结构差异不能代替收益证明，已有数值修改遵守 B8。以下为建议交接，未替作者修改或发送外部消息。

## 优先交接

|严重度|负责人|可复现发现|处理建议|
|---|---|---|---|
|P1 设计门禁|甘雨 owner|04 与 44 同费同稀有度，当前模型 04 基升防御均不低且额外群伤；0/1/2 蓄力的六组断言通过|44 扩卡前给出不可替代职责或提交经过批准的取舍方案；结论限当前模型，不外推正式引擎反伤等未实现条件|
|P1 升级门禁|魈 owner|x04 起始 8 HP，无敌方攻击，连续三次回合结算，基础剩 2 HP，升级死亡|延长面具必须明确额外自损及退出可控性；此为升级风险反例，不等于已批准削弱|
|P1 来源门禁|刻晴 owner|17 张实现仅 9 个逐卡来源记录，缺 KQ010/034/035/036/052/053/054/067|补逐卡来源、改编边界及 HOLD，不能直接置 verified=true|
|P1 证据门禁|四角色 owner|共享官方角色介绍不能覆盖每张自造卡文、数值或中文候选名称|所有逐卡精确对应仍未核；不要把社区索引、作者设计或本审计当官方/人审批准|
|P2 来源漂移|钟离 owner|cardIds 仅 zl01–15，模型含 16/17，adaptationBoundary 已提到二者|维护来源集合一致性；盾转伤/盾消耗/清除敌格挡须标本作改编|
|P2 文本与组合|魈/甘雨 owner|x16 不回收会缩短面具而实际退出的 x27；甘雨 31→18 可刷新高强度冰风暴|明确“退出牌”的精确谓词；补有费用的持续刷新组合证据，不称免费无限|

非问题边界：钟离 zl06 相比 zl02 在玉璋 0 时结算更好，在玉璋 20 上限时更差，不能声称严格支配。甘雨 06 基础与 16 有职责重叠，升级蓄力收益不同。刻晴基础/奖励牌获取渠道不同且稀有度 pending，不能把模型局部优势直接等同同稀有度平衡结论。其余条件及逐卡基升判断见四份 JSON。

## 原始来源可读性

本轮根审重新打开以下页面。网页能支持角色锚点，不自动支持 122 张牌的逐卡来源。

|来源|发布/适用边界|本轮正文|能支持/不能支持|
|---|---|---|---|
|[HoYoLAB 1.3 更新公告](https://www.hoyolab.com/article/162350)|1.3，2021-02-03 更新|可读|魈护法夜叉、长柄武器、面具强化与持续生命代价；刻晴玉衡/雷/单手剑身份；钟离当时调整。不是现版本全量技能或自造牌名出处|
|[HoYoLAB 钟离说明](https://www.hoyolab.com/article/100444)|1.1，2020-12 开发说明|可读|护盾保护及群体控制定位，不支持耗盾伤害或把格挡清除称原作机制|
|[甘雨介绍索引](https://genshin.hoyoverse.com/en/news/detail/103816)|候选 1.2 历史索引|本轮 0 行可读正文|只能保留待核地址，不作已读取原文|
|[1.2 公告索引](https://genshin.hoyoverse.com/en/news/detail/103809)|候选 1.2 历史索引|本轮 0 行可读正文|不可证明具体名称或技能引文|
|[魈设计访谈索引](https://genshin.hoyoverse.com/zh-tw/news/detail/103849)|候选历史设计访谈|本轮 0 行可读正文|不可声称已读取访谈原文|

角色 JSON 中各审查人的读取状态保留原状；本表记录根审本轮网页复核。社区转录只能用作寻找线索。本报告没有新增官方引文。

## 固定 STS 同职责对照

使用仓库 data/reference/sts1-card-pools/registration.json 登记的 aeubanks/sts 提交 319009d5df0a82d9fb0f23cc22322286c6a87ec0。声明版本 [V2.3.4] (12-18-2022) 来自反编译源码字符串，不是原版 PC 二进制认证；这是第三方 CFR 反编译镜像，不能标为 Mega Crit 官方出版。下列源码本轮已打开读取，数值仅供同职责对照，不能照搬到独立资源模型。

|源码|费用/稀有度/基升行为|对应审查|
|---|---|---|
|[Cleave](https://raw.githubusercontent.com/aeubanks/sts/319009d5df0a82d9fb0f23cc22322286c6a87ec0/cards/red/Cleave.java)|1 common，群伤 8→11|甘雨/刻晴群伤、单体取舍|
|[Twin Strike](https://raw.githubusercontent.com/aeubanks/sts/319009d5df0a82d9fb0f23cc22322286c6a87ec0/cards/red/TwinStrike.java)|1 common，5×2→7×2|魈/刻晴分段增益|
|[Iron Wave](https://raw.githubusercontent.com/aeubanks/sts/319009d5df0a82d9fb0f23cc22322286c6a87ec0/cards/red/IronWave.java)|1 common，先格挡 5→7，再单伤 5→7|刻晴/钟离攻防混合|
|[Shrug It Off](https://raw.githubusercontent.com/aeubanks/sts/319009d5df0a82d9fb0f23cc22322286c6a87ec0/cards/red/ShrugItOff.java)|1 common，格挡 8→11，抽 1 不变|甘雨/钟离防御兼资源|
|[Offering](https://raw.githubusercontent.com/aeubanks/sts/319009d5df0a82d9fb0f23cc22322286c6a87ec0/cards/red/Offering.java)|0 rare exhaust，失 6 HP，得 2 能量，抽 3→5|魈生命换资源与升级代价|
|[Body Slam](https://raw.githubusercontent.com/aeubanks/sts/319009d5df0a82d9fb0f23cc22322286c6a87ec0/cards/red/BodySlam.java)|common，1→0 费，以格挡作伤害且不消耗格挡|魈/钟离防御转输出，资源消耗有别|
|[Backflip](https://raw.githubusercontent.com/aeubanks/sts/319009d5df0a82d9fb0f23cc22322286c6a87ec0/cards/green/Backflip.java)|1 common，格挡 5→8，抽 2 不变|甘雨抽牌复合职责|

## 复现

要求 Python 3、支持 JSON import attributes 的 Node.js（已验证 v24.22.1），从本目录运行：

```sh
python fetch-inputs.py inputs
node reproduce.mjs inputs > mechanical-recomputed.json
python verify.py mechanical-recomputed.json
```

下载仅取固定 SHA，逐文件校验 Git blob；存在且不同的文件拒绝覆盖。下载器未进行本轮联网运行，输入由 GitHub connector 固定 SHA 读取后校验，避免额外抓取。Node 脚本执行已审阅的候选模块，不是执行任意第三方代码的沙箱。执行前后核验 blob；升级差异列出结构变化并保留 REQUIRES_CONTEXT_REVIEW。模型探针为构造状态，不证明自然获取频率、真实战斗胜率或所有可达状态。角色子审中的 STATIC 状态不因根审后来复现实验而改写其历史。

实际通过：122 行 ID/版本覆盖；冻结输入 blob；甘雨 04/44 六组、06/16 基础与升级、冰风暴刷新；魈 x04 存活反例及 x16 回收谓词；钟离玉璋上下界；刻晴附魔前后分段和群伤断言。全部为定向检查，未跑 Full。

独立复核后补齐刻晴群伤预期断言，并将重算结果与保存证据的比较连接到 verify.py。错误 blob 夹具在导入模块前被拒绝。

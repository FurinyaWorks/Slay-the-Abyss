# 来源可读性复查（2026-11-13），不提升验证标记

## 官方/平台页面实际结果
- https://genshin.hoyoverse.com/en/news/detail/103809 ：网页工具直接打开0可读行。此前索引线索不等于逐条正文已核。
- https://genshin.hoyoverse.com/en/news/detail/103816 ：直接打开0可读行。
- https://wiki.hoyolab.com/pc/genshin/entry/28 ：直接打开0可读行；搜索索引能见角色条目与C6描述，但HoYo平台上的社区内容不能自动升级成官方作者原文。
- 搜索 `site.genshin.hoyoverse.com Ganyu Frostflake Trail`、`site.hoyolab.com Ganyu Celestial Shower` 返回HoYoLAB玩家攻略与第三方资料。作者未核为官方，因此不用于解除P1。没有把平台域名等同认证作者。

三个直接读取均失败于正文可读性，未执行登录/GUI或声称看过视频。逐卡矩阵将主题来源与自创转换分开；75张的source_verified仍false，名字均待命名。

## STS1二级转录复核，非原游戏数据认证

以下页面正文可读：
- [Backflip](https://slaythespire.org/wiki/cards/backflip)：1费、盾5/8、抽2。
- [Leap](https://slaythespire.org/wiki/cards/leap)：1费、盾9/12。
- [Deflect](https://slaythespire.org/wiki/cards/deflect)：0费、盾4/7。
- [Shrug It Off](https://slaythespire.org/wiki/cards/shrug-it-off)：1费、盾8/11、抽1。
- [Cleave](https://slaythespire.org/wiki/cards/cleave)：1费、群伤8/11。
- [Pommel Strike](https://slaythespire.org/wiki/cards/pommel-strike)：1费、伤9/10、抽1/2。

这些是网站转录的基升数字，不是本人读取STS1客户端/官方数据，网站自称Verified不能代替本项目核验。wiki.gg四次请求403、Fandom请求402/限制、compendium直接0行，已尝试替代渠道而非只查一个链接。所有参考只作候选对照，双STS原文门禁不标通过。

### 发现来源冲突：Protect暂不用于数值锚定
[slaythespire.org Protect](https://slaythespire.org/wiki/cards/protect)正文声称2费保留8/11盾；[Fandom索引](https://slay-the-spire.fandom.com/wiki/Protect)、[slaythespire.gg索引](https://www.slaythespire.gg/cards/watcher/Protect)则为12/16盾。直接可读不意味着正确。暂标CONFLICT，不选较有利数值给本作找依据；待可靠原游戏文本/同版本数据解决。

## 44变更提案的对照解释
44旧一费盾3/4、满蓄6/8无消费；隔离建议满蓄9/12。与本作04比较已证明在固定局面改善纯盾但失去群伤，与19少盾换保留核心资源；目录仍旧值。STS候选参照Leap（稳定一费9/12）和Deflect（零费4/7），说明建议满蓄值并非明显超出外部盾基准，但未满3/4仍弱且本作囤蓄循环不同；不能据跨角色/跨游戏单卡单位效率批准。无需因为外部数字更高就再加盾，必须结合真实构筑、取舍和用户批准。

per-card.json的两项STS是候选维度参考；组合效果可能只有一部分可比，纯检索/雨场无直接参照时保留空数组，不强塞两张不相关牌凑门禁。没有修改任何卡值、source_verified或human_review。

## 后续找到可读官方人物正文（2026-11-13）

- [官方1.2更新通知 Part I](https://www.hoyolab.com/article/109392)：正文可读，作者栏显示 Genshin Impact Official；正文标更新时刻2020-12-23。能核甘雨为冰系弓角色及月海亭秘书、麒麟血脉身份；不是技能全文，不能证明当前候选的盾、检索、回合数。
- [官方甘雨人物介绍](https://www.hoyolab.com/article/127394)：正文及作者栏可读，作者显示 Genshin Impact Official。能核冰神之眼、仙麟座、月海亭秘书，以及信息协调/整理文书、半人半仙和城市与仙乡之间的身份张力。页面可读正文未显示发布日期，因此不把第三方索引的2021-01-05当作正文已核日期。属于P2人物主题证据，不是P1战斗效果证据；信息协调可作为检索候选的设计联想，但不是官方拥有抽牌技能的证明。没有从行政身份直接认证检索家族适配。
- [开发者1.2 PlayStation博客](https://blog.playstation.com/2020/12/11/genshin-impact-v1-2-get-ready-to-chill-in-dragonspine/)正文可读，但主题为龙脊雪山，不提供甘雨技能细节，排除作技能证据。

再次定向检索官方作者+Trail of the Qilin/Frostflake，返回玩家攻略与KQM，未找到新的可读官方技能正文；不以平台域名或攻略引用官方图片替代作者核验。未观看/转录视频，未读取图片中的技能文字。75逐卡source_verified仍false，双STS原文/中文命名/人审HOLD不变。这两份可读官方人物资料缩小的是身份语境缺口，不是75份机制来源缺口。

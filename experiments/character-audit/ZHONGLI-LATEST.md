# 当前冻结更新：75候选（末批技术独审待确认）

当前启动器固定local d66de648782917748ebf68385f97880e8780ac78 / remote4c74c3e20188655f678cfa662b551f39dbdaadba，tree26b3be14663ae59d7803f0bdbafdcd81dc750bc8。完整75候选及遗物已备份，不代表75有效设计或正式批准。共享run切到v37研究池71暂定common，基础01/02及稀有05/非常见10不在奖励池；后两者仍无自然渠道。all可看全目录但不冒充自然构筑。

battle.mjs与49冻结版逐字无差异；新增数据/模型效果由作者独审负责，共享仅验公共API、75目录和v37奖励编排兼容。HP/Power/遗物重置与三房语义不变。以下49版记录保留为历史，旧内容树不再被当前便捷启动器接受；如需复现旧版请用旧工具固定提交。

---

# 历史：钟离共享单战49候选冻结快照

作者确认本地8c450b579be834719eb1697e6d9dac1dd9335beb已独审，对应远端bd7b050774e28c22808e0e0c30348b2881fbae5e，同树6e46c2d07a2f626fad6dcd233eb168c448be518d。作者工作树正在生产后续卡，不能直接加载其脏目录；使用独立固定干净检出。

共享命令：`node experiments/character-audit/play.mjs ROOT zhongli EXACT_HEAD 37 starter`（或all）。EXACT_HEAD为检出自身完整SHA。只有49候选，不冒称75。单战以原battleStart/playInstance/nextTurn驱动；新view补显示counter/pillar/repair，不改变计算和卡值。敌人原始攻击与弱化后攻击同时显示；不公开抽牌序列或RNG。

历史状态（8998feb单战版本）：原journey的fightRoom由自动策略一次打完整场，当时共享工具拒绝钟离run。此限制已由下方新增人工编排适配解除；当前run不调用fightRoom，而逐动作调用原battle API。

v29研究池45张，rare05/uncommon10无自然渠道；均是固定三房/无地图休息商店研究范围。人工all模式不是自然获得。49目录和单战接口回归通过不表示真人、设备或平衡通过，官方逐卡来源/命名继续HOLD。

## 历史49版：独立人工三房适配（已过限定技术独审）

作者已明确同意共享层独立文件归属，未并行开发逐动作接口。新分支feat/zhongli-shared-manual-run增加zhongli-run.mjs，不修改任何钟离模型。

使用同一命令模式`run`。固定v29研究奖励池、每轮原始意图[3,3,3]，不是旧单战交替8/14伤害；界面显示当前实际弱化后的每段意图。逐张牌调用playInstance，结束调用nextTurn，未调用自动fightRoom。胜利前两房才按原offers开奖；`k`领取或`n`明确放弃调用原takeReward，立即进入下一房。HP保留，战斗Power重置，初始遗物新战按原模型应用一次。第三房胜利完成、死亡失败、双方同时死亡判失败，无奖励。无自动20回合截断，玩家可q退出。

session revision继续防重复提交；o/s暂关不支持。history采用manual标识和turnsStarted，不冒充原自动压力的turns/政策统计。此处是研究旅程编排，不是正式地图或自然奖励生成器；v29不覆盖后续新卡，稀有05/非常见10获取仍不支持。

验证覆盖原API逐动作对照、首次胜利奖励、领取/跳过/旧revision、HP继承及Power重置、末房完成、死亡、双死优先失败；双死优先测试用注入终局夹具，仅验证编排分支，不冒称实际牌序造成双死。

主控确认0ebd088（远端0e899481）人工run独审通过。此批准限适配技术范围，不改变49候选、v29研究池、来源/命名/自然平衡及设备HOLD。

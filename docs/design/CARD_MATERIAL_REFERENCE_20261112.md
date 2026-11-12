# 共享卡牌材质与选牌页修复

用户 2026-11-12 明确要求去掉底部黑圆金星，并以其《杀戮尖塔1》「凌虐」截图为质感参照，允许子代理与集成并行实施。此修改依赖整合切片 #634 / `dd57d91c2`，替换现有 official-assets 共享面，不增加皮肤分支。战斗、奖励、商店、永久牌组和战斗牌堆继续共用同一面。

## 实际查看的参照

只作形状、材质和层次分析；没有将外部卡图、卡框或截图加入生产资源。下列页面为 StS1，不能采用页面广告指向的 StS2 新站。

| 职业与牌 | 类型 / 稀有度 | 观察 |
| --- | --- | --- |
| 用户提供「凌虐」 | 攻击 / 稀有 | 红色厚纸倒角，暖暗正文，金色折回飘带，插画下缘尖形。 |
| [战士 Bash](https://maybelatergames.co.uk/spirespy/cards/ironclad/bash/)；[红色攻击牌壳原图](https://maybelatergames.co.uk/spirespy/_ipx/s_600x840/assets/cards/base/ironclad_attack.png) | 攻击 / 初始 | 红框亮面、内侧暗缝和正文材质分开；不是细棕色描边。 |
| [静默 Wraith Form](https://maybelatergames.co.uk/spirespy/cards/silent/wraithform/) | 能力 / 稀有 | 绿色职业壳与金色稀有度飘带独立，圆形插画轮廓；同图中 Acrobatics 为普通技能、Blade Dance 为普通技能、Leg Sweep 为罕见技能。 |
| [机器人 Glacier](https://maybelatergames.co.uk/spirespy/cards/defect/glacier/)、[Echo Form](https://maybelatergames.co.uk/spirespy/cards/defect/echoform/) | 技能 / 罕见；能力 / 稀有 | 蓝色职业壳，圆角矩形与椭圆插画区别；银、蓝、金只控制稀有度层。 |
| [观者 Eruption](https://maybelatergames.co.uk/spirespy/cards/watcher/eruption/)、Strike、Cut Through Fate、Halt、Meditate | 攻击 / 初始；攻击 / 初始；攻击 / 普通；技能 / 普通；技能 / 罕见 | 紫色厚框统一，插画尖底与圆角底独立于职业色，正文用整块暗面。 |

实际查看的完整图组：[静默牌组](https://cdn-ak.f.st-hatena.com/images/fotolife/k/kapeinedoera/20211003/20211003145842.png)、[机器人牌组](https://assets.st-note.com/production/uploads/images/120190738/rectangle_large_type_2_d416fd52d95ba934ee1917a28a03c089.png?width=1280)、[观者五牌](https://assets.st-note.com/img/1746361618-I5KRiVlsXdrcvJ3NAjg6pDwP.png?width=1200)。参考图仅保存在本地 `.artifacts/card-reference/`。

## 落地和缺陷原因

- 原生圆角组做红棕厚纸外框、明亮倒角、内侧暗缝与暖暗正文；加深飘带弧线与折尾，软亮面和暗边分层，保持灰 / 蓝 / 金稀有度语义。插画窗加厚嵌边，不改变图库插画身份。
- 底部 `roleRing` / `roleMark` 是装饰，不是业务状态。所有 official 卡面隐藏它们，surface 恢复路径也保持隐藏；句柄保留，费用、升级、不可打出和命中仍在。
- 「负伤反击」被压成横条来自 `writeBody`：正文不够时启用 `longTextArt=32`，重排单张卡的插画和类型。official 面改为统一 68px 插画槽、124×92 正文槽、最低 14 字号；所有牌固定结构，原文保持。首次四行方案在实际 SDK 投影中出现尾句风险，因此改为五行并重跑真实生产卡扫描。参数由 `ui_theme.json.officialAssets.battleCardContent` 管理。
- 选牌裸金框来自 `panelSurfaces` 将旧 `rewardStage/plate` 替换为整张 `107311` 横板，而 official 管线漏接已存在的 `applyV25RewardLayout`。复用该转换器及其 `v25NodeThemePatch.rewardPick`；依据 [正式采用记录](APPROVED_UI_ADOPTION_20261105.md) 和 `reference-ui-lab/genshin-rooms.css:100–107`：暗场、标题纸带、裸三卡横排、底部跳过。旧 TASK-24 重框台规格不覆盖这次正式采用来源。不增加确认事务或改变领取规则。

## 本轮证据与边界

真实 Fengari `writeBody` 扫描当前生产卡目录，普通/升级、强弱状态和 999 动态值，保持原文与最低字号；另测长文→短文→长文的战斗/永久牌组/商店面复用。静态布局检查覆盖多于 40 个共享卡面、无底部装饰、固定材质、选牌暗场/纸带和跳过位置。

独立 SDK 的原生控件源码投影在 `.artifacts/card-reference/shared-card-material.png`，只用于本轮几何与阅读复核；不是新 GIL 读回、官方导入、手机或 GPU 证据。后续须在合并顶部栏修复后的同一 checkpoint 核查地图、奖励及长文卡实际页面。没有操作用户正在玩的 52711 服务。

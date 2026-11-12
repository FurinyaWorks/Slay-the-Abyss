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

## 同日第二轮：限定细节与成本复核

用户补充要求：框的厚度细节要调好，前提不牺牲性能。复核仍对照前述 StS1 材质，保留第一轮已形成的厚纸框和灰/蓝/金稀有度，不增加皮肤分支。只调整现有图元：

- 纸倒角由 144×204 改为 145×205，内暗缝 137×197、正文井 134×194；角半径分别 7.5 / 6 / 4.5，偏移保留左上亮、右下暗的受光方向，底部正文与内框多 1px 余量。现有上、左、下三条光边透明度为 0.7 / 0.45 / 0.6，不再加一圈框。
- 飘带保持 8 段和原弧线，顶部宽亮带从 4.2px 收窄为 2px，暗边从 4.5px 收为 3.2px；折尾从 23×20 收为 23×18，使边光更清晰、尾部不抢牌面。仍是原 34 个图像项。
- 类型小牌复用既有两层：暖纸 `#D9C8A8`、深墨 `#332B25`，内层 42×15、上移 0.6px，让既有外层形成下缘厚度。色值计算的静态不透明 sRGB 对比为 8.44:1，旧灰底/灰字为 4.25:1；不是设备截图测量。参数均来自 `ui_theme.json`，Lua 更新路径、文字与规则均未改。

同尺寸 1600×900 软件 SDK 前后图：`.artifacts/card-reference/card-detail-{before,after}.png`，对应奖励构图为 `reward-detail-{before,after}.png`。只通过独立 stdio MCP 的 `qxqy_studio_play_screenshot` 直接取 PNG，没有浏览器、窗口操作或 Web 服务。

逐卡、含祖先可见性的同条件计数：两张攻击牌前后都是 243 控件 / 104 可见控件 / 82 可见图像 + 4 文本 = 86 绘制项；技能牌前后都是 243 / 112 / 90 + 4 = 94。正文框仍八层 33 图像，飘带仍 34 图像，类型小牌仍两个图像；已有布局测试增加这两个数量断言，无新测试文件、无新贴图或逐帧逻辑。完整计数在 `card-detail-counts.json`。这里的绘制项不是 GPU draw call。

后台重启后本轮正常退出的有限采样：同一 Node24 / SDK 0.5.2、两个独立静态投影、交替先后顺序，各 3 次预热加 9 次 PNG RPC，前中位 86.79ms、后 87.36ms（约 +0.65%）。原始样本在 `card-detail-software-timing.json`，包含软件光栅、PNG 编码及 RPC；两组均有抖动，不能据此证明加速或 GPU/手机性能完全无损。本轮可确认的是控件、可见绘制项、资源身份和更新频率没有增加；设备成本仍需同候选实测。主题及现有布局 16 项通过。

# 初代 StS PC 选角基准

准确来源：[Interface In Game – Choose your character](https://interfaceingame.com/screenshots/slay-the-spire-choose-your-character/)，其[1920×1080原图](https://interfaceingame.com/wp-content/uploads/slay-the-spire/slay-the-spire-choose-your-character-1920x1080.jpg)。原图版本角标 V2.0 01-21-2020，PC式 Back/Embark/Set Seed，无主机按键提示。原图文件 SHA-256：`4828bd5150c250e0634fa6999d057ef68accd599187d24015c89b833c038a63d`。不采用搜索结果中的 UX redesign，也不以项目 V25 稿为位置基准。

原图仅作测量证据，版权属于 Mega Crit 等原权利人，不进入生产资源或项目分发。本地测量副本在 `.artifacts/style-fidelity-20261113/private-references/reference-pc-1920.jpg`，上述链接与哈希可用于独立核对。大背景保留项目现有可替换宿主。

测量以原图除以1.5映射到1280×720。左名牌约x114/y218，生命金币y290，描述y330，遗物y390；四槽中心约(414,586.5)/(560.7,586.5)/(707.3,586.5)/(854,586.5)。可见槽边长约100，选中金边。红返回左缘贴边，蓝启程右缘贴边，可见旗面高约54。最终唯一参数来源为 [ui_theme.json](../../../data/presentation/ui_theme.json) 的 `layout.stsCharacter`；共享旗面颜色与状态来自同文件 `officialAssets.flagButton`。早期提案已移至 `.artifacts/style-fidelity-20261113/private-references/character-theme-proposal-draft.json`，只保留过程，不作为当前完整参数。

受控实现：原生浅青斜边槽与弯旗匹配上述几何；实际可展示角色仅使用现有 allowsCharacter 白名单，不伪造三个锁槽。原作没有的解锁进度不编造，用现有真实初始牌组信息占该信息区，保持已有查看入口。已有选择、禁用、返回、开始处理器保持同一对象。

用户明确要求用战斗待机形象替换槽内图案。选择与战斗引用同一个 `battleApprovedIdle` 源对象及同一运行时 controller；源图元为210×192、7303行，实际bounds x[-95,65]/y[-94,91]。源坐标crop x[-40,56]/y[0,96]取头肩半身，直接裁剪现有原生矩形，不派生图片、另造头像或保留 selectedInitial 字母占位。源 literal 只输出一次，选择与战斗仅有独立显示实例/生命周期。设备裁剪、字体及背景最终效果仍须官方同候选验收。

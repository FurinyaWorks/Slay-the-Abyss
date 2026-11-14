# 更新日志

本文件遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/) 和 [Semantic Versioning 2.0.0](https://semver.org/lang/zh-CN/)。只记录玩家能看到、能操作、能感受到的重要变化，不复制开发提交或内部技术术语。

**版本说明：** 2026 年 11 月的 `1.1.0` 和 `1.2.0` 按历史开发提交回溯整理，为源码阶段记录，不代表当时已经分别在千星奇域上线。正式平台发布凭证见 [发布账本](data/release/publications.json)，版本对应提交见 [版本一览](docs/versions/README.md)。尚未合入的后续改动保留在 [路线图](docs/versions/ROADMAP.md)，不提前写成玩家已获得的功能。

## [Unreleased]

<!-- 新功能合入并确认正式玩家可用后，先写在这里；发布时才归档进带日期的版本。 -->

## [1.2.0] - 2026-11-12

### 变更

- 重新安排战斗画面的手牌、能量和敌人信息，让重要内容更容易看清。
- 统一战斗、地图和奖励页面的样式，减少不同页面之间的视觉差异。
- 改进卡组和遗物的查看方式，方便在冒险过程中确认已有资源。
- 更新旅行者的待机形象，使角色展示更自然。

### 修复

- 修复部分手机操作中，敌人目标提示与能量信息显示异常的问题。
- 修复部分奖励和卡组界面在切换时出现的显示问题。

## [1.1.0] - 2026-11-08

### 变更

- 调整部分游戏画面的表现方式，使用更轻量的二维视觉风格。

## [1.0.0] - 2026-11-01

### 新增

- 可以使用岩系旅行者挑战第一幕与第二幕，并完成一局冒险。
- 可以通过战斗获得卡牌与奖励，在商店、事件和营地中调整卡组，收集遗物与药水。

### 变更

- 完善地图选路与战斗间的衔接，保留同一局中的生命、金币和卡牌等资源。
- 主菜单显示当前版本号，更新内容通过奇域信息查看。

### 修复

- 修复部分敌人在战斗中消失或刷新异常的问题。
- 修复部分拖牌取消、目标选择和卡组查看异常。

## [0.10.1] - 2026-10-27

### 修复

- 修复「破裂」效果的触发顺序。
- 修复致命伤后的复活与生命变化反应顺序。

## [0.10.0] - 2026-10-27

### 新增

- 扩展第二幕事件、钥匙和战斗内容。
- 支持手柄导航，改进卡牌选取和出牌操作。
- 在主菜单加入可查看的历史更新公告。

## [0.9.0] - 2026-10-26

### 新增

- 新增四位原创角色与 300 张配套卡牌。
- 扩展跨章节的战斗、事件与物品效果。

## [0.8.1] - 2026-10-25

### 修复

- 修复移动端共享背景未铺满画面的问题。

## [0.8.0] - 2026-10-25

### 新增

- 整合 75 张战士卡牌及中文说明。
- 补充药水、特殊事件及探索中的随机变化。

## [0.7.0] - 2026-10-25

### 新增

- 增加部分角色与怪物动作、打击音效及场景音乐。
- 在卡牌说明中显示动态数值颜色及增减提示。

### 修复

- 修复药水使用、奖励领取和战斗交互问题。

## [0.6.1] - 2026-10-24

### 修复

- 修复拖牌误触、重复开局和格挡显示等问题。
- 修复地图选路信息及误导性的状态图标。

## [0.6.0] - 2026-10-24

### 新增

- 接入开场演出与独立战后选牌界面。
- 加入 Boss 宝箱和正常药水奖励流程。

### 变更

- 改进地图导航、敌人意图及状态详情展示。

## [0.5.1] - 2026-10-24

### 修复

- 修复状态说明短按显示与敌方意图预览问题。
- 修复部分地图操作、战斗流程与触控异常。

## [0.5.0] - 2026-10-24

### 新增

- 补充未知房事件、祭坛选项与怪物分裂机制。
- 加入卡牌动态数值、状态及敌方意图详情。

### 修复

- 修正多类敌人行动和战斗结算顺序。

## [0.4.0] - 2026-10-23

### 新增

- 完善主菜单、胜败结算和部分敌人行为。

### 变更

- 改进地图与战斗反馈、卡牌选择和输入处理。

### 修复

- 修复多项战斗规则、敌人行动与操作冲突。

## [0.3.0] - 2026-10-23

### 新增

- 接入 30 张卡牌与拖牌出牌操作。
- 完善商店、营地、事件和宝箱界面。
- 加入查看卡组、敌人行动及基础打击反馈。

## [0.2.0] - 2026-10-23

### 新增

- 加入 15 层路线地图及可滚动的地图界面。
- 连通开局、地图选路、战斗与结算流程。

### 修复

- 修复出牌失败仍消耗资源及满手抽牌问题。

## [0.1.0] - 2026-10-22

### 新增

- 加入基础回合制战斗、起始牌组与奖励结算。
- 接入九种状态效果与旅行者卡牌文案。

[Unreleased]: https://github.com/FurinyaWorks/Slay-the-Heavens/compare/903bf2a31e91f10fb24763ab4cea23d586d0bb83...develop
[1.2.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/compare/a0c35db8d3c7242437f4dff0df373749b0d84985...903bf2a31e91f10fb24763ab4cea23d586d0bb83
[1.1.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/compare/v1.0.0...a0c35db8d3c7242437f4dff0df373749b0d84985
[1.0.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v1.0.0
[0.1.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.1.0
[0.2.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.2.0
[0.3.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.3.0
[0.4.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.4.0
[0.5.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.5.0
[0.5.1]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.5.1
[0.6.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.6.0
[0.6.1]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.6.1
[0.7.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.7.0
[0.8.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.8.0
[0.8.1]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.8.1
[0.9.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.9.0
[0.10.0]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.10.0
[0.10.1]: https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v0.10.1

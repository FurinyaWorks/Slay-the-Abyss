# 可玩轻量2D候选

实现合同：[PR557](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/557)。本切片复用正式菜单、岩旅、Neow、两幕地图/战斗/奖励/商店/事件和胜败结算。Run/Combat、RNG、数值、交易、卡牌输入及原动画时长未改。不是测试菜单。

构建两份独立包（相同源码、内容、art flags，唯一因素为profile）：

```powershell
node scripts/build-native-candidate.mjs <现有非3D底档.gil> build/2d-baseline
node scripts/build-native-candidate.mjs <同一底档.gil> build/2d-candidate --lightweight-2d
```

每次新UUID目录保存完整候选、源码输入摘要、逐模块读回、图元清单和最终GIL哈希。`--lightweight-2d` 固定 cards/monsters=false、menuBackground/selectionAvatar/battlePortrait=true，只允许独立实验，拒绝releaseCandidate。普通入口默认不变。已有3D PR553/556未修改或合并。

角色为原创27图元头像、57图元全身；背景37图元，使用现成原生白矩形/三角。三背景与角色缓存仍各自有界，首次进入全路径艺术动态控件8011→264，另可选图库有独立清单。敌人复用已有官方单图片与父级待机/攻击/受击/死亡反馈；没有每像素Tween。手牌保留当前轻量彩色框及剑盾图标，逐卡精绘仍关闭。未凭未经配对测试的Tween假设替换现有手牌动画。

已证实的稳定帧fallback显隐重复用成功缓存消除；setter拒绝/异常、外部writer、释放重入及引擎销毁继续走原合同。详见本目录diagnosis-baseline.json。图元缩减和mock调用计数不代表手机加速比例。

离线真实Host首房合法输入、出牌、敌回合、领奖回图和一次性结算通过；既有公共命令策略seed2运行669动作至34层双幕胜利、30HP，完整报告与历史9字段一致。受控跨幕合同及合法规则重放，均不能替代官方自然两幕或实体设备验收。

官方导入、新ready、PC/Android帧时、内存、输入延迟、20次往返、容量及逐屏视觉另绑定最终候选取证；缺项保持UNVERIFIED。未满足PR557全部Go条件前，正式路线结论为No-Go（证据未齐），不因此删除3D后备或绕过发布门禁。

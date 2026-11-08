# 可玩轻量2D候选

实现合同：[PR557](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/557)。本切片复用正式菜单、岩旅、Neow、两幕地图/战斗/奖励/商店/事件和胜败结算。Run/Combat、RNG、数值、交易、卡牌输入及原动画时长未改。不是测试菜单。

从核验过的无额外图/挂载空底构建三份独立包（相同源码、内容、art flags）：A→B只换艺术图元，B→C只换卡框装饰。

```powershell
node scripts/build-native-candidate.mjs <现有非3D底档.gil> build/2d-baseline
node scripts/build-native-candidate.mjs <同一底档.gil> build/2d-candidate --lightweight-2d
node scripts/build-native-candidate.mjs <同一底档.gil> build/2d-art-only --lightweight-2d --legacy-card-frames
node scripts/build-native-candidate.mjs <同一底档.gil> build/2d-page-lifecycle --lightweight-2d --native-page-lifecycle
```

每次新UUID目录保存完整候选、源码输入摘要、逐模块读回、图元清单和最终GIL哈希。`--lightweight-2d` 固定 cards/monsters=false、menuBackground/selectionAvatar/battlePortrait=true，只允许独立实验，拒绝releaseCandidate。普通入口默认不变。已有3D PR553/556未修改或合并。

`--native-page-lifecycle` 是另一个默认关闭的候选选项，须同时指定 lightweight，拒绝 RC、非布尔 API 值及重复/畸形 CLI 参数；不扩充 artwork schema。始终生成独立 `abyss_ui_profile`（schema1），入口只读一次配置并把布尔快照传给 platform；模块、配置摘要及实际源码均绑定收据，固定源码审计重新生成对应开关。不开启时不读取原生 active/SetActive。开启时 nodePanel 仅在真实 Run 且 mode=node 时激活，choicePanel 仅在真实 Run 且 choiceUI.visible=true 时激活；其余阶段停用这两个原生页。没有改其它页面、根 Lua/update 或业务刷新顺序，也不用 inMenu 猜测胜负/强制选择。

平台 helper 只在两页方法预检、setter 成功且读回一致后缓存；每次 setter/读回及最终 sweep 还验证 epoch、Run、mode、choiceVisible 快照。false、原生异常、同步重入、策略漂移或两页状态不一致都拒绝本轮，不模拟 SetVisible 成功，不承诺原子快照或回滚。choice 原有 refresh 先访问 inactive 句柄、同次页面刷新再激活的顺序保持；真实 Host 以现有岩旅战吼和确定牌组夹具，通过合法出牌、强制选牌、退出遮罩往返与 confirm 退回 inactive，不能替代原生边界验证。源配置生成器也纳入输出覆盖输入保护；相关失败、隔离硬链接负控及回归保留在本轮产物中。

选择这一切片来自真实 PC E1 诊断：同一游戏配置（3840×2160 无边框、渲染0.8、VSync开、临时FPS60）下，C60菜单/选角31.737/33.767FPS、P95 38.3374/36.2174ms；只停两隐藏页的 E1 为51.696/53.648FPS、P95 22.8933/20.9797ms。E1 原生日志含两页 false→true、合法 Neow+8HP→地图→战斗；仍是 sourceDirty 诊断身份，不能冒认本次 clean 开关源码或新候选已经导入。单次顺序短窗、温度/缓存/后台未控，E仍低于60，不构成稳定因果、手机或完整两幕验收。原12窗属于FPS30组，不与新60窗混算；1920×1080仅是工具截图尺寸。新源码仍须独立评审、精确 SHA CI 和新候选真实导入/设备验证，正式发布保持 No-Go。

阶段策略另由 sourceDirty E2b 实际自然完成480秒 runner，84条原始打印，无 UNAVAILABLE：Neow 节点激活、地图/战斗停用节点页、完整首房胜利、88/88HP、金币99→115、选牌10→11并回图。其双史莱姆战斗安静短窗49.143FPS/P95 23.9706ms是单一未配对观察，不算战斗加速比。自然流程尚未触发 choiceNativeActive=true，明确 UNVERIFIED；Host 的战吼强制选择只验证当前真实 Lua 的语义，后续新 clean 候选必须尽量补原生该分支，不能据此宣称全 UI/手机或发布门禁通过。

静态界面另有14051控件，不能与艺术动态264混算。C将60张预置卡面的13组分片装饰换为单片彩色矩形，静态布局14051→11111；deck模板144→95。语义父容器、文字、费用/剑盾/角色图标和输入保持，CardSkin默认六分实现保留，flat分支不吞原生错误。B保留14051控件，可单独比较艺术替代与卡框简化，不能用同时改变两项的A/C宣称单项加速。

最初底档的严格审计保留6项失败：5项经独立逐字段核对为reader省略默认minFontSize=20/空children；对应两组先红后绿及其余负控保留，审计只规范化这两类默认。第6项是已挂载旧BGM图的真实残留，改用无额外图空底重建，不用--bgm冒认或放宽图计数。

角色为原创27图元头像、57图元全身；背景37图元，使用现成原生白矩形/三角。三背景与角色缓存仍各自有界，首次进入全路径艺术动态控件8011→264，另可选图库有独立清单。敌人复用已有官方单图片与父级待机/攻击/受击/死亡反馈；没有每像素Tween。手牌保留当前轻量彩色框及剑盾图标，逐卡精绘仍关闭。未凭未经配对测试的Tween假设替换现有手牌动画。

已证实的稳定帧fallback显隐重复用成功缓存消除；setter拒绝/异常、外部writer、释放重入及引擎销毁继续走原合同。详见本目录diagnosis-baseline.json。图元缩减和mock调用计数不代表手机加速比例。

离线真实Host首房合法输入、出牌、敌回合、领奖回图和一次性结算通过；既有公共命令策略seed2运行669动作至34层双幕胜利、30HP，完整报告与历史9字段一致。受控跨幕合同及合法规则重放，均不能替代官方自然两幕或实体设备验收。

官方导入、新ready、PC/Android帧时、内存、输入延迟、20次往返、容量及逐屏视觉另绑定最终候选取证；缺项保持UNVERIFIED。未满足PR557全部Go条件前，正式路线结论为No-Go（证据未齐），不因此删除3D后备或绕过发布门禁。

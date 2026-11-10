# PR #588 战斗整页离线候选 · 2026-11-10

本轮只做战斗页。结论：**可试玩，目标视觉与“完全不卡顿”仍未通过验收**。没有启动原神或官方千星沙箱，没有合并、发布。

## 继承与身份

- 延续 #588 和已有本地视觉提交，构建时 HEAD `35ef251f03b3e60e76a140f4d32d8ee311f51b5f`，`sourceDirty:true`；未将其冒充干净提交构建。
- #588 保留 #582 的精确依赖 `06bc84ee`、控件生命周期、隐藏准备、缓存及回收。复用既有实际 SDK 导出与 Simulator 0.5.2 投影；不重做核心、数值或 RNG。
- 候选 buildId：`7759f3ce-6669-4c42-b391-0ff11a296ce7`。
- GIL：`build/pr588-battle-candidate/7759f3ce-6669-4c42-b391-0ff11a296ce7/candidate.gil`。
- GIL SHA256：`66d37dc4870a1a5350d7e2274702c9be20fdb68afd682f2ebe7d7e5964404497`，13,443,198 字节。此数值不是官方关卡容量读数。
- 本机证据根：`.artifacts/battle-complete-20261110/candidate-preview/`。完整 readback、adapter-receipt、源码收据、截图、SDK 原始报告与浏览器样本留在本机；不提交私有原稿和第三方二进制。
- GIL 实际读回转换 12,097 个节点及 359 个 Lua 模块；逆向复核 0 faults。`pr588.actual.save.json` 保持实际 GIL Lua 原文，SHA256 `d6b61592d3607b3b731b10e1a2306105374e7e1b2c9fd6fd7159d9f3a0c43ad2`。

## 实现与视觉检查

继承冻结 V25 战斗构图，覆盖舞台、卡面、临时像素主角、双敌、HP、格挡、状态、意图、能量、结束回合、牌堆、顶部工具与出牌反馈。主角按 Owner 本轮指示复用既有像素小人：57 个矩形、实际持有 59 个含容器控件，沿用原回收器；选角素材不重制。场景仍为 261 个静态语义控件，不重新走旧 PNG 数千图元重建。

修复经过实际截图发现的三类问题：

1. 原生场景三角拼缝：预混透明色、使用不增加控件的 0.45px 边缘覆盖；保留门洞和原几何面积校验。
2. 官方纸纹 107253 在 Simulator 默认九宫格下窄标题中心消失：复用 `native-component-regular.mjs` 的原生图片模式映射，零/缺省为 Basic，1 为 Stretch。实际读回明确翻译默认值，逆向检查图片类型；不修改 GIL 来伪造画面。
3. 费用素材 107202 不在本地 Simulator 图库白名单，改用已有 107270；费用中性字改深墨，动态红绿语义保持。战斗标题运行时使用纸面深墨，其他主题回退原色。

使用既有 approved-v25-native-web 投影，它只移除 Simulator 通用蓝色样例按钮底绘，保留原生状态子图、命中与脚本。软件 WebGL 无头浏览器实际检查完整五牌与十牌画面；实际拖动完成防御、攻击、第三张牌、结束回合，看到 3→2→1→0 扣费、5 点格挡、敌人 32→26 HP、弃牌增加、弱化和下一回合。截图为本机真实渲染，不是原型画面。尝试录屏但导出超时，目录未得到可验证的视频，因此不交付或计入成功录像证据。

**视觉未通过项：** 官方怪物目前仍是图库图像式造型，与冻结稿的菌怪、落地阴影和材质不一致；背景原生近似仍有色调及软边差异。主角是获准的临时占位。未逐一视觉覆盖所有敌人、所有牌和所有特殊状态；不能称全页最终美术完成。

## 同候选性能

五牌和十牌夹具仅在实际读回 save 的 GameUI 创建入口注入离线直达战斗：固定 replay seed42、现有 full-source 非 campaign 入口、合法 Small Slimes 双敌；十牌调用实际 Combat.draw 达到十牌上限，恢复现有战斗编队坐标。保留原/新模块与输入 SHA。Core、卡牌、HP、能量与战斗规则未改。**夹具的 GameUI Lua 不是逐字相同的 GIL Lua**，报告已显式 `actualGilLuaExact:false`；不能冒充官方自然开局验收。

数据为实际 SDK/Fengari **CPU update** 耗时，非 GPU 帧率、非官方客户端 FPS。每项原始样本在 `perf-five.json` / `perf-ten.json`，前后输入哈希稳定，faults=0。

| 场景 | 五手牌 | 十手牌 |
|---|---:|---:|
| SDK 冷初始化 | 1926 ms | 1902 ms |
| 稳态 120 updates，P95 | 12.86 ms | 11.87 ms |
| 连续真实出牌数 | 3 | 3 |
| 连续出牌 update P95 | 25.47 ms | 27.33 ms |
| 连续出牌 update 最大 | 56.50 ms | 88.99 ms |
| 20 次牌库开/关后活控件数 | 12073，稳定 | 12073，稳定 |
| SDK 销毁所有根后的句柄数 | 0 | 0 |

两个夹具还验证实际选牌取消、敌方回合及下一回合。全部运行时控件 12073 包括其他隐藏页面，不是战斗 PNG 图元数。20 次牌库开关不等于 20 次地图/战斗换场；根句柄清零不等于 GPU/操作系统内存已释放。SDK portrait-ready/feedback-idle 不等于整页首帧纹理全部加载。

真实浏览器另存 `browser-samples.json`，在十牌连续拖牌和回合反馈期间计时 Pixi applyScene/render：484 次、P50 4.9 ms、P95 8.2 ms、P99 10.6 ms、最大35.5 ms，采样窗口37.71秒。采用本机无头软件 WebGL；仅据其描述投影绘制耗时，不换算官方 FPS。测试中曾累积多个自建会话导致请求超时，已停止该服务并以干净单会话重新取证；插桩闭包错误的旧截图及非最终候选保留在历史 preview-v*，不作为成功证据。

## 验证与边界

- 最终相关 22 项既有测试通过（官方候选配置、真实 Host 交互、战斗十牌/双敌/拖牌/C 模式、场景合同）；没有靠新增数量代替画面。
- 最终 `check:engineering` 通过：344 模块、5872/5872 测量，无新增 Luacheck 诊断；四个关键变异被原断言捕获、原生 UI 生命周期 6/6。
- JavaScript syntax、普通 `check:platform-load` 通过；后者是默认生产 manifest，不是本候选官方容量。完整 `npm run check` 与本轮远端 Full 尚未执行/通过，不沿用旧绿灯。
- 独立 `/root/battle_review` 复核，无未解决 P1/P2；最后 15 文件排序 SHA 映射摘要 `f30dea2ee65a1492d9da299f30d248a4a80d56ac5caaddae5879259516c7eff0`，独立只执行场景 8 项，未声称视觉认可或全套测试。
- GIL 写入、实际读回：通过。官方导入、新 ready、官方 PC/手机性能、GPU/系统资源及官方容量：**NOT RUN / UNVERIFIED**，按用户本轮边界不打开原神。
- PR 保持 Draft；保留 #582 依赖及 #588 线性历史/Full 门禁问题，不合并、不发布，不改门槛。

因此“官方素材拼装能否既达到目标视觉又完全流畅”本轮仍是 **No-Go / 未证实**。候选用于实际试玩和判断差距，不是最终验收通过的成品。

## 本机复现

```powershell
node scripts/native-candidate-preview.mjs <candidate.json> .artifacts/<新目录>
node scripts/battle-preview-scenario.mjs .artifacts/<新目录>/pr588.actual.save.json .artifacts/<新目录>/battle-playable.save.json
node scripts/battle-preview-scenario.mjs .artifacts/<新目录>/pr588.actual.save.json .artifacts/<新目录>/battle-ten.save.json --ten
node scripts/measure-official-battle.mjs <fixture.save.json> <既有SDK-export.mjs> <新报告.json>
```

本轮本机试玩入口预载 `battle-final`，正常五手牌；页面刷新重新开始。服务须从本工作树启动并保留：

```powershell
node .artifacts/approved-v25-native-web/dist/server.js --workspace . --file .artifacts/battle-complete-20261110/candidate-preview/battle-playable.save.json --port 4174
```

访问 `http://127.0.0.1:4174/editor/play#battle-final`。这是离线 SDK 直达战斗夹具；可拖牌，也可点牌再点目标/出牌区域，重复点同牌取消。不是官方千星沙箱或已导入的游戏关卡。

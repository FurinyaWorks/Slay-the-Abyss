# 自然双幕动态树的离线几何诊断

本次只读取 `../campaign-validation/final-seed2/visual-scenes.json`，生成21个场景的HTML、PIL PNG与诊断JSON。没有重跑Host，没有启动浏览器，没有下载图片，也没有修改任何源码。PNG均写有“离线诊断，非官方客户端”，是PIL几何文字示意，不是浏览器、Simulator或官方SDK截图。所有SDK纹理继续为未知框，不以人工画面冒充真实美术。

运行命令：
`node scripts/official-assets-preview.mjs .artifacts/pr588/visual-natural .artifacts/pr588/campaign-validation/final-seed2/visual-scenes.json --raster`

## 源身份

原自然执行闭包：`f54d388556db5e5c6b4c4ab0cd1a8610c0ef35fc5f6f50afc8e183055e9abcab`。
输入树/玩法报告SHA256与各PNG哈希见 `report.json`。`source-hashes.json`和`source-integrity.json`仅绑定这次渲染过程，确认渲染期间输入源码未变，不冒称新版本Host重新采集。

原始长跑树早于nativeActorPower导出模板修复。旧导出把power控件当成MonsterActor，其图标/层数字段可能缺失；本目录保留原树，不靠修源后的renderer声称完成重新采集。真实SDK四态交互、动态power视觉、纹理乘色和设备安全区仍未验收。

## 实际覆盖与查看结论

- `victory.png`：真实胜利结局，四个统计底面均为官方107311、白色乘色。动态值为34/34层、18胜、19:53、23牌。几何文字诊断未发现溢出、舞台越界或同级命中重叠。
- `act-transition.png`：真实第一幕首领宝箱领取后的“前往下一幕”入口；0文字溢出/舞台越界候选。图中仍是宝箱房间承载跨幕，不虚构另一个跨幕美术页。
- `shop-act2.png`：实际第28层商店，删牌说明font20/min14已在自然动态树生效，与75金币价格分离。0溢出/越界候选，不再只是布局差量证明。
- `battle-act1.png`、`battle-act2.png`：各幕第一场真实战斗，仅各1个顶层敌人。两图都捕获了初始抽牌动画：5张牌位于[-568,-300]且scale0.16。因此不是正常静止手牌视觉样本；边界和重叠告警不能直接当作最终手牌布局缺陷。
- 第二幕树出现的另外2个“AbyssMonsterActor”位于statusRow/actorPage，是旧power导出误分类，不是多敌。此自然树没有双敌场景，也没有Boss战斗画面；不可拿独立十牌双敌压力夹具替代。
- `event-act1`的option1/3说明在PIL下有2个行高候选告警：20px文字、40px高的两行文本按1.3行距需52px。`character`有3个同类候选。原生字体/行距仍需核实，不仅凭PIL判真实裁字。
- 其余自然菜单、Neow、地图、奖励、营地、宝箱及重开页面均已生成；具体数值见`raster-diagnostics.json`。未用本图声称官方画质通过。

独立行为长跑证据由上游campaign报告负责。这里仅陈述保留下来的树实际包含什么、以及离线渲染能检查什么。

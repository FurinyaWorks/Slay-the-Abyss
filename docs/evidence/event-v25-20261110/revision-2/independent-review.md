# R4 独立复审：房间主题隔离与实际视觉

2026-11-10，reviewer /root/map_review。基线 HEAD fbe7051b6e8698e43ba9c179e2307943a96c8491，审查当前未提交主题隔离增量。未修改产品文件；本文件与摘要仅为独立评审产物。

## 隔离结论

本轮主题迁移没有发现新的 P1/P2。明确限定：此结论针对新增房间 tokens 的传播边界，不表示所有既有 V25/map token 与 #588 全面隔离，也不表示视觉验收通过。

- `data/presentation/ui_theme.json` 从 `v25Battle.layout.nativeNode` 整体移出的对象与新的顶层 `v25Nodes` 深相等，无键/值遗漏。
- `scripts/v25-layout.mjs` 在克隆 source、合并 v25Battle 和 v25NodeThemePatch 后，只对最终 `theme.layout.nativeNode` 合并 `source.v25Nodes`。没有改默认 `source.layout.nativeNode`，也没有把 nativeNode 放回 v25Battle.layout。
- 独立将 HEAD 旧主题与当前主题分别送入等价 V25 合并路径，完整有效 `layout` 深相等，输入对象合并前后深相等。输出：`MOVED_TOKENS_EXACT; EFFECTIVE_V25_LAYOUT_EXACT; INPUT_UNMUTATED`。
- 已读取并核对并行 `pr588-playable/scripts/official-assets-layout.mjs:19–45`：真实 officialAssetsTheme 以 `Object.keys(source.v25Battle.layout)` 选择 approved.layout 中的键（31行）。迁移后其选择列表无 nativeNode，因此不会把本轮 referenceButtons、referenceIdentity、shop/camp reference、cardReference、event.reference 覆盖到 official-assets 候选默认房间布局。
- 新测试准确镜像上述实际选择表达式，并断言普通房间对象完全未变、cardReference缺省、V25正确得到paperImage和referenceButtons。此处是与当前并行实现核对过的合同测试，不是直接导入并行函数的端到端测试；若未来其选择策略改变，需要同步核对。
- 顶层 v25Nodes 仍存在于克隆主题的源元数据中，但运行时房间控件读取的是 layout.nativeNode；仅保留原始元数据不等于启用这些表现。当前新增迁移没有修改 #588 文件或战斗布局调用。

## 定向验证

- `node tests/v25-event-readability.test.mjs`：3/3 PASS，包括新增隔离合同。
- `node tests/v25-node-layout.test.mjs`：前5项 PASS；第6项真实事务生成因本审 sandbox `spawnSync python EPERM` 被阻止。未通过的这项不能声称本轮独审全绿，亦没有证据显示为产品逻辑失败。
- `git show HEAD:data/presentation/ui_theme.json` 对照当前 JSON：全部迁移 token 一致；完整有效 V25 layout 一致；调用未改输入。
- 未重跑完整测试或官方导入，没有修改生产代码。

## R4 四图实际视觉复看

亲看 `.artifacts/event-fidelity-r4/browser/{cleric,shop,camp,treasure-open}.png`，仍对照本地批准稿，未公开或复制私有reference。R3详细偏差见 event-fidelity-r3-review.md。本次改进和未完事项如下。

| 页面 | R4 已改善 | 仍存在的具体差异 |
|---|---|---|
| 事件 | 身份名恢复；主体板已回y170..660；选项色块有效宽回约700，纸带/淡Q/44行/语义色保持 | 正文仍约26px行距而原稿约32.5px、无明显段间留白；无衬线字体与标题字形差异；黑板边缘硬、缺原稿柔影。实际对白更长属真实内容，不要删除或替换成样例来凑图 |
| 商店 | 费用球从米白改金色；遗物改淡灰绿；删牌恢复两行金标题及厚灰框 | 卡面外壳仍是平矩形/薄金边，缺纸壳卷角、纸纹与厚度；宽亮青横条的平面感明显，费用章虽金色但仍缺原稿暗轮廓层次；卡图/类型黑椭圆相对原稿仍偏大偏硬；无衬线。不能因采用原生纸面ID就判定材质达到 |
| 营地 | 左右选择牌角度方向已纠正，右牌有底部暗影；标题/共享预告/曲线火保留 | 人物主体仍缺失（批准稿x0..375/y333..720）；“呼……”字形非斜体衬线，标题较细，原稿两牌边缘/圆角/纸厚更自然；暖光晕仍偏低平；实际预告两行与原稿单行不同属内容适配，非玩法错误 |
| 宝箱 | 主领取金字深底清楚；身份名已出现 | 全局字体与HUD差异；按用户最新要求不提出箱体重做，不以无参考样本自设逐形门槛 |

跨页顶部身份名已恢复，但约x44起，原稿x24；原稿右侧“地图”文字/卡组小图标/齿轮仍被当前圆形按钮和左上返回/地图图标替代；顶栏字体仍不同。药水虚环位置保持接近。共享HUD归属需要与#588协调，未验收不等于可以越界改其工作树。

人物/字体限制与设计差异必须分开：当前没有已验证的人物完整立绘接入路径，是尚未解决的能力/素材证据缺口；不能推断平台绝无支持，也不能把缺人物的构图宣布完成。字体同理，需要列明已验证原生可选项。无需用小图拉伸或大量PNG图元造假解决。

## 验收状态

AC1仍未完成。R4缩小了视觉差异，但人物、字体、部分HUD和商店材料仍显著偏离批准稿。主题隔离合同通过、有效布局不变及功能测试通过，只说明这次隔离修复可保留，不构成整体美术通过。官方设备、真实ready和官方启动证据均不由这次静态图复审补足。

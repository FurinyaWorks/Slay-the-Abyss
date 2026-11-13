# 初代 Neow 选项正常态复刻候选

当前是原版参照约束下的正常态候选、真实 Lua/SDK 证据；不是原神客户端、实体手机或最终集成 HEAD 验收。

## 唯一主参照与可重现事实

[CJ Q. 在2021-02-21发表的实机截图](https://mitadmissions.org/blogs/entry/slay-the-spire-as-metaphor/)所附[原始PNG](https://mitadmissions.org/wp-content/uploads/2021/02/1613924743.png)，右上明确 `[V2.2] (12-22-2020)`。1920×1029，SHA256 `329fc67c6183045533b026a1cb5d40002da323729df3f66fcd437e0699495308`。原图仅保留私有参考，不作为生产资源或随本目录分发。

蓝灰主体的像素分类边界（半开区间）为 `[180,688,1060,747]`、`[180,767,1060,826]`、`[180,846,1060,905]`、`[180,925,1060,984]`。同一主体 **880×59**，行步进 **79**。分类谓词：`25≤r≤90,40≤g≤140,40≤b≤145,g-r≥14,b-r≥14,|g-b|≤14`。它证明的是 RGB mask 范围，不是完整透明纹理的精确外轮廓。

主体六点采样轮廓在 `scripts/sts-neow-choice-layout.mjs` 中同源定义；目标画布统一缩放 `2/3`，主体586.667×39.333、步进52.667；触达区单独保持至少44高。暗外边相对主体扩张约2–4原图像素，是带不确定范围的几何重建，未冒充精确原始矢量。字体采用平台现有中文字体与20字号候选，不声称原游戏字体一致。

颜色已从原图核查：绿色文字 `#7FFF00`；红字ROI `(210,850)–(600,984)` 中 `r>180,r>1.5g` 筛选众数 `#FF6563`（1953像素）；白括号ROI `(210,700)–(238,738)` 众数 `#FFFFFF`（70像素）；主体众数 `#29494A`；上缘采样点 `(300,690)=#326668`。上述实测值与暗外边、阴影的重建色分开。hover/pressed/disabled仍保留可用的项目反馈，**原版状态参照未取得，UNVERIFIED**。

当前一/二项的底锚点是项目布局策略；只有四项原图被量测。不能据此推断原作所有数量的锚点都已验证，也不能把1920×1029各轴独立拉成16:9。

## 修复最早失真边界

- official Neow现在明确接入一个共享切角条组件；四条都从同一主体构建，不复用旧80高金框卡片当外观。
- 实时 writer 使用新增 `stsNeowText`，旧title/description句柄保留以供普通事件及既有事务使用，Neow时隐藏两层旧文案。其它事件复用原选项后会恢复原字段与皮肤。
- 奖励与代价来自 `Nodes.view` 保留的 `node.event.rewards[N]` 结构和 `selected.choice=reward_N`。只有 `drawback != NONE` 才按当前 `abyss_neow.description` 的明确首段代价/分号/奖励合同分开；`BOSS_RELIC`按该类型明确的逗号边界分开。`NONE`中即使有分号也全是收益，不臆测第二段为代价。未知格式保留完整中性白文，不丢文字、不猜语义、不改事务。
- `paintButton` 每次render/hover/down/up后显式停用旧状态图和金边，给新切角条状态染色，避免静态换皮随后被旧刷新逻辑覆盖。

## 回归结果

- `tests/sts-neow-choice.test.mjs`：先在旧实现红（旧720×80、居中标题），修复后2/2绿；约束正常态窄主体、独立44高触达区、同一行、旧金框不复活，并故意把sourceSize改回80高验证其不能独立偏离实测轮廓。
- `tests/sts-neow-runtime.test.mjs`：真实 `buildUI` + 真实 `Nodes/NodeUI` 1/1绿；intro→二选项→HP80→88与直接规则命令全状态相同；四个结构化反例分别覆盖NONE内多段收益、代价与收益、BOSS_RELIC、未知格式中性全文；禁用项不能留亮色收益markup或执行命令，hover/down/up与普通事件往返仍保持正确字段和可见层。
- 默认非official `tests/lua/neow_entry_ui.lua` 8项、`tests/neow-readable-layout.test.mjs` 3项通过。旧二行fallback没有被当作新正式样式标准，也没有删掉原fallback事务断言。

测试通过仅证明相应结构、刷新、语义和事务合同，不能代替原版同尺寸视觉/原生渲染质量验收。

## 本轮真实诊断图

早期 `visual-current-1/` 六帧保留在本机 `.artifacts/style-fidelity-20261113/visual-history/neow/`，不随最终证据重复提交。它们来自本轮实际生成的365 Lua模块、未知SDK适配属性0、固定源码闭包 `0b40cb50b4708c7d786195d42752f38bd40eecffd0afba0a7f38c19636f1dfac`。2/4选项各有intro、normal、functional-hover。四选项使用仅注入诊断startup的明确历史替身（bossCount=1），**不是自然competition开局或真实账号历史证据**；生产选择/代价/奖励规则未改。

已实际打开查看`two-normal.png`和`four-normal.png`：窄切角条、同baseline左对齐、完整奖励与代价、无“恩赐N”头和金色方框。四项最长首领遗物换取行没有截断。其余状态仍须在最终冻结后逐图复核。

这轮捕获成功取得六张PNG与各自SDK快照，但末尾live源码hash校验发现并行卡面脚本变化，原收据**正确保留 `status: failed`**。它们是上述archive身份的诊断候选，不是当前live tree或最终集成HEAD证据；该轮也先于最终红字/白括号/高光采样token收敛。没有为此反复重建；最终全部切片冻结后只重取一轮。新capture脚本改为另列liveTreeDrift，仍认证每个输入save和内嵌脚本身份。

复现脚本复用既有SDK投影、readback-adapter及已安装headless Chromium；没有复制SDK源码或原版纹理。`prepare-visual.mjs`读取同仓库shop/deck证据的投影helper；线性整合后不依赖相邻工作树。外部SDK与浏览器仍需按工具索引实际安装。隐藏headless软件WebGL不占用户鼠标键盘，也不代表GPU FPS或实机。

## 用户指出的NPC遮挡与金边修复

本轮人物参照是项目自制批准稿 `reference-ui-lab/blessing.js` 的 `guide()`，不是原版Neow鲸鱼。原SVG paths、Q曲线、绘制顺序和CSS `.sts-guide` 为唯一几何来源。`sts-neow-guide-layout.mjs` 直接复用既有 `v25-character-layout` 的8点Bezier采样及2px silhouette bands，不重写采样器；既有 `nativeShape` 提供原生线/三角形。所有子组≤50项，未放宽原生60项上限。

CSS盒567×580、viewBox600×600默认xMidYMid meet，得到单一scale=.945、画布origin=[739,61.5]。外披风→描边→黑暗开口→身体折面→褶线→袖/杖/宝石/扣的原SVG层序保留；原错误圆盘兜帽和猜测身体已删除。颜色来自同一主题 `officialAssets.neowGuide`。披风渐变使用原首尾色的2px垂直近似，原SVG x2=.3轻微斜率/原生渐变仍UNVERIFIED，不声称全图逐像素一致。

顶栏下露出的金色来自旧 `nodeBackdrop`。最初scene640只从y80覆盖，独立44px值仍会在真实43px HUD底留下1px。最终直接由 **同一 `officialAssets.battleHud.y/height`** 计算 `bodyTop=canvasH/2-(hud.y-hud.height/2)`；scene从该底缘覆盖到底，不再维持Neow自己的HUD高度token。回归同时改变HUD y/height，确保不会再次出现双源。

最终NPC修复诊断 `visual-npc-approved-3/` 实际SDK二选项intro/normal/hover三帧，366模块、未知适配属性0，源码闭包 `1b2268a08fca67f2785ced9e4b520341aa35dad71b38c04919df325d5d001b40`，捕获后runtime输入hash逐项一致、liveTreeDrift为空、JS/Lua/资源错误为空。已亲眼打开normal、独立原SVG同位置图、四列叠图和mask差异图。早期 `visual-npc-approved-2/` 真实四项normal/hover诊断保留在上述本机history；它仍有已知1px旧背景缝及并行源码drift，**不是最终消缝版本**。

`compare-approved-guide.mjs`用原 `guide()` 在同坐标独立渲染；`measure-approved-guide.py`读取真实SDK PNG计算遮挡mask与旧截图负控，详情 `visual-npc-approved-3/guide-comparison.json`：

- 黑暗开口ROI=[930,110,1135,324]，RGB容差2；新图IoU **.9934187**（22491交集/22640并集），高于固定.98。
- 逃逸旧圆兜帽/身体遮挡负控IoU **.6266152**，明确失败，漏掉7701个批准稿开口像素。
- x800的y43原图金色[149,119,86]改为边界抗锯齿[19,30,31]；y44/50/60/70/79均为scene精确[16,28,28]，旧图这些点仍为金色。
- 新 `tests/sts-neow-guide.test.mjs` 3/3、既有选择几何2/2、真实Neow语义/事务1/1通过，`git diff --check`通过。没有改变Neow奖励/代价/迟到输入事务。

这是可追溯软件渲染诊断，不是官方导入、官方ready、GPU或手机验收。与其它切片一起最终冻结/集成后的官方证据仍独立取得。

## 最终组合闭包

`visual-integrated-final/` 六帧来自与选角五帧相同的应用输入闭包 `52b6582bfc5a1eb2507fd6aaa2ced4272db7bd521781ff5ef3d738cdf73c5731`，366个真实Lua模块、未知适配属性0。2/4选项各包含intro、正常态与功能hover。每张额外4次前端render pass；实际pageReveal已撤、当前nodePanel可见，Lua/浏览器/资源错误与liveTreeDrift均为0。`verify-integrated.mjs`核对全部PNG/状态原始摘要、ready日志和批准稿对照，结果PASS。

主线程已查看正常态、四项代价颜色、兜帽暗面与背景衔接。最终同位置mask IoU仍为99.34%，旧身体遮挡负控62.66%；原金色缝隙y44–79均为场景色。没有把软件结果称为官方设备呈现或原版hover逐像素一致。

复现先以新的输出目录运行prepare/capture，再运行`compare-approved-guide.mjs <截图目录>`、`measure-approved-guide.py <截图目录> <旧错误截图>`与`verify-integrated.mjs <截图目录>`。旧错误截图为项目自产诊断，本机默认保存在`.artifacts/style-fidelity-20261113/visual-history/neow/visual-current-1/two-normal.png`；新机器需显式提供该负控输入，不能拿缺失负控当通过。

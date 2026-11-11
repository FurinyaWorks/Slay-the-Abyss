---
id: TASK-25.2.1
title: 岩荧战斗待机动画：保留原构图、整体运动与低负载验证
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-10 09:38'
updated_date: '2026-11-11 11:38'
labels:
  - art
  - design
milestone: m-8
dependencies: []
references:
  - 'https://wiki.hoyolab.com/pc/genshin/entry/2674?lang=ja-jp'
  - 'https://genshin-impact.fandom.com/wiki/Traveler/Gallery'
  - >-
    https://github-wiki-see.page/m/daviscook477/BaseMod/wiki/Custom-Character-Animations
  - 'https://store.steampowered.com/news/posts/?appids=646570&enddate=1542327142'
  - experiments/native-2d-vertical-slice/reference-handbook/RECIPES.md
  - docs/art/CARD_ILLUSTRATION_STANDARD.md
  - docs/backlog-details/TASK-25.2.md
parent_task_id: TASK-25.2
priority: medium
type: task
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**本轮唯一交付：旅行者荧在《杀戮尖塔》式卡牌战斗中的待机循环（idle）。** 原静态构图、站姿、面孔、服装轮廓、站距、持剑角度和左右关系不改。**不制作攻击、受击或死亡专属角色动画，也不新增其验收项。** 现有攻击/受击继续使用游戏已有的**整个人物平移、打击反馈与特效**，完整保留；独立 attack/hit/death 角色动画放到未来体验优化，有需求时另案评审，不阻塞本任务。

### 参照对象与已知技术事实
- **人物外形**：Owner 已认可的荧战斗静态原稿（私有，历史 SHA256 `32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de`）；官方荧立绘/游戏实际造型用于身份核对。禁止重新设计构图。保留现有 V25 与历史像素样本作为技术参考，参照资料在 PR #563、`STA-V25-reference-kit.zip`、Google Drive `低负载角色UI整合包（7.2）.gia` 和 `像素荧.gia`，第三方原件不进公共仓库。
- **动画方法**：[StS1 BaseMod 角色动画教程](https://github-wiki-see.page/m/daviscook477/BaseMod/wiki/Custom-Character-Animations) 说明原作使用 Spine 骨骼/分件动画和 30fps 制作时间轴；[原作更新记录](https://store.steampowered.com/news/posts/?appids=646570&enddate=1542327142) 有待机速度调整及受击回 idle 的历史记录。**这不意味着取得了原作 idle 原始曲线/关节幅度/帧数据，不能称像素级复制或承诺相同节奏。** 只移植成熟的「整体骨架、固定关节与连接、少量次级运动、平滑循环」原则。
- **实际千星实现**：优先用已有原生图元组/父容器/Tween 与生命周期机制（#553/#582、TASK-94），不能将 GIF、Spine 文件或示意图当作可直接导入的原生动画；能保留全身整体质感比追求分件数量更重要。

### 最小交付流程
1. **参考锁定**：保存并核对上述唯一静态基准与原作待机实际画面；标注角色整体外轮廓、脚底支点、躯干、头颈、双臂/剑握持、发丝/飘带/裙摆连接点。记录来源与 SHA；AI 自行做，不要求 Owner 绘画或操作编辑器。
2. **先做整体待机**：整个人物保持同一骨架关系，脚底与剑柄连接不松散；待机以很小的整体重心/呼吸变化为主，**次级摆动只限少数自然连接的头发、飘带或裙摆**。使用正确关节/父子变换、重叠遮挡与统一时间曲线；禁用独立拉伸人物局部、切出错位的接缝、全图抖动、逐帧重新绘脸/衣服。
3. **视觉门禁先于人审**：按 `docs/art/CARD_ILLUSTRATION_STANDARD.md` 的自检＋独立复核检查静态图、每个关键姿势和循环首尾：角色是否仍是一个整体；头/手/剑连接、脚部锚点、衣服遮挡、脸与花饰身份一致；能在**真实战斗展示尺寸**看清是在待机，又不能明显摇晃、扭曲或闪烁。失败自动修正；若分件引起破碎感，**回退整体运动，减少甚至取消分件动画**，不反复放大振幅掩盖错误。
4. **技术落地**：使用现有生成/转换工具产出可回放的待机原型及原生 GIL 单角色候选；记录真实导出图元/控件数、变更调用、加载/完整显示、回合切换和退出恢复。目标尽量低负载：几十图元是优先探索区间，57只是对照目标，**不是同画质必达或已验证的设备安全上限**。如需数百个，须由视觉收益与设备数据解释，不用示意计数代替真数。
5. **人工/设备验收**：把原静态图、原作实际战斗参考、我们的待机 GIF/短录像和游戏实际尺寸同屏对照交 Owner，只需一句话反馈或批准；AI 负责全部修改。真机/PC的原生 GIL、FPS/长帧、对象清理独立验证，未测标为 UNVERIFIED。

### 已否决样例与防回退
- 早期像素荧候选手指异常，已登记为视觉 FAIL，不得作为定稿（私有 PNG SHA256 `0b329362a5d3fae984b42b10d429874ba08cd0526677fd6cb782ac8670324a30`）。
- v1：8帧×230ms，最大位移约3.51原图像素，缩到游戏尺寸后基本不动，**FAIL**。
- v2：16帧×110ms，以分区光学变形增加位移，Owner 指出人物像被割裂、不像一个整体，**FAIL**；不继续按此方法加工，不以其帧数/振幅作为待机规格。
- **不为补救待机而开发攻击/受击动画。** 保留现有整个人物反馈和游戏规则，不额外制造动画技术债。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 原作待机参考和荧原静态构图有来源、身份/画面 SHA、锚点与可见动作说明；未拿到原作关键帧则注明未验证。
- [ ] #2 只交付一个同构图、整体协调、自然循环的荧战斗 idle；AI 自检和独立复核通过，Owner 在实际展示尺寸能看出动作且认可角色整体观感。
- [x] #3 用实际候选核对低资源计数、加载及可见运动；有同一角色图元/控件真实统计而非“57图元”宣称，并能明确说明回退或取舍。
- [ ] #4 独立的待机原生候选可在可用的真实客户端/模拟器验证：循环、战斗进入/退出、中断与恢复可靠，不影响现有整人攻击/受击位移与特效；官方 PC/手机性能按设备分层，未测不得勾。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 锁定批准素材与 develop、PR621 身份，核实官方图片/材质与混合图元可行性。2. 按真实展示尺寸转换一个可回退角色候选，复用生命周期/缓存，保留整体攻击受击。3. 跑 Simulator 可见对照、调用与性能验证，尽可能生成 GIL。4. 独立复审、PR 与证据交付，明确 GO/NO-GO 和官方设备未测项。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11：基于 develop 3a061a76 与 PR621 680be9c5 完成批准原图的原生候选与同条件对照。210px 7303图片/7459角色控件，旧59；SDK完整显示准备3.87s对旧0.09–0.13s，浏览器输入至绘制中位87.5ms对39.1ms。待机2s真实2160父容器setter、0创建；20次牌堆/卡库/地图往返及根清理通过。768混合图元同源实做视觉FAIL；严格脚部像素不变量FAIL。交付可试玩Simulator、GIL副本、实际截图/GIF与数据，正式皮肤替换NO-GO。证据 docs/evidence/lumine-native-idle-20261111/README.md；官方导入/ready/PC/手机/容量未测，AC1/2/4不勾，不标Done。
<!-- SECTION:NOTES:END -->

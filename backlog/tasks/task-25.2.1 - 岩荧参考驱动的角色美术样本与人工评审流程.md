---
id: TASK-25.2.1
title: 岩荧角色美术：静态定稿→Images 2.6 动画→千星验收
status: To Do
assignee:
  - Furinya
created_date: '2026-11-10 09:38'
updated_date: '2026-11-10 09:38'
labels:
  - art
  - design
milestone: m-8
dependencies: []
references:
  - 'https://wiki.hoyolab.com/pc/genshin/entry/2674?lang=ja-jp'
  - 'https://genshin-impact.fandom.com/wiki/Traveler/Gallery'
  - 'https://helpcentre.toonboom.com/hc/en-ca/articles/57086503432083-About-2D-Animation-workflow-steps'
  - 'https://docs.unity3d.com/6000.1/Documentation/Manual/2d-game-creation-wokflow.html'
  - 'https://openai.com/index/introducing-images-2-6/'
  - experiments/native-2d-vertical-slice/reference-handbook/README.md
  - docs/backlog-details/TASK-25.2.md
parent_task_id: TASK-25.2
priority: medium
type: task
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
以岩元素旅行者**荧**（默认服装，不混入 2026 新装）做第一份可复用角色美术样本。采用成熟动画制作的 **参考板→造型探索→定稿角色设定表（model sheet）→动作设计→动画→游戏验收**；Owner 充当美术总监，AI 做可追溯资料整理、有限候选与工程转换。**先静态定稿，再使用 ChatGPT Images 2.6 生成 GIF；静态图未获准不得提前制作动画。**

### 参考与来源（先看原图，不凭口头特征直接作画）
- **角色身份**：HoYoWiki 旅行者原立绘/游戏截图；对照脸、发型花饰、白金蓝衣装、轮廓、佩剑和岩元素特效，具体取舍由 Owner 看图确认。仅做非商业同人，保留来源与许可边界。
- **项目已批准的视觉方向**：私有 V25 与现有游戏战斗角色、头像槽规格；回查 TASK-25.2 与 PR #563 的 reference-handbook。
- **实现参考，不是身份参考**：私有 `STA-V25-reference-kit.zip`（SHA256 `74713d732fd7e557695a847bb596f605a6755e30300030f62cf9fc30006d7700`），含 `像素荧.gia`（SHA256 `e11d41d5e7409a4cf6799a0d1f1d4e8b6bd22e9dcfa4ff55121b9d4b773d2e2c`，192 个场景装饰部件）、动态可莉、低负载角色等；原始审计 `新增像素素材技术核验-20261108.md`。它们只能证明已有的结构/动作办法，不能证明手机性能。
- **动作草稿参考**：`traveler_geo_idle_spritesheet.png`（SHA256 `45ffdae00a10af169576c72b89adeca56d9422d148341a87cfb3aab8ddb35a18`），属内部候选，不冒充正式定稿或官方动画。

公共仓库仅保存引用、哈希、衍生决策和可公开结果；不上传私有Drive链接、第三方原包/贴图。每轮在**同一份简短记录**里关联「参考来源/版本或SHA→具体特征→候选/变更理由→Owner通过/驳回→产物SHA」，不新建庞大表单。

### 轻量工业制作流程（严禁倒序）
1. **Design Brief 与参考板**：确定首个交付用途（战斗区朝右持剑的全身角色、真实屏幕显示尺寸）、风格与关键识别点。官方形象参考、旧 V25、千星实现样例分开标注。由 Owner 确认采用哪些特征。
2. **静态造型探索**：先做 2–3 个低成本轮廓/比例缩略稿；Owner 选一个方向后，才精修到 1 张同尺寸的完整彩色静态角色。按实际战斗画面 1× 展示，优先检查角色是否认得出、姿态和服装是否协调，不盲追原 PNG 像素误差。
3. **Model Sheet 定稿关口 A（必须由 Owner 批准）**：冻结正式战斗 3/4 视角静态图、必要的正/侧结构辅助、头脸和服饰锚点、配色与剑的位置；保存原图、版本/哈希和通过理由。未批准只回到静态修改；禁止并行批量衍生和启动动画。
4. **千星静态可实现性关口 B**：用现有原生图片、低图元/场景元件做**单角色静态竖切**，对照定稿图记录可见画质、控件数和初次完整显示；若现有平台接口无法承载这种画质，先调静态制作路线，**不浪费成本制作动画**。复用已有 #553、#582、#588 和 TASK-94，不再造新导出器。
5. **动作设计→Images 2.6 GIF**：在 A/B 均获认可后，以冻结的同一张静态主图和 model sheet 作为唯一角色身份依据；先设计简短待机动作节奏与关键姿势，再生成可循环待机 GIF，经人审后再做**攻击（起手/命中/收招）**。每段保留提示词、输入静态图SHA、GIF与逐帧结果；逐帧核对发饰、五官、衣装、手脚、武器、视角及首尾连续性。AI 动图可能漂移，必须人工修正，不以 GIF 能播放冒充合格。
6. **转换与验收关口 C**：GIF 仅是动画原型，不能当作千星可直接导入的纹理。拆帧或提取关键姿势，**优先复用**现有原生帧组/显隐/Tween 方法，制作待机与攻击的真实 GIL 候选；人工看真实游戏中的静/动态一致性，再按已有门禁分别验证 SDK、官方 PC 和实体手机的画面、输入、加载与性能。未验则保留 UNVERIFIED，绝不默认发版。

只有荧一个角色通过 A→B→C，才抽取极简「参考→静态→动画→原生适配→审核」配方供怪物/其他角色复用；其余角色、卡图量产不在本次范围内。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 有实际参考图/文件、来源/哈希和关键可见特征的可追溯对照；Owner 选定唯一静态造型方向。
- [ ] #2 一张真实战斗尺寸的静态荧，经 Owner 明确批准并冻结 model sheet / 色板 / 原图SHA；**动画生成前必须完成**。
- [ ] #3 冻结静态图在千星现有接口下有可观察的单角色呈现及成本记录，Owner 决定可进入动画或退回静态方案。
- [ ] #4 在固定静态原稿基础上制作并人工审查待机、攻击 GIF 和逐帧；有身份一致性、时序与来源记录，不混用其他角色或未经批准的变体。
- [ ] #5 至少一个真实可导入候选能按待机/攻击播放；人工画质审阅、官方 PC/手机性能/输入等证据分层记录，未验证项不勾；形成可复用的最小流程。
<!-- AC:END -->

## Implementation Plan
<!-- SECTION:PLAN:BEGIN -->
先跑**静态关口 A**：资料板与两个/三个轮廓候选→Owner选稿→单静态定稿；不抢跑动画。当前PR只登记任务，不能宣称已制作定稿图或GIF。后续游戏接线与测试复用 TASK-25.2、#582/#588、原有资产与真实设备测试；不碰 Core、平衡、CI、默认正式皮肤、发布和新 MCP 资源目录。Sprint/M8准入按当时门禁执行。
<!-- SECTION:PLAN:END -->

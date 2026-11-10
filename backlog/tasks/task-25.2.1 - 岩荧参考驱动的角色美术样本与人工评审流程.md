---
id: TASK-25.2.1
title: 岩荧参考驱动的角色美术样本与人工评审流程
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
  - 'https://genshin-impact.fandom.com/wiki/Rising_Star'
  - 'https://genshin-impact.fandom.com/wiki/Traveler/Gallery'
  - experiments/native-2d-vertical-slice/reference-handbook/README.md
  - docs/backlog-details/TASK-25.2.md
parent_task_id: TASK-25.2
priority: medium
type: task
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
以岩元素旅行者**荧（默认“初升之星”造型）**为首个样本，建立轻量可复用的「明确参考→可追溯特征→少量美术候选→Owner人工选稿→实际游戏验证」流程。**人工审美决策优先**，AI负责参考核实、特征整理、技术尝试和证据记录；不批量制作角色、卡图或另造美术框架。

首轮辨识点：浅金短发与脸侧发束、右侧浅蓝白花饰、金色眼睛、白色短裙/蓝色飘带/金色菱形纹、胸前黑色交叉绑带、白色腿袜与靴；战斗朝右持剑，岩元素金色光效只作可选补充。逐项以所列原图/游戏截图核实，**最终轮廓、细节取舍和风格由 Owner 逐轮确认**，不能凭文字臆造。

首轮参考分级：
- **角色身份（公开）**：HoYoWiki 旅行者官方立绘；Rising Star/Gallery 的默认服装文字、游戏正侧背面截图（社区整理，须回看原图）。
- **已有内部动作（私有）**：`traveler_geo_idle_spritesheet.png`，9格待机参考，SHA256 `45ffdae00a10af169576c72b89adeca56d9422d148341a87cfb3aab8ddb35a18`。这是已保存候选，不等于官方动画。
- **千星实现样本（私有）**：Google Drive `像素荧.gia`（SHA256 `e11d41d5e7409a4cf6799a0d1f1d4e8b6bd22e9dcfa4ff55121b9d4b773d2e2c`，静态审计192个场景装饰部件）、`原神像素角色合集`、`像素可莉（动态）`、`低负载角色UI整合包`；取件和源码索引复用 PR #563 对应 `STA-V25-reference-kit.zip` 与 reference-handbook，不直接搬运他人素材。既有像素素材审计 `新增像素素材技术核验-20261108.md` 已区别“场景装饰物”和“客户端UI控件”，不能拿静态对象数冒称手机FPS。

公共PR只登记参考名称/哈希和公开资料，不上传私有Drive链接、第三方GIA/GIL、原始图片或未获授权的资源。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 一份简短「参考图/文件→来源与版本/哈希→可见特征→保留或简化理由」清单，明确官方身份参考和社区技术参考，Owner确认主要特征。
- [ ] #2 仅对荧制作可直接并排看的小尺寸战斗角色候选（优先复用现有低图元/原生素材/动画方法）；Owner逐轮审图决定继续、修改或拒绝，未批准不批量扩产。
- [ ] #3 至少核验待机与攻击的实际视觉和操控表达；若不能做，给出对应接口/素材限制和真实可复现证据，不拿测试夹具或静帧冒充完成。
- [ ] #4 记录选定方案的源身份、视觉对照、原生控件规模、加载/切页与当前GIL可用性；SDK、PC、实体手机分别标注已测/未测，最终复用最小「来源→特征→人审→实现→验收」流程。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
先由Owner对照上述参考决定荧的外形取舍；仅做单角色竖切和人工对照。复用 TASK-25.2、TASK-93/94 的图元研究、#553 原生Tween/场景实验、#582 生命周期与 #588 官方素材候选，不重复造算法或组件体系。不改 Core/卡牌规则、默认正式皮肤、7.2 MCP素材目录、发布和平台准入；M8执行仍遵守当时 Sprint 领取门禁。
<!-- SECTION:PLAN:END -->

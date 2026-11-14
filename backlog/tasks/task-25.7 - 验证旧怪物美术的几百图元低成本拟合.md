---
id: TASK-25.7
title: 验证旧怪物美术的几百图元低成本拟合
status: To Do
assignee:
  - Furinya
created_date: '2026-11-14 03:03'
updated_date: '2026-11-14 03:04'
labels:
  - art
  - technical-spike
  - owner-review
milestone: m-9
dependencies: []
references:
  - docs/TOOLCHAIN.md
  - docs/plans/2026-11-06-sts-art-render-feasibility-protocol.md
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/650'
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/648'
parent_task_id: TASK-25
priority: low
type: spike
ordinal: 176000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户认为当前大量官方图库ID敌人形象廉价，要求复用仓库很早已绘制的怪物源图，用最新选角/主菜单拟合技术探索自绘替代。必须非常低成本：每只以几百绘图图元为可接受探索区间，不能套用1600选角背景预算。先证明实验能跑通、真尺寸可辨和成本可接受才决定正式采用。本任务是旧源图技术验证；TASK-25.6已在另一执行者进行敌人/遗物缺项简图补齐，不重复接管其接线；TASK-25.5旧资产核对与接入也保留。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 盘点既有怪物源图、角色身份和当前采用情况，保留原精绘与来源；优先复用适合当前两幕敌人的原图，身份已被否决的旧源不得当正式新稿
- [ ] #2 选少量不同轮廓和色块复杂度的真实代表，按约100/200/400绘图图元做同源对照；如有必要额外档位须单列，报告绘图、宿主、容器、蒙版和整屏多敌人总控件，数百区间是探索目标而非平台安全结论
- [ ] #3 在真实战斗显示尺寸提供原图、原官方形象、实际原生重建和必要放大图；轮廓、姿态、关键配色与敌人身份可辨，经独立视觉检查和用户确认；不以只看大图或离线误差代替可用性
- [ ] #4 独立可运行样品实际验证显示、命中与意图血条对齐、切换复用、中断/退出与释放；统计真实载荷和创建/变更调用，官方容量、PC/手机未测明确标为UNVERIFIED
- [ ] #5 依据同条件画质和资源实测给Go/No-Go及逐项取舍；实验通过并获用户批准后才另行正式采用，不批量替换官方ID、不把已有素材或生成成功当实验通过
<!-- AC:END -->

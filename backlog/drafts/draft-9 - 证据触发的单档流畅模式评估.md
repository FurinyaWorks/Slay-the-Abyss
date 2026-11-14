---
id: DRAFT-9
title: 证据触发的单档流畅模式评估
status: Draft
assignee:
  - Furinya
created_date: '2026-11-14 20:47'
updated_date: '2026-11-14 20:47'
labels:
  - performance
  - technical-spike
  - deferred
dependencies: []
references:
  - TASK-4.21
  - TASK-38
  - TASK-100.1
  - TASK-100.2
  - scripts/art-features.mjs
  - docs/PLATFORM_LOAD.md
priority: medium
type: spike
ordinal: 172000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
2026-11-14 Owner 评审结论：**暂缓，不开发、不绑定 milestone、不进入可自动领取的正式任务池**。只有 TASK-4.21 / TASK-38 的同候选实体手机证据表明，现有画质和针对性性能优化后仍有明确不可玩场景，且降低非关键表现确实可能使其可玩，才讨论转为正式任务。优先复用 TASK-100.1 的生命周期和既有构建时美术开关；不重造画质框架。

项目的 `--art-*` 是构建时开发者开关，不是玩家实时设置；未打包的素材无法由运行时选项恢复。没有千星 Lua 能修改《原神》客户端 FPS 上限/实际渲染分辨率的可靠证据。不得隐藏牌名、牌效、费用、敌人意图、目标/交互反馈等关键可玩信息；不做三档自定义画质系统或所谓「无图标极限模式」。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 从 TASK-4.21 / TASK-38 引用具名同候选实体设备、复现步骤、冷暖加载、交互帧时/卡顿、内存或生命周期证据，证明常规优化后仍有具体受阻路径；仅凭市场样本或模拟器计数不成立。
- [ ] #2 核实现有打包美术开关、运行时切换能力及完整包体成本；若平台不支持真实可用的玩家切换，不展示虚假的设置入口。
- [ ] #3 仅在门槛满足后做最小单档 A/B：同设备、同候选、同玩法和输入，报告启动/切换、帧时 P50/P95、资源峰值、操作成功率与可读性；关键内容和触控必须完整，缓存/隐藏不能冒充实际释放或加速。
- [ ] #4 形成收益、适用设备、实现及维护成本的 GO/NO-GO。无可复现的净收益则明确放弃；未获 Owner 后续批准不得开发正式入口、调整正式候选或自动合并。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
仅保留评审草案。现有 PR #374 已有构建时美术开关；PR #648 的 400/800/1600/3200 图元实验不构成手机画质档位收益证据。2026-11-14 决策为「暂缓」而非「排入本期」；不改变任何现有任务状态、AC 或优先级。
<!-- SECTION:NOTES:END -->

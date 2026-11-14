---
id: TASK-107
title: 评估低控件精品卡牌插画的可行性（可选后置）
status: To Do
assignee:
  - Furinya
created_date: '2026-11-14 12:33'
updated_date: '2026-11-14 05:50'
labels:
  - art
  - technical-spike
  - isolated-research
dependencies: []
references:
  - docs/art/CARD_ILLUSTRATION_STANDARD.md
  - docs/art/READY_ASSET_INTEGRATION.md
  - docs/art/LOCAL_CARD_ART_BUILD.md
  - docs/TOOLCHAIN.md
  - docs/backlog-details/TASK-104-PRODUCT-OUTCOME-LOOP-20261109.md
  - experiments/art-tech-lab/README.md
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/648'
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/650'
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/654'
priority: medium
type: spike
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-14 最新授权：**允许启动隔离研究，优先级 medium（中）；发版集成仍优先。** 本研究无 milestone、无截止日期，不成为当前版本依赖或阻塞项；保留可选研究性质，不构成量产或正式启用授权。此前“仅登记、待再次授权”的启动限制已由本次明确授权替代。

在独立研究分支评估在千星奇域平台用低成本**真实原生控件**制作合格二次元卡牌插画的可能性。目标风格：`Clean, cel-shaded low-poly / flat-shaded polygons anime style, with sharp faceted geometric shapes, large flat color blocks, minimal gradients, crisp outlines.` 144×64 小画窗必须看得出人物身份、技能动作、轮廓及层次，不能是廉价几何图标；不能用生图海报、普通 PNG 或离线面片数冒充原生运行效果。

历史失败：75 张旧职业卡约 180,873 矩形（逐卡 2,072–2,656）；146 三角形自动拟合严重失真；后续约 72–100 形状直绘虽数量下降，但 Owner 明确判定视觉质量不合格。这些样品均不是获准量产的视觉基线。历史图元计数不等于最新游戏控件峰值或设备性能。

与现有 TASK-25.2（正式样卡制作）、TASK-93/94（通用图元、原生加载研究）、TASK-10.1.2（平台多卡容量）相区分：本任务**只为是否值得投入精品低控件卡图提供视觉+原生可行性的独立决策**，不改写上述任务、不成为当前版本依赖或阻塞项。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 按 Owner 本次明确授权启动隔离研究，核对最新 develop、现有任务/PR、官方能力及素材许可；复用现有 Image Editor、Primitive Shape、原生图元/图库、卡面组件、SDK/Simulator、PR #648/#650/#654 的实际可用成果，不另造平行框架。
- [ ] #2 先选两张不同复杂度的实际技能（如星陨剑 `cleave`、整备武装 `armaments`），核对真实 card_id/效果与角色身份；每张做不同构图的方案，并交付原创源、144×64 实际1×、放大、完整卡面和**真实原生重绘**。独立美术评审检查构图、动作、人物/技能识别和整体专业感；Owner 未认可时不得量产。
- [ ] #3 单张插画新增实际原生控件以100为理想、150为试验预算上限，分别计数形状、图片控件、分组/容器/蒙版与新增总量；这些数字是研究目标，**不是平台承载能力已通过**。不得用离线多边形、单张PNG、未证实自定义纹理导入或减少必要视觉特征伪造成本达标。
- [ ] #4 **视觉合格之后**才进行隔离候选的0/1/5/10张、满手10张合法出牌与跨页、20次往返、首次完整可见/冷热载入、创建/销毁/回退测试。同源视觉比较 SDK CPU、实际GPU帧时/设备体验和官方存档容量；模拟器、GIL读回、官方导入、PC、实体手机分层记录，未验证写UNVERIFIED。
- [ ] #5 形成包含失败案例、可编辑资产/参数、真实成本、独立美术与技术复审、可重放脚本的GO/NO-GO报告。两轮同假设未改善必须换路线或止损；若审美与性能无法兼得，允许直接NO-GO并永久搁置，不自动解禁或批产。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
**已授权隔离研究，发版集成优先；不接入正式版本。** 先读 AGENTS.md、docs/TOOLCHAIN.md、docs/TASK_EXECUTION.md 及卡图标准，按 Backlog CLI 查重/授权/认领；在独立 worktree 复用当前正式图元工具和已证方案，先做两张精品视觉标杆→独立美术及原生技术复审→必要的同画质容量与设备 A/B，逐轮记录失败原因和取舍。真实美术质量优先于图元数；避免重复 AI 生图、自动三角化及没有设备证据的乐观结论。

当前 `data/release/candidate-art-policy.json` 仍禁止 Alpha/Production 启用自制卡牌插画；不得修改策略、正式 UI 默认值、战斗规则或发布状态。即使实验源码未来可独立合并，正式启用仍需另行审批。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-14 Owner：只登记 P2 待办，**无 milestone、无截止日期、没有必须做的承诺**。已否决此前两轮视觉样品，不以源图漂亮或低控件计数当作成品。状态保持 To Do，全部 AC 未勾，待未来独立启动决定。

2026-11-14 最新 Owner 指示：允许开展本研究，优先级为中，发版集成仍优先。原仅登记/等待再次授权记录为历史，正式启用、量产与策略解禁仍需另行批准。任务身份由 CLI demote/promote 从原 PR #657 的 TASK-105 迁为 TASK-107，保留 #643 容量任务 TASK-105、#656 叙事任务 TASK-106；未勾验收，不宣称研究完成。
<!-- SECTION:NOTES:END -->

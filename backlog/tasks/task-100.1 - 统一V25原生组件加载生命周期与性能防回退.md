---
id: TASK-100.1
title: 统一V25原生组件加载生命周期与性能防回退
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-09 11:10'
updated_date: '2026-11-09 04:19'
labels: []
milestone: m-7
dependencies: []
references:
  - docs/backlog-details/TASK-100.1.md
  - docs/backlog-details/TASK-100.md
  - docs/backlog-details/TASK-4.21.md
parent_task_id: TASK-100
priority: medium
type: bug
ordinal: 165000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
P0 技术阻塞：千星原生 V25 组件方案减少了运行时逐图元组装及选角阶段新增控件，却将大量原生模板在启动时整批挂载；当前仅证明部分页面出现更完整，未证明启动、菜单、连续战斗与手机性能全面变好。建立统一的组件级按需准备、完整呈现、有界复用/销毁、句柄缓存失效与可重复性能回归机制，保留真实 V25 视觉与既有 Lua Run/Combat 规则，不以简化皮肤冒充成功。

范围仅为 M7 组件性能架构和可观察性；真实设备 FPS 验收复用 M8 TASK-4.21，最终 V25 视觉落地及业务接线复用在途 PR #565。不得另建竞争 UI 框架或并行修改 #565 所有者的文件。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 固定同源码、同视觉、同输入的可重放基线，覆盖启动/菜单/选角/首次战斗/10 手牌/20 次进出，逐阶段记录组件实例化与销毁数、首次可操作及完整可见耗时、代理查找与 setter 次数、内存高水位、SDK step P50/P95/P99；将 SDK 时钟与真实 FPS 严格区分。
- [x] #2 以 RED/负控区分三项根因：运行时细粒度图元组装、全部页面 eager 挂载、代理重复查找/同值提交；每项单独 A/B 与原始记录，未证实不得硬写根因或追求虚假的 FPS 倍数。
- [ ] #3 用统一组件级生命周期接口实现 unprepared→preparing-hidden→ready→visible→cached/released，按屏/预算准备、READY 后一次展示，限定缓存容量及释放所有权；异常/取消/重入/旧回调均正确清理，不重建已存活组件、不在隐藏页继续高频工作；禁止未解释的逐图元渐进显示。
- [ ] #4 仅对实测热点应用稳定句柄缓存、失效与 dirty checking，维持输入事务、控件四态、动态内容、刷新、双宿主、失败重试及切页语义；至少包含旧引用、原生失效、重绑、重入、false/throw 的定向负例。
- [ ] #5 将组件加载预算、重复创建、生命周期净残留和关键 UI 同源耗时阈值纳入项目现有验证入口，保留原始数据、源 SHA/GIL hash、基线及可审计阈值；对回归做 RED→GREEN/变异或负控与独立复审，不以删除断言、调松预算或关闭用例取绿。
- [ ] #6 V25 关键布局、卡框、字体、按钮、角色及背景不因性能优化被擅自删除或降质；同视觉候选可导出 GIL 并由模拟器完成菜单→选角→真战斗出牌/取消/奖励回图，留截图和输入轨迹。官方 PC/安卓 FPS/容量/内存如缺必须标 UNVERIFIED 并交接 TASK-4.21，不冒充本任务已实测。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 复用 #580 任务和 #565 已提交组件实现，在独立 feat/ui-lifecycle 工作树执行，原 V25 skin 脏树保持原负责人所有。2. 按附件 H1/H2/H3 单因素实验建立 RED；组件层接入按页隐藏准备、预算调度、完整展示和失败清理，缓存只作用于已测热点。3. 复用现有 SDK/GIL 流程生成同视觉实验、20次切换与完整战斗输入证据；缺少私有资产或当前官方设备证据保持未验收。4. 定向回归、性能负控及架构门禁后进行独立复审；正常 Full、严格准入与合后 develop 验证通过才收口。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-09 接续 #580：已核对 #565 关闭未合并及其 ae716926 原提交；原树有未提交 V25 skin 工作，保留不覆盖。生命周期在独立树推进，视觉仍由原负责人持有。

本轮已复用 #565 提交实现并完成按页预算/隐藏准备/缓存释放与失败重试切片；独审发现的late-wrap驱逐、准备取消、销毁引用与失败过渡问题逐项整改。原件候选不是最终V25批准稿，AC保持未勾。技术证据与限制见附件本轮接续段；正常CI和合后验证尚待。

三项独立受控实验已取证：H1原4315图元新旧同最终状态，partial17→0；H2同源码/同模板SDK eager-lazy各3×20次，冷控件19539→14938、暖态19539→16060、净残留0；H3真实菜单cache-off/current同画面wrapper1752→0，nativeAt/GetChildren为0，未认定其为历史菜单退步根因。仅勾AC2，其余继续逐项验证；真实V25已有候选与SDK路径，但既存稿件差距和长纹理准备如实保留。
<!-- SECTION:NOTES:END -->

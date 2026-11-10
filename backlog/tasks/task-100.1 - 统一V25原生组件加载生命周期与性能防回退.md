---
id: TASK-100.1
title: 统一V25原生组件加载生命周期与性能防回退
status: To Do
assignee:
  - Furinya
created_date: '2026-11-09 11:10'
updated_date: '2026-11-09 03:38'
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

范围仅为 M7 组件性能架构和可观察性；真实设备 FPS 验收复用 M8 TASK-4.21，最终 V25 视觉落地及业务接线复用原 PR #565 的已保全来源。不得另建竞争 UI 框架或并行修改 #565 所有者的文件。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 固定同源码、同视觉、同输入的可重放基线，覆盖启动/菜单/选角/首次战斗/10 手牌/20 次进出，逐阶段记录组件实例化与销毁数、首次可操作及完整可见耗时、代理查找与 setter 次数、内存高水位、SDK step P50/P95/P99；将 SDK 时钟与真实 FPS 严格区分。
- [ ] #2 以 RED/负控区分三项根因：运行时细粒度图元组装、全部页面 eager 挂载、代理重复查找/同值提交；每项单独 A/B 与原始记录，未证实不得硬写根因或追求虚假的 FPS 倍数。
- [ ] #3 用统一组件级生命周期接口实现 unprepared→preparing-hidden→ready→visible→cached/released，按屏/预算准备、READY 后一次展示，限定缓存容量及释放所有权；异常/取消/重入/旧回调均正确清理，不重建已存活组件、不在隐藏页继续高频工作；禁止未解释的逐图元渐进显示。
- [ ] #4 仅对实测热点应用稳定句柄缓存、失效与 dirty checking，维持输入事务、控件四态、动态内容、刷新、双宿主、失败重试及切页语义；至少包含旧引用、原生失效、重绑、重入、false/throw 的定向负例。
- [ ] #5 将组件加载预算、重复创建、生命周期净残留和关键 UI 同源耗时阈值纳入项目现有验证入口，保留原始数据、源 SHA/GIL hash、基线及可审计阈值；对回归做 RED→GREEN/变异或负控与独立复审，不以删除断言、调松预算或关闭用例取绿。
- [ ] #6 V25 关键布局、卡框、字体、按钮、角色及背景不因性能优化被擅自删除或降质；同视觉候选可导出 GIL 并由模拟器完成菜单→选角→真战斗出牌/取消/奖励回图，留截图和输入轨迹。官方 PC/安卓 FPS/容量/内存如缺必须标 UNVERIFIED 并交接 TASK-4.21，不冒充本任务已实测。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 从最新 develop、TASK-100、PR #565 的实际 HEAD 与 V25 私有设计冻结源身份与画质条件，读 docs/backlog-details/TASK-100.1.md 的根因假设及受控实验。
2. 优先做同画质三组隔离对照（旧逐图元 vs 原生模板；eager vs 页面按需准备；原始代理 vs 高价值句柄/差分），保留不利结果。SDK 可先完成创建、引用、生命周期及输入验证，不冒称手机渲染 FPS。
3. 在 #565 的唯一 UI 负责人控制下择优接入组件加载器/页面状态机/缓存失效，保持现有 Lua 核心、V25 设计、严格 CI/评审、普通 2D 默认与 3D 归档边界。
4. 用一份可玩的 GIL 验证完整出牌路径，随后将性能回归接入现有验证工具并提交独立证据；官方/安卓未测条目继续留待 TASK-4.21。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮由本机Backlog CLI读回并规范化，保留原任务范围、未勾AC及原导入记录。原#565未就绪云端草稿已关闭，完整源码/脏文件/恢复bundle保留；后续仍由TASK-103及原UI负责人统一接续，不表示UI完成。未实施性能机制或设备验收。

集成核对：TASK-103记录确实存在于原V25工作树，尚未进入当前集成分支；此处仅保留原实施归口引用，不视为本分支可领取的任务。
<!-- SECTION:NOTES:END -->

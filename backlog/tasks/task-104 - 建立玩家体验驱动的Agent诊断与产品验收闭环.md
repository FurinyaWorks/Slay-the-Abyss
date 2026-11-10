---
id: TASK-104
title: 建立玩家体验驱动的Agent诊断与产品验收闭环
status: To Do
assignee:
  - Furinya
created_date: '2026-11-09 11:11'
updated_date: '2026-11-09 03:38'
labels: []
milestone: m-7
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/565'
documentation:
  - docs/backlog-details/TASK-104-PRODUCT-OUTCOME-LOOP-20261109.md
priority: medium
type: task
ordinal: 168000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner要求将“为什么一周多架构优化仍未提前定位游戏逐块出图/卡顿”的教训落实为长期可执行的 Harness 闭环，而非再次堆砌提示词、指标或局部性能补丁。

产品目标：在千星奇域交付批准 V25 视觉、高质量交互和完整两幕可玩的游戏。社区原生组件可复用技术与结构，不得以社区/《杀戮尖塔》外观替代已批准 V25。此任务负责“用户症状→根因→受控实验→自动回归→产品验收→自主纠偏”的工程机制；V25 实际移植和原组件主题适配仍归TASK-103 与原 PR #565 的已保全来源，避免重复开发。

历史证据及当前尚不能确认的根因见关联附件。既有 SCC/CC、CI 与代码正确性仍是独立工程目标，不得被用作玩家体验已改善的证明。真机当前不便时继续完成离线工作，不伪造官方 PASS。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 以已记录的旧方案、TASK-100、PR #558 与 PR #565 为真实案例，建立可追溯的“用户症状→现有客观证据→根因假设→反证实验”链；明确旧版并非所有 UI 都运行时创建，区分已证事实、假设及未知。
- [ ] #2 复用现有生产 GIL 构建/原生 SDK/BeyondSimulator、Host 测量入口，形成可重放的 UI 加载与交互场景；记录候选身份、启动/页面完整 ready、实例化数量与时机、长阻塞、输入结果及反复切屏资源变化。旧、新对照须控制画质、负载和场景；模拟器时间不冒充 GPU 帧时。
- [ ] #3 在现有受影响测试/Quality 或交付检查中实现至少一个可执行的产品体验回归关口及对应负对照：有问题的候选或伪造/缺失证据应明确失败；正常候选可通过；无数据时显示 UNVERIFIED 而非 PASS。不能仅交文字规范，不为每个普通 PR 增加重型运行。
- [ ] #4 用 TASK-103 / PR #565 做闭环实战：判断原组件移植消除了什么症状、把哪些成本前移、还剩什么阻塞；以冻结批准的 V25 作为视觉与交互验收基准，社区组件仅承担技术复用。实际内容实现由原任务负责；未完成的官方导入、存档容量、PC/手机性能保持未验。
- [ ] #5 将闭环嵌入现有 Agent/Backlog 任务处理机制：重大体验阻塞先复现后修复，局部指标不能冒充交付；无效实验自动触发复核/转向，避免重复 PR、空转和同文件争用。用至少一个反例验证该机制能拦截错误完成声明；现有 Fast/Full、独立复审、合并队列和授权边界不退化，当前 HEAD 完整门禁后才能收口。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
按附件的证据/未知边界自主安排实施。优先复用已存在的 Backlog CLI、TASK-100、test:related、verify:ui、verify:delivery 与 PR #565；必要的机制、测试、反馈和负对照必须落地代码及现有入口。先确定真实用户症状与可重复失败，再选择最小有效实验和修复，不预设“预加载/实例化/2D/3D”哪个技术正确。原则上在现有单一负责人归口内推进，避免与 #565 并发写同文件。普通改动仍走既有快测，正式候选按官方同一身份验收。不能因为真机暂时不可用就宣称阻塞已经解决或停止独立工作。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-09：本任务由 Owner 明确要求先登记并提 PR，交由现有 Agent 后续实施和合并。本 PR 只写任务与可审计的诊断依据，尚未实现或运行新的性能回归机制，AC 全部保持未勾。当前执行环境不能运行 Backlog CLI，任务文件按仓库已有任务格式提交；接手者需在实际仓库使用 Backlog CLI 核对身份、状态及 metadata，再运行 doctor、verify:backlog、现有 CI 与独立复审，禁止以此记录冒充已验证通过。

本轮由本机Backlog CLI读回并规范化，保留原任务范围、未勾AC及原导入记录。原#565未就绪云端草稿已关闭，完整源码/脏文件/恢复bundle保留；后续仍由TASK-103及原UI负责人统一接续，不表示UI完成。未实施性能机制或设备验收。

集成核对：TASK-103记录确实存在于原V25工作树，尚未进入当前集成分支；此处仅保留原实施归口引用，不视为本分支可领取的任务。
<!-- SECTION:NOTES:END -->

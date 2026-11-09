---
id: TASK-104
title: 建立玩家体验驱动的Agent诊断与产品验收闭环
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-09 11:11'
updated_date: '2026-11-09 03:49'
labels:
  - product-diagnosis
milestone: m-7
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/565'
documentation:
  - docs/backlog-details/TASK-104-PRODUCT-OUTCOME-LOOP-20261109.md
  - docs/evidence/product-outcomes/TASK-104.json
priority: medium
type: task
ordinal: 168000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner要求将“为什么一周多架构优化仍未提前定位游戏逐块出图/卡顿”的教训落实为长期可执行的 Harness 闭环，而非再次堆砌提示词、指标或局部性能补丁。

产品目标：在千星奇域交付批准 V25 视觉、高质量交互和完整两幕可玩的游戏。社区原生组件可复用技术与结构，不得以社区/《杀戮尖塔》外观替代已批准 V25。此任务负责“用户症状→根因→受控实验→自动回归→产品验收→自主纠偏”的工程机制；V25 实际移植和原组件主题适配仍归现有 TASK-103 / PR #565，避免重复开发。

历史证据及当前尚不能确认的根因见关联附件。既有 SCC/CC、CI 与代码正确性仍是独立工程目标，不得被用作玩家体验已改善的证明。真机当前不便时继续完成离线工作，不伪造官方 PASS。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 以已记录的旧方案、TASK-100、PR #558 与 PR #565 为真实案例，建立可追溯的“用户症状→现有客观证据→根因假设→反证实验”链；明确旧版并非所有 UI 都运行时创建，区分已证事实、假设及未知。
- [x] #2 复用现有生产 GIL 构建/原生 SDK/BeyondSimulator、Host 测量入口，形成可重放的 UI 加载与交互场景；记录候选身份、启动/页面完整 ready、实例化数量与时机、长阻塞、输入结果及反复切屏资源变化。旧、新对照须控制画质、负载和场景；模拟器时间不冒充 GPU 帧时。
- [x] #3 在现有受影响测试/Quality 或交付检查中实现至少一个可执行的产品体验回归关口及对应负对照：有问题的候选或伪造/缺失证据应明确失败；正常候选可通过；无数据时显示 UNVERIFIED 而非 PASS。不能仅交文字规范，不为每个普通 PR 增加重型运行。
- [x] #4 用 TASK-103 / PR #565 做闭环实战：判断原组件移植消除了什么症状、把哪些成本前移、还剩什么阻塞；以冻结批准的 V25 作为视觉与交互验收基准，社区组件仅承担技术复用。实际内容实现由原任务负责；未完成的官方导入、存档容量、PC/手机性能保持未验。
- [ ] #5 将闭环嵌入现有 Agent/Backlog 任务处理机制：重大体验阻塞先复现后修复，局部指标不能冒充交付；无效实验自动触发复核/转向，避免重复 PR、空转和同文件争用。用至少一个反例验证该机制能拦截错误完成声明；现有 Fast/Full、独立复审、合并队列和授权边界不退化，当前 HEAD 完整门禁后才能收口。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 复用现有SDK与Host入口，冻结#565真实案例及候选/工具身份，保留异画质边界。2. 实现可重放菜单/选角/输入/20次切屏观测及轻量产品证据判定，缺失和无效实验触发UNVERIFIED/复核。3. 接入现有Backlog与Quality合同回归，验证假ready、伪配对、局部改善冒充完成等负控。4. 运行真实离线案例，保存证据和V25/设备未验项；独立复审、当前HEAD Full、Backlog校验后正常队列合并。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-09：本任务由 Owner 明确要求先登记并提 PR，交由现有 Agent 后续实施和合并。本 PR 只写任务与可审计的诊断依据，尚未实现或运行新的性能回归机制，AC 全部保持未勾。当前执行环境不能运行 Backlog CLI，任务文件按仓库已有任务格式提交；接手者需在实际仓库使用 Backlog CLI 核对身份、状态及 metadata，再运行 doctor、verify:backlog、现有 CI 与独立复审，禁止以此记录冒充已验证通过。

已落实实际GIL/固定SDK回放、20次菜单选角往返、事件绑定/完整模板/输入/资源与固定预算合同，接现有runtime-path测试和verify:backlog。历史六实例及本轮两份20次原始记录已冻结。新包41页/40输入通过且净增长0，但>100ms同步操作使离线关口FAIL；旧包复现脚本ready早于完整结构。62项定向测试通过，doctor/verify:backlog/check:guidance通过；反例与设备未验边界见附件。AC5保留未勾，等待整片独立复审、精确HEAD Full和正常队列/合后验收。
<!-- SECTION:NOTES:END -->

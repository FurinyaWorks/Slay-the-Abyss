---
id: TASK-105
title: 验证20MB下角色容量可扩展性与量产准入
status: To Do
assignee:
  - Furinya
created_date: '2026-11-13 09:23'
updated_date: '2026-11-13 09:23'
labels:
  - capacity
  - scalability
milestone: m-7
dependencies: []
references:
  - docs/PLATFORM_LOAD.md
  - docs/art/UPLOAD-BUDGET-20261029.md
  - docs/art/READY_ASSET_INTEGRATION.md
  - docs/backlog-details/M7-CAPACITY-RECONCILIATION-20261113.md
priority: high
type: task
ordinal: 172000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
证明《杀戮原塔2》在官方关卡存档20MB上限内有持续生产约20名乃至30名角色的可行路线；优先复用既有构建、共享UI、官方素材与`check:platform-load`，不以改造未验证的未来角色架构阻塞近期版本。

本任务是M9批量角色量产的独立硬前置，而不是近期版本、TASK-85单角色试验、TASK-62/64内容开发或整个M8的硬前置。不得把16MB内部预算、旧8.96MB观测、GIL大小、Lua源大小或模拟器测量当作官方包体实测。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 冻结当前正式候选B0，取得同一SHA、buildId、candidateSha256、payloadDigest、客户端版本和官方编辑器20MB容量面板读数/截图；缺实测标UNVERIFIED，不用历史候选替代。
- [ ] #2 同一干净基线隔离测B1第1名代表性角色、B2第2名角色及分别的纯玩法数据/角色肖像/待机/共享UI成本，记录每步官方容量delta、GIL、实际映射Lua、唯一数据、模板/控件实例；同一源码仅改变明确列出的变量。
- [ ] #3 区分一次性固定成本与每名角色的边际成本，结合第三/第四幕及其他未来内容预留，给出10/20/30角色的保守区间、16MB内部预算/20MB硬上限风险和测量不确定性；0.25MB只能作目标不是伪造的平台阈值。
- [ ] #4 审计角色选角/战斗/待机数据是否重复、共享渲染宿主的对象池和释放、生产清单能否只装配正式开放资源，验证运行时资源不随总角色数不必要地同时膨胀；若NO-GO只实施有量化收益的最小改造并重测，不能仅提交规范即标完成。
- [ ] #5 在既有`check:platform-load`、`verify:platform-load`与产物审计上补必要的容量增长检测和否决反例；无官方数据的预检为UNVERIFIED，正常PR不增加重型实机CI，不降低现有16MB预警与20MB门槛。
- [ ] #6 明确提交GO/NO-GO与可复核原始记录、同候选PC/实体手机加载和角色切换/释放证据；未通过前M9的TASK-97不得启动批量生产或宣称量产可行，仍可并行完成近期发布与单角色隔离实验。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
先确认B0官方容量身份；复用TASK-10.1.2的B0/B1与宿主成本实验口径，加上第二个角色B2；评估10/20/30名角色。如果NO-GO先定位共享/装配瓶颈，小规模整改和复测，直到有证据GO或明确长期架构路线不可行。真实设备与平台验证须依现有窗口权限，不假设能在无授权情况下取得。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-13立项：以角色长期量产为目标，不为任何未参与的新赛事建立里程碑。现有TASK-10.1.2只覆盖精绘卡图/宿主的单实例和多实例容量，不能取代本任务的完整角色边际成本、章节点预留、未来角色池预测。
<!-- SECTION:NOTES:END -->

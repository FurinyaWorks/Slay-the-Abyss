---
id: TASK-88.2
title: 修复离线战役报告并接续当前集成基线
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-09 01:58'
updated_date: '2026-11-09 03:22'
labels: []
milestone: m-7
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/566'
parent_task_id: TASK-88
priority: medium
type: bug
ordinal: 166000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR566独立复审发现跳过奖励被误计领卡及损坏最终指标仍生成成功报告；旧CI另受主线来源合同阻塞。用户要求集中集成既有PR，本片保留原驾驶器与策略，修复报告并接续最终M7基线。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 跳过与失败奖励不计领卡，实际成功领取按索引计数
- [ ] #2 损坏生命、楼层、行动及来源身份明确失败，原五项测试和新增负控通过
- [ ] #3 保留历史库存断言并验证新增测试后的完整当前库存及原预算，独立审查与正常CI通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.保留原PR四提交，在最终M7整树隔离接续。2.先用跳过奖励与损坏最终指标负控复现，再修复实际取卡计数及消费字段校验。3.明确冻结历史800库存并验证当前801完整分配与原预算，保留全部旧断言。4.定向测试与独立复审后，待前置实际合入，再绑定新develop完成正常CI及合后验收。

现有接续PR同时收拢已公开的TASK-74.19/74.20 Stasis和Wheel切片，不另开分支；保留800/801/803/806历史库存并验证807当前全覆盖。576保持独立队列；合后清理由用户发起，不建后台或session。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
原报告7项先5过2败复现跳过奖励计数与损坏指标；修后7/7。完整calibration首次发现原576基线5项CRLF失败，已由主线0f204独立修复接续；最终报告与完整历史/801库存50/50、零跳过，8.042秒。保留原红灯日志、原800/797及预算断言；Backlog/guidance通过。独立复审、真实战役与精确HEAD托管/合后尚待，不勾AC。

现有分支已组合两份已审M7切片，4份生产Lua和config/shape/timing/static与原Wheel交付逐字一致。共享属性与成本合同组合后60/60、零跳过；原375路径仅CRLF差异已按原Git LF契约恢复，不改收据hash。最终独审与当前HEAD Hosted Full/合后仍待。

同一现有接续分支的最终组合：60/60报告与成本合同、13/13 Stasis/Wheel边界与来源合同均通过，54-owner独立暖漂移/删除负控通过；原单片源码、独审和行为证据逐字保留，不重复Full。当前807JS/1410Lua、38floor、18/15形状的含60秒预留规划为1710876/1144332ms，原1800000/1200000预算不变。原五项CRLF失败、缺生成输入与后续全输入审计均保留，不重写收据或hash。最终HEAD正常Full/合后尚待。
<!-- SECTION:NOTES:END -->

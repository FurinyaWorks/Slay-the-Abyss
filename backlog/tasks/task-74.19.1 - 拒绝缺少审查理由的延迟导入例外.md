---
id: TASK-74.19.1
title: 拒绝缺少审查理由的延迟导入例外
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-10T14:20:00Z'
updated_date: '2026-11-10T14:29:00Z'
labels: []
milestone: m-7
dependencies: []
documentation:
  - docs/backlog-details/M7-DEFERRED-POLICY-20261110.md
parent_task_id: TASK-74.19
priority: medium
type: bug
ordinal: 166000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
架构门禁把延迟导入例外直接转成允许集合，缺少或空白审查理由仍能屏蔽依赖环；非数组和空行会抛类型错误。本片先验证例外身份和理由，再使用合法例外，保持生产源码及现有有效策略不变。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 缺少有效理由、非法行或错误容器均返回可追溯策略错误，不得屏蔽依赖环
- [x] #2 合法重复引用、初始化调用、层次和职责边界仍按原合同检查，当前完整图不变
- [ ] #3 旧实现真实失败、定向及独立审查通过，并按精确SHA及正常CI合并门禁交付
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在既有架构边界回归中证明无理由例外可隐藏环及非法输入抛错。2. 将容器、记录、两端身份与审查理由验证前置，仅有效记录进入豁免集合，保留重复及过时检查。3. 新旧完整图对照、相关工程消费者和#601/#604精确组合窄测，独立复审后发布Draft；不改生产Lua、策略、预算、历史来源或其他分支。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已复现旧实现允许无理由例外隐藏真实环及空行崩溃。修复仅有效记录准入，保留过时和重复诊断；338模块/1929引用完整报告逐字不变。独立59探针及两语义负控通过；#601/#604隔离组合24/24。完整消费者收尾后发布Draft，原CI及合后门禁未齐，不勾最终交付。

十文件消费者实际60/62；Session reward events/dynamic两个未改VM比较撞原30秒超时，其余通过。保留失败不提高超时/预算，最终交付AC3仍未完成。修复源码独审PASS，精确组合24/24、全图和Backlog验证通过。
<!-- SECTION:NOTES:END -->

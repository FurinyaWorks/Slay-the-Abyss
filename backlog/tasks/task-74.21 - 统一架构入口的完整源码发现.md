---
id: TASK-74.21
title: 统一架构入口的完整源码发现
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-10T11:21:00Z'
updated_date: '2026-11-11T05:24:00Z'
labels: []
dependencies: []
documentation:
  - docs/backlog-details/M7-ARCHITECTURE-DISCOVERY-20261110.md
  - docs/backlog-details/M7-SOURCE-ROOT-BOUNDARY-20261111.md
  - docs/backlog-details/M7-SOURCE-ROOT-CURRENT-20261111.md
parent_task_id: TASK-74
priority: medium
type: bug
ordinal: 166000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
独立架构入口仅扫描顶层Lua，可能漏检嵌套模块；组合工程入口已递归扫描，两个入口对相同源码树的依赖与拒绝行为不一致。范围限源码发现和模块身份，不改初始化调用解析、生产Lua或CI预算。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 独立和组合架构入口覆盖相同递归Lua模块，嵌套违规、空扫描和身份冲突不能静默通过
- [x] #2 链接源码边界拒绝保持，当前全库报告不变，正负回归及独立复审完成
- [ ] #3 精确HEAD必要CI及正常合并规则通过并完成合后验收
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.复现独立入口漏掉嵌套Lua及空扫描。2.复用现有递归发现并共用模块身份转换，保持初始化解析和当前源码报告不变。3.覆盖嵌套违规、环、分类、冲突与链接拒绝，运行相关消费者和独立复审。4.发布Draft，保留必要CI、合并队列和合后验收未完成状态。

2026-11-11遗漏修复：在独立树复现src及src/lua入口链接可穿出边界；最小加固既有源码发现，保留内部链接拒绝和真实文件路径，补同入口正反回归及全库报告一致性，不更改AST策略、生产Lua、Full预算或历史oracle。

5.接续PR #611到#613已合入的develop 3a061a76，保留两侧证据换行规则，仅复验来源发现及工程消费者；当前HEAD独审后更新原Draft，不重复Full、不覆盖#610实现。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
当前递归发现与真实路径修复已验证。四份完整工程消费者32/32、架构边界2/2通过；旧实现新增4项回归全部失败，修复后9/9。完整338模块1929引用报告逐字不变，独立负控与#601精确组合通过。初次路线登记缺失日志保留，补登记后Backlog通过。当前仅本地与独审证据，HEAD必要CI和正常合并/合后验收未完成，保持In Progress。

2026-11-11补漏：src/src-lua入口链接原先可被跟随，新增3条真实红测后由两级lstat拒绝；保留仓库根别名。四份完整工程消费者37/37、架构边界2/2及独审通过；当前345模块1953引用报告逐字不变。详见docs/backlog-details/M7-SOURCE-ROOT-BOUNDARY-20261111.md；原始失败与通过流保留，Windows/HEAD Full/正常合并/合后push未验，AC3保持未完成。

接续#611到develop 3a061a76：仅合并属性文件追加，原工具/回归与两侧证据逐字保留。当前完整消费者37/37、发现/边界14/14、静态345模块5918测量及轻量门禁通过，独立组合复审无未解决发现；两批重叠不累计。证据见M7-SOURCE-ROOT-CURRENT-20261111。Draft与AC3未完成保持；不重复Full，待#610基线修复后按当时HEAD/BASE正常准入。
<!-- SECTION:NOTES:END -->

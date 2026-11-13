---
id: TASK-4.23
title: 统一祝福与战斗等局内页面的共享顶部栏
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-13 07:40'
updated_date: '2026-11-13 12:04'
labels: []
milestone: m-8
dependencies: []
parent_task_id: TASK-4
priority: medium
ordinal: 173000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户反馈远端最新版祝福页与战斗页顶部栏呈现两套实现，增加维护成本且破坏局内一致性。核对共享背景之外的实时资源、入口和可见性归属，消除页面各自拼装。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 祝福、地图、战斗及其他节点页面复用同一顶部栏组件和布局来源，页面只提供当前数据与允许的动作。
- [ ] #2 覆盖同局切页、资源更新、药水容量和入口交互的回归，防止只比较背景却遗漏实际显示。
- [ ] #3 独立复审修复及现有PR兼容性，源码与官方候选、设备验证分别记录，未实测不冒充验收。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
接续根目录已认领TASK-4.22的隔离分支记录：共享顶栏组件、组合PR639永久卡组浏览器；修复组合来源接续阻塞，生成本轮离线视觉证据，完成相关验证与独立复审后正常交付。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
6332dca9为本轮顶栏修复，PR639 e36457afc在本地组合。21项顶栏合同与2项永久浏览器数据/生命周期通过，组合独审通过；Full及当前官方设备未验，不Done。

根旧工作树先前误建同名TASK-4.22，已用CLI归档该重复记录；最新基线已有TASK-4.22为能量球任务，保持原样。本轮正式身份为TASK-4.23。用户“收尾”文字已澄清为发错，继续执行两项复用交付。

本轮续接组合验证：官方布局/真实Host四文件53/53通过；工程AST346模块6016/6016、架构1955边和Luacheck无新诊断；四变异killed_by_assertion，六项原生UI合同通过。初始缺Luacheck、缺生成数据、系统TEMP权限失败均按环境修正后重跑，未放宽规则。Backlog/平台日常负载/数据验证通过。独立agent修复37项来源接续失败，另一路新源码真实Simulator截图正在生成。

最终单行potionTint视觉修复及同RGBA回归已通过；最终8张真实SDK截图/状态与source manifest绑定8e8ab557…闭包，逐文件读回无漂移。药水跨祝福/地图/战斗图片与RGBA一致，三浏览器返回区域RGBA一致，Lua/console/HTTP零错误；独立复审PASS。原截图“返回缺失”为观察误判，已用原PNG逐字节核对撤回，未改生产。最终71项完整CI来源合同+10项受影响来源负控通过；旧冻结档保留。官方导入ready和设备尚未测，任务保持In Progress。

PR639当前head cb1eac63620b908d880b8a339ab834b1b533dfc1已推送。Full唯一历史trace30秒超时，经同Node24/TEMP/冻结输入对照cb与903分别16.48/16.66秒通过，原预算未变；已仅一次重跑原run43402980943失败job，尚未宣称合并。后续卡框/选角/Neow/揭幕已在线性style候选整合。原生副本构建另因本机未签名PowerShell helper被策略拒绝，未改策略/未导入/未取官方ready。
<!-- SECTION:NOTES:END -->

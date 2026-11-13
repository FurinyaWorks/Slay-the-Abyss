---
id: TASK-4.10
title: 对照批准稿恢复商人演出并检查其他界面
status: In Progress
assignee:
  - Furinya
created_date: '2026-10-29 05:10'
updated_date: '2026-11-12 16:12'
labels:
  - 待验
milestone: m-5
dependencies: []
references:
  - docs/design/UI_DESIGN.md
  - docs/design/prototype/index.html
  - docs/evidence/merchant-action-group-20261101/README.md
parent_task_id: TASK-4
priority: medium
type: bug
ordinal: 127000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户指出商店商人和对话演出与批准稿不符，需检查其他页面是否遗漏批准设计。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 逐屏对照批准稿，列明已实现、缺失及平台限制。
- [ ] #2 商人和商店演出按批准稿接入，交易与离开正常。
- [ ] #3 保留自动回归及同候选电脑和手机实机证据，未验证项明确列出。
- [ ] #4 商店选中商品时，取消选择与购买同排相邻、属于同一视觉操作组；对白独立且不插在两按钮间或遮挡交易，保留点击、触摸、手柄和购买取消规则。
- [ ] #5 QA-R2-07进店、停留、连买、缺金币、点击加速和离店演出沿既有商人组件复核；同候选PC与实体手机证据缺失时保持未验，不把离线结果当动态实测。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 按QA-R2-07及用户补充核对商店现有控件与交易链。2. 先复现取消/购买被对白分隔，复用现有页脚控件并排布局、对白独立靠左，不改交易和对话状态机。3. 定向布局与真实Host输入回归，离线同源前后截图及一次独立评审。4. 记录源码、候选与设备边界，实机未验不勾AC。

来源合同接续子切片：只在tests/helpers及既有source epoch合同新增903bf2a31四文件整源映射，保留旧档案和收据；补未知漂移/缺源负控，定向验证后交接最终重绑入口与哈希。

本轮用户明确批准货架旁人物及头上带尾气泡；复用旧台词/状态机。修复深底按钮运行时暗字覆盖，商店顶部地图复用只读预览及一次返回，补整页与迟到输入合同。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-29 核对商店接线仍在：abyss_merchant 进店、购买、金币不足和离开都由节点界面调用。旧路商人与七天神像不是同一形象。本切片没有重做交易。实机对照批准稿仍未做，验收未勾。

QA-R2-07本轮先处理用户明确要求的购买/取消同组：原对白插在两按钮间已由布局和真实Host复现；保留原控件及交易，改为同排相邻，独立对白整体平移，非选中态恢复通用页脚。定向红绿与同源离线前后截图见附件；卡字/不动尚无当前设备复现，不改既有商人状态机。PC/实体手机、候选、官方ready仍未验，本轮不勾设备AC。

2026-11-07 看板核对（develop 2c85bc61）：实现类交付已按历史记录保留，剩余 AC 待同候选官方/设备验证；当前无在途 PR，状态由 In Progress 归 To Do（待验）。

2026-11-12 来源合同子切片：新增四文件完整源到903bf2a31的精确接续，旧closeout/CI/source档案未改；旧96-owner断言保留，当前精确增加merchant为97。定向48项及Formation两项/Defect一项共51项通过；新四组负控最终复跑通过。早先三文件并跑曾触发终端120秒超时，不计通过。重绑入口tests/helpers/generate-shop-deck-source-epoch.mjs --write-archive（只写新gz并打印apply_patch补丁）；应用补丁后--check。当前archive SHA256=4b00f911da479f8dae228c9ff8351492db7eb53bfab80c2b68d534768bb0f413；input/feedback尚绑定903原源，主线完成生产修改后须最终重绑。未跑Full、未提交推送，任务AC及设备验收不变。

本轮12份生产文件实现完成，10张当前Simulator图已逐张查看；独审R2关闭两项P2且无剩余阻断。工程346模块/6016测量、四变异与6原生UI合同通过。完整本地check已尝试，单线程20分钟终止，含旧Act1差分探针失败，未报Full通过；原严格远端Full仍须成功。Owner授权成熟后提交PR与自动合并。官方候选导入/ready、PC手机未测，AC不勾。证据docs/evidence/shop-deck-parity-20261112/。
<!-- SECTION:NOTES:END -->

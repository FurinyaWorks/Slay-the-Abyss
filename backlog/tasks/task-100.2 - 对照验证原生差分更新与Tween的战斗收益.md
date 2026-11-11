---
id: TASK-100.2
title: 对照验证原生差分更新与Tween的战斗收益
status: In Progress
assignee:
  - Furinya
created_date: '2026-11-11 02:12'
updated_date: '2026-11-11 02:32'
labels: []
milestone: m-7
dependencies: []
references:
  - 'https://github.com/FurinyaWorks/Slay-the-Abyss/pull/613'
documentation:
  - docs/evidence/native-ui-ab-20261111/README.md
parent_task_id: TASK-100
priority: medium
type: spike
ordinal: 171000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
承接Owner指定PR613两项隔离实验；复用既有SDK、GIL与回放，不重复TASK100.1生命周期或手牌几何缓存。保持美术玩法，真实设备结论单独取证，无收益即停止。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 同源十手牌双敌定位剩余原生热点，完成一处差分或复用A/B并保存冷暖计数与时延及失败/重入证据
- [ ] #2 一处固定起终点非拖动动画完成原生Tween配对，对比调用与时延并覆盖取消销毁迟到回调
- [x] #3 明确GO或NO-GO，官方ready与PC手机未取得则UNVERIFIED，不以离线代替设备验收
- [ ] #4 通过独立复审、原CI与正常合并develop及合后读回，不触碰master或发布
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1.核对develop/PR及已有缓存与Tween证据，复用SDK与同源十手双敌夹具定位热点。2.差分与固定动画各做一个隔离替换，记录逐项原始数据及失败负例，保持视觉玩法。3.同条件重放20次并分开离线/设备结论，无收益NO-GO停止。4.独立复审、精确HEAD原CI及正常队列合入develop并合后核验。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
首轮同候选SDK已完成：差分1200写变1200读，净桥请求不降；Tween可见消散滞后1帧且隐藏端点不一致。按PR停止条件两项NO-GO，不改生产源码。原神/手机本轮不可用，均UNVERIFIED。600空step与20属性重写不冒充页面往返，20真实往返及中途engine销毁等早停未做，AC暂不勾。独审已确认否定依据，正在补完整GIL/投影/Lua/挂载单变量读回及最终CI。

完整配对读回通过：实际GIL section50逐模块对照投影，除介入模块外原生树/素材/配置/挂载相同；伪造原生visible并重算hash仍被拒绝。两项NO-GO按EARLY_STOPPED交付，未做项与B来源身份在机器摘要明确。独审建议保留未完成AC而不是为否定方案追加重型回放。相关可见性/生命周期/启动恢复回归通过，verify:backlog与guidance通过；原Full及合后读回未完成。
<!-- SECTION:NOTES:END -->

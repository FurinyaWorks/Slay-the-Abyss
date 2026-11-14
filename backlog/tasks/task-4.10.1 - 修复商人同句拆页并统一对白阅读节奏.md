---
id: TASK-4.10.1
title: 修复商人同句拆页并统一对白阅读节奏
status: To Do
assignee:
  - Furinya
created_date: '2026-11-14 03:03'
updated_date: '2026-11-14 05:36'
labels:
  - ui
  - text
  - owner-review
milestone: m-8
dependencies: []
references:
  - docs/TOOLCHAIN.md
  - docs/TASK_EXECUTION.md
parent_task_id: TASK-4.10
priority: medium
type: bug
ordinal: 175000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用户反馈商人已有说话演出，但同一句话说到一半就换页，阅读割裂；此问题已多次修改仍不满意，希望尽量在当前版本解决。需先复现现候选的真实分页，参考成熟游戏的对白规范，从语义完整性、文本容量、排版、逐字显示、翻页与交易状态多个维度查根因。涉及最终阅读体验的人工确认由用户参与，执行者先准备少量可直接判断的同条件前后对照。父任务原有商人位置与购买取消布局成果保留。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 保存当前候选同一句被拆页的实际文本、页面尺寸、触发步骤和连续画面；检查正文是否主动拆段、容量/换行计算和演出状态机，说明真正根因
- [ ] #2 短句及可容纳完整句不跨页；长句确需分页时采用经用户确认的完整语义分段和可读续接规则，中文标点、换行和文本尺度正常，不靠缩小到不可读字号或截断处理
- [ ] #3 进店、停留、购买成功/失败、连买、打字中加速、继续/跳过、离店再入等状态不丢字重播或互相打断；对白不遮商品与交易，鼠标/触摸/手柄路径可恢复
- [ ] #4 以原作或成熟游戏的实际阅读例证解释规范，先自检多维问题并独立复核，再交用户同条件前后连续对照和短中长句样本，人工确认记录绑定本轮候选
- [ ] #5 真实问题有必要自动回归及反例，重复改坏的原因形成最小可执行防回退；官方PC和实体手机实测分层记录，未测项不宣称验收
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
源码候选PR655完整纳入当前单主角版integration-next并保留原独审与阅读回归；本次仅集中集成，实际连续画面/设备/人工阅读验收仍按原AC保留。
<!-- SECTION:NOTES:END -->

# Neow 与批准稿人物独立复审

复审者：`collaboration/hud_audit`（非本切片作者），2026-11-13。结论：无阻断。主线程另已打开 `visual-npc-approved-3/two-normal.png` 核对金边与兜帽遮挡。

复核范围：原版选项 880×59、79px 步进与独立44px触达区；批准稿 SVG 路径、绘制顺序和统一 meet 缩放；背景读取共用 HUD 底缘；实际 offer 的收益/代价分段、未知文案全文保留、禁用反馈及普通事件往返恢复。规则事务和 RNG 未改变。引用本轮已执行的6项定向回归，不把静态读审写成重新执行。

| 源文件 | 复审时 SHA256 |
|---|---|
| `scripts/sts-neow-guide-layout.mjs` | `17622ef49df2a8a50a16482ea430d8fc660b3b8e17ffc6e4993dadc096873a8a` |
| `scripts/sts-neow-choice-layout.mjs` | `7e1a22e504aef145476d2c1bb05d3f44a76cf058b86cd8283a4588fb1992b76f` |
| `scripts/noncombat-neow-layout.mjs` | `d6c72be27ee3cbf649c949de8714f75673d1bc71bb700660ca79bfaab88e7740` |
| `src/lua/abyss_node_ui_events.lua` | `31e237a1c6e70ab60b05220e71690b58cae68cf759d52a929c381a997c5491d2` |
| `src/lua/abyss_node_ui_feedback.lua` | `3c899d7b908555ca604b6e979017f6afc5d0470a622076addea404ca20da006a` |

已记录的差异：原 SVG 渐变的轻微斜率由原生分层近似；没有原版量测的 hover/pressed/disabled 只声明可用反馈。该结论不证明字体、官方渲染、当前组合候选的官方导入/ready 或设备效果。

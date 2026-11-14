# Neow / NPC 独立源码复审

复审者：`hud_audit`，未参与下列 Neow 实现。只读审查，未修改被审源码；未重复 SDK 或整套测试。结论：未发现阻断。

| 文件 | SHA-256 |
| --- | --- |
| scripts/sts-neow-guide-layout.mjs | 17622ef49df2a8a50a16482ea430d8fc660b3b8e17ffc6e4993dadc096873a8a |
| scripts/sts-neow-choice-layout.mjs | 7e1a22e504aef145476d2c1bb05d3f44a76cf058b86cd8283a4588fb1992b76f |
| scripts/noncombat-neow-layout.mjs | d6c72be27ee3cbf649c949de8714f75673d1bc71bb700660ca79bfaab88e7740 |
| src/lua/abyss_node_ui_events.lua | 31e237a1c6e70ab60b05220e71690b58cae68cf759d52a929c381a997c5491d2 |
| src/lua/abyss_node_ui_feedback.lua | 3c899d7b908555ca604b6e979017f6afc5d0470a622076addea404ca20da006a |
| tests/sts-neow-guide.test.mjs | f238b02d4fe5d2c6b17057e9a47084df00af3e2c20cf12375f7305d6b4bc978f |
| tests/sts-neow-choice.test.mjs | a1c43b92617679277c2bdd955f9332fcf4caa290f075f7f77b65c84aece98a21 |
| tests/sts-neow-runtime.test.mjs | e89426519d193c2a2078eb24a91c4514988ebf7798e30e13e90519cad41a7bee |

核对内容：原作普通态880×59、79px行距经同一比例投影；44px独立点击高度；项目批准SVG的路径、遮挡顺序、单一meet缩放和每组≤60；背景从共享HUD边界计算，避免旧金色缝隙。SVG素材归属已区分为项目批准NPC，而非原版Neow图。

运行时保留原事务处理器、迟到身份检查与禁用规则。收益/代价颜色依据结构化offer及现有description格式；未知格式保持完整中性文字，禁用状态去掉亮色markup。普通event复用节点后恢复原标题/描述及皮肤。未引入新交易或RNG调用。

定向合同覆盖上述结构、真实Neow结果与普通event恢复；主线程已报告该三份测试共6项通过，本次独审只核查其断言和实现对应关系。斜向SVG渐变采用纵向分层近似，交互态颜色未宣称原作量测parity；没有将这些限制冒充官方/设备验收。

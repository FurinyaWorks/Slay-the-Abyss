# 镜头错位与工具替代

**2026-11-08暂停：** 用户要求提交现状并结束，当前优先回到2D。以下“正在复测”等描述均为暂停前历史；最新候选最终击杀镜头恢复未继续实测。源码、GIL、已知失败及恢复入口统一见[暂停交接](NATIVE-3D-PAUSED-20261108.md)，不再自动推进3D。

当前冻结候选（03:15）：源码 `8d16bc98`，build `e4981a80-bb8a-46a4-9036-b255a2acbcd5`，SHA256 `502809dcb12bcaf9fb6ce956841936ecfd5be0aa4221fdb99ad3fd20109974b5`，单包 `F:\New folder\.artifacts\3d-8d16bc98.gil`。包括两项不可达UI减负（760+396静态节点，动态牌库每项另减18）、技能区Hidden、角色攻击前安全位置与独立恢复watchdog、超时隔离。GTS实际编译通过，全图最大983原始/1667折算；350模块与9×5最终嵌入配置运行通过。已新导入1073741932，350/350客户端Lua一致。新候选实际镜头/领奖/连续战斗仍在本轮复测，手机未验。

失败证据不能覆盖：1931/build3dab389b原生 `a030dbb4-efe1-4cb5-86a3-15cad0abff2e` 已走真实开局恩赐、致死、金币99→113、选牌10→11、返回地图和第2层商店，但最后击杀后相机贴地持续到领奖，故不是通过候选。原日志解码 `.artifacts/native-visual-high-20261108/reward-camera-failure-log.json`，对应截图 `repl-1794077034143-168-1.png` / `repl-1794077097224-169-1.png`。初始可见false的聊天对照被OnStart重新显示覆盖，不能据此证明原生聊天被Lua遮挡；Enter/N可见性尚未验收。

2026-11-08 原生取样增量：真实运行 `33e3f968-de52-4696-8538-fea8151a92a9` 的四点世界→视口与两点逆投影给出 C=(-9.93229,3.80776,-3)、F=(.99323,-.11618,0)，实际world yaw90/pitch6.67168；FOV42的四点拟合误差<4.8e-6。模板yaw=-90的第二轮 `fcd66ac9-048d-4283-8599-ec213624fc0e` 测得world yaw180、focus仍约(0,2.64596,-3)，推翻“模板角等于世界角”和“offset是世界空间”两项旧假设。证据分别在工作树 `.artifacts/native-visual-high-20261108/probe-log.json`、`yaw-corrected-log.json`；第二轮只走至开局事件，不宣称战斗构图通过。

`8a8b4be9` 将模板改为yaw90、角色空间offset(0,-.45,3)，同时从官方inverse-viewport四点求真实投影基。原生目标、HP与状态共用该基；仅进入战斗、首ready、角色落点回执和resize请求，同帧合并，不逐帧取样。异常相机批次先计算全部actor，失败保留旧basis/geometry。独立复审绑定8a8b4be9；24项JS、原生位置/投影/整局Lua、原生UI合同6项、架构与Lua静态门禁通过。

本轮完整候选 `723a4158-9530-41fe-9e7e-389591e2d33b`，源码8a8b4be9，SHA256 `56934663a7a4cc2639ed500577bc2a01141d3dce9aee93529744124b45a8bf07`，Windows短路径 `F:\New folder\.artifacts\3d-8a8b4be9.gil`。350模块和9模型×5槽最终嵌入配置运行通过，全图最大1554折算；新增投影图61/21折算。已官方新导入1073741930，350/350外部Lua匹配，新原生运行 `3acddd0c-969e-422d-a713-f644b94c9bc7` 正在验证；当前仍不声称ready/新构图/社交键/手机通过。

TASK-103 / PR556。用户1073741926实机截图显示人物居中、敌人挤在纵深、血条与实体错位，栏杆进入前景。当前官方外部Lua与6fc14577候选349/349匹配；职业绑定的镜头ID、距离10/FOV42/pitch12保存值正确。最新落盘调试日志仍23:33:36、124bytes、只有PR_READY，不属于23:53本轮，不能据此判断ready/位置。未操作键鼠。

旧构建使用角色固定镜头跟随空物件，没有官方要求的物件镜头模板和通用组件；数学投影只证明规划相机的结果，没证明实际生效镜头。漏显式切换虽已加固，但职业本身已有绑定，不能认定它就是本次根因。不能先删栏杆或挪HUD掩盖镜头假设错误。

用户要求先找工具，查证结果：

- [Beyond Simulator](https://github.com/1475505/miliastra-beyond-simulator#当前支持边界)：2D UI/Lua，明确排除3D模型和完整官方节点图；可测试卡牌，不可用来验原生镜头。
- 原MCP、当前上游和自维护fork：可写角距/FOV/固定角色镜头，没公开viewpoint offset或物件镜头组件。
- [UGC Camera生成器](https://github.com/luern0313/UGC-File-Generate-Utils/tree/master/generate_camera)：真实镜头GIA序列化，提供XYZ视点偏移。其测试仅打印decode_raw差异，没有可靠失败退出，不能照搬通过声明。
- [Ayaya](https://github.com/AyayaXiaowang/Ayaya_Miliastra_Editor)：节点图及配置表单，不是官方3D运行预览；未找到对应物件镜头组件写回能力。

采用UGC已公开的[镜头schema](https://github.com/luern0313/UGC-Gia-Gil-ProtoBuf/blob/3203018dd73a14a4e327483b92a4b09e4e583ca0/camera.proto)，复用现有MCP wire，只改角色镜头field4视点向量和field13跟随旋转，其他字节保持。官方镜头设置样本SHA256为85a7562177f81f2ce060ae09decc38b5c58698971a18d9a55be889c1e9ececeb，第一人称field4.y≈.3独立支持字段映射；X/Z来自固定社区schema，尚无非零官方样本实测。旧schema的field19类型与当前官方varint碰撞标记矛盾，故不整包重序列化。来源MIT许可保留于docs/legal/licenses/UGC-Gia-Gil-ProtoBuf-MIT.txt。

实际工具试写：6fc14577副本field4由[0,0,0]变为[3,.9,0]，field13由true改为false；用独立protobufjs加载社区ViewpointOffset定义读回一致。探针SHA256为0beb0cc1b4819bdfc100d39b0c44cbe2ef14afae4860c12e24dd1624ce2a7e2c，原文件不变；工具证据在.artifacts/native-position-audit/camera-offset-tool-proof.json。该探针仍含旧节点接线，不作为可玩交付包。

已接入正式装配：移除空物件锚点，恢复跟随真实角色并显式激活固定模板，关闭偏移随角色旋转；ready及玩家攻击结束时使用实际角色位置+世界视点偏移回传camera focus，避免落地高度变化后继续使用规划Y。26项相关合同通过，包括实际官方镜头副本只改指定字段、失败拒绝、原文件不改、角色实际地面高度更新。源码与最终GIL仍需独审、实际编译/读回；配置成功不证明构图、跟随基准点和实际碰撞正确。官方新ready、真实站位/HUD、PC/实体手机保持未验收；不申请桌面输入直到工具替代工作完成。

实际装配结果：首次GTS编译拒绝裸Block，构建中止，失败证据保留在.artifacts/native-character-camera/1be1cb6c-a8fc-466b-a520-c2138210705a/；19184737改为不同actor类型的唯一局部变量名，保持回传内容，原12项路由合同通过，增量独审通过。

最终构建buildId593811f3-de1f-4909-bb82-a480f43dc6c0，源码19184737aef7db5fbe59798aca05b716317743ef；10张新增图全部真实编译写入。最终完整GIL 15,712,849 bytes，SHA256为6c165e2e74e18edd73f283008845779ba7eb85944f0abf22e9b0dd0ae3f8d5a4，根副本F:\New folder\.artifacts\杀戮原塔2-角色镜头候选-19184737.gil。349模块读回、9模型5槽配置门禁通过，静态0错误347告警；全部12图最大927原始/1554折算，unit82/272、player48/105。最终GIL再次直接读回offset[3,.8999999761581421,0]、mode2、followRotation=false。完整收据及调用位于工作树.artifacts/native-character-camera-final/同buildId/。此为离线检查通过的完整候选，未验原生画面；不把它称为已修复用户截图或最终成熟游戏。

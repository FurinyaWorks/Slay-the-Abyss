# 原生启动配置数字索引修正

TASK-103 / PR556。用户导入920a6acb后实机启动失败：`abyss_native_projection:8: attempt to index a nil value (local 'body')`。从旧最终GIL提取并真实运行Lua，确认`bodies[1]`和`projections.models[1]`为nil，而字符串键有值。构建使用Object.fromEntries，现有toLua按对象语义输出字符串键；此前手写Lua配置回归没有经过这一序列化边界，漏掉缺陷。

源码64ad7d60将两表改为按连续model1—9排列的数组，保留toLua其他对象键语义；默认slots取JS第0项。没有以nil保护吞错或恢复旧2D角色。构建对ID顺序执行硬断言，并在交付复制、成功回执之前运行最终GIL回读的config、battle、geometry、projection四模块。门禁验证全部9模型×5槽、敌人映射、并行初始化、逆序ready、实体/英雄/相机位置、4:3投影变化和destroy清理。任一失败拒绝交付。

本轮8项相关JS/Fengari回归全部通过，包括两处字符串键独立负对照和旧真实坏包拒绝；另22项原生图/镜头/模型/场景合同通过。真实GameUI/Run首战出牌至奖励回图、点击/拖牌命中第二敌人、实际位置协议三组Lua桥回归通过。这些均为离线合同，不是原生LuaHost或设备体验证据。独立复审同样执行8项测试，未发现新增缺陷。

最终完整GIL：

- buildId：`cd8ac1b5-49e5-4695-875b-2dca2266c944`
- 源码：`64ad7d60c273409a82efdff22efc85035edc38e0`
- Windows交付副本：`F:\New folder\.artifacts\杀戮原塔2-配置修正版-64ad7d60.gil`
- 大小：15,712,868 bytes
- SHA256：`6fc1457743c4dfe6cbc7b57bb73dc90774405b83fd4d668fe8b4ca049d4b8569`
- 工作树证据目录：`.artifacts/native-config-fixed/cd8ac1b5-49e5-4695-875b-2dca2266c944/`

`candidate.json`记录最终349模块hash和构建输入；`scripts.json`为实际GIL源码读回；`serialized-native-config-check.lua/json`保留四模块源码、hash及实际运行结果`NATIVE_SERIALIZED_CONFIG_PASS models=9 slots=5`。静态0错误347告警；全部12张图均低于3000，最大图原始949/折算1576，余1424。根交付副本hash与候选一致。

当前候选官方导入、真实ready、原生交互与两幕连续流程、运行负载、PC和实体手机均未验收；TASK-103保持In Progress，PR保持draft，不合并、不发布。用户本轮没有让出新的键鼠窗口，因此本轮没有GUI输入或改写官方存档。

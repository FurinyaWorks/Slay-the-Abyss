# 原生3D迁移首个地图写入优化

范围仅为 abyss_map_ui 的图标颜色发布；不改规则、地图选择、RNG、呼吸速度、裁剪、滚动或尺寸缓存。

对真实生产 paintRoom 的原生属性替身计数：稳定房间连续300次绘制，旧实现300次 imageColor 写入；新实现1次。原始RED为 stable room resubmitted colour，GREEN为 MAP_COLOUR_CACHE_PASS。这是Lua到原生属性的提交次数，不能换算成手机FPS、GPU时间或加载耗时。

颜色按实际整数RGBA、颜色工厂身份、房间owner和原生句柄去重；保留alpha量化变化、原地ink编辑、换图/换owner和新句柄的发布。弱句柄表不持有控制器。写前撤销缓存承诺，原生属性写入部分生效后抛错和同句柄重入均在下一轮重试；错误照常向上抛出。

未采用旧报告中的GameUI两次render合并：Git提交350233a2（PR #501）专门恢复激活时与原生可见性回调后的两个可观察绘制边界，当前runtime_ui_hotpaths负控保护该行为。2026-11-03报告的2→1计数属于已回退历史，不能重复当作本轮可用收益。

本轮命令（production独立树，Node22.22.1/Fengari，非原生客户端）：

```powershell
node scripts/test-lua.mjs tests/lua/map_room_colour_cache.lua
node scripts/test-lua.mjs tests/lua/mobile_render_write_cache.lua
node scripts/test-lua.mjs tests/lua/mobile_map_size_ownership.lua
node scripts/test-lua.mjs tests/lua/map_ui.lua
node scripts/test-lua.mjs tests/lua/map_ui_chapters.lua
```

新缓存回归、既有写入缓存10项、地图句柄所有权3项、地图UI27项与章节3项通过。架构检查当时被并发新增native battle模块尚未分类/生成配置缺失阻断，Lua静态检查因本树未配置Luacheck未执行；这两项交由集成者在组合树补验，不记为通过。

候选写入/官方导入/新ready/PC与实体手机体验均未在本切片执行。后续需同候选静止地图、连续滚动和进入节点取证，不能继承旧候选的设备结果。

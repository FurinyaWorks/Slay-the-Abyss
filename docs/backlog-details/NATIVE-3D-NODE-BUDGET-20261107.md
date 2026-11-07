# 修复官方节点折算超限

TASK-103 / PR556。用户官方校验截图拒绝4da4f751：`_GSTS_LAB3D_server`原始1366、官方折算3019，上限3000；工具write_graphs已返回同值超限警告，旧构建仅验written数量/非空图，属于漏验，旧成功回执不代表可试玩。

修正将九模型重复的清理和动作分支合并为真实prefab_id列表循环。元件显式声明LAB_hasHit，并在创建时写实际模型布尔值，保留真受击clip与无clip时原生特效路径。未删除模型、场景、两幕内容或规则，未改RNG/数值。首次用config_id被GTS真实类型检查拒绝，失败收据保留；按正式PrefabIdValue签名改prefab_id后真实编译通过。

编译written limits、场景inspect及脚本写完后的最终GIL全部图均执行raw/editor双计数≤3000硬门禁，缺失、负数、非整数或非有限数拒绝。最终计数直接复用既有MCP adapter.inspectBytes与其已测editorCount，不另造折算公式。门禁必须先于成功回执与交付复制。实际旧3019 GIL已由回归拒绝；边界3000通过、3001/3019拒绝及原11项原生路由合同通过。

最终源码ab9d13515eeea4b5c2314cabc4c7264a24f68c2c，buildId920a6acb-8fe0-488c-a644-576c11a33d10。根.artifacts/杀戮原塔2-节点预算修正版-ab9d1351.gil，15,712,976 bytes，SHA256 3eb872050b778cc8b668d9a570e8607147626f1a0b04826cb3bbf8e0fac1aff9。收据、全部调用、图预算及源码清单在工作树.artifacts/native-budget-final/同buildId/。

最终GIL读回：主图raw949/editor1576，余1424；unit72/281、player37/75、settlement22/72，其余图更低。349 Lua完整读回；静态检查通过。离线计数不代替本候选官方重新校验、ready、运行负载、两幕流程或实体手机实测，这些保持未验收，任务仍In Progress。

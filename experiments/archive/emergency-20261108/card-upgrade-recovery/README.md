# #554 卡牌升级：可恢复修复实验

**归档实验，默认 develop 不启用。** 本包保留旧 delivery/runtime 的完整二进制补丁及已验证的最小修复，不宣称原 PR 可以合并、SCC 已下降或 M7 已完成。

来源基线 `d8a57cae2a867200ca8e588abc0d368e6cdb3799`；delivery HEAD `e7a5020a9acc543f842958fb863a12fe0fedd47e`；runtime HEAD `1786d84bfb7481634541b9fda61650881d9d4804`。两份 `original-*.patch.gz` 是完整 `git diff --binary` 的无损 gzip，压缩前后身份见 PROVENANCE。原始运行时的代理 API 回归仍然保留，不能将这些旧补丁直接当作修复版。

最小修复以 develop `a0c35db8d3c7242437f4dff0df373749b0d84985` 为基线，只涉及 `abyss_combat.lua` 与新增 `abyss_card_upgrade.lua`：Combat 保留四个原始 own 字段及 nil 元表；升级通过每次显式 host 参数读取动态槽；Blood hook 在原部分写入之后才读取原 WarriorStatus。`WarriorStatus.onUpgrade` 与 Stasis 的原 Combat 入口保持基线源码。新规则模块不保存或注册 host，不接后端，不改卡牌、数值、RNG 或流程。

实测：原升级 fixture 11 组、WarriorStatus 29 组、Stasis 来源 3 例、relic dynamic 与 hooks-turns 通过；真实 CardActions → relic 回调的 Combat 仍有 56 个 raw 字段与 nil 元表。三个完整 API/状态/RNG 对象图与原基线逐字一致，每侧 404,257 字节。旧代理版对同一 raw 探针真实失败。另跑的 UI 升级来源 fixture 因隔离副本缺少生成 `abyss_map_layout` 失败，不能算通过；不据局部结果宣称 Full CI、官方导入或设备体验已验收。

恢复时先在隔离 checkout 检出修复基线，再应用 `card-upgrade-minimal.patch`，安装仓库既有依赖并构建 data/theme。在仓库根目录运行：

```powershell
node node_modules/fengari-node-cli/src/lua-cli.js -e "dofile('<archive>/fixtures/card_upgrade_ownership_contract.lua')"
node <archive>/verify-raw-relic.mjs
```

`<archive>` 为本归档目录。第二个脚本要求实际应用修复补丁，比较基线与当前隔离源码，保留旧代理版负对照；证据写入 `build/card-upgrade-recovery`。现有工程模块导航、CC 门禁、来源 epoch 与 CI 合同尚未为该实验接入；将来正式恢复必须从当时最新 develop 独立评审，登记新 core 模块，并新增外层来源证明承接新的生产树，不可改旧 oracle 或 packed manifest 冒充旧身份。

# PR639 Full 失败纠偏

诊断对象：[Full 43395278722](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/43395278722)，PR head `5676767a6ac1cab10dfabbab4ad5a1aa9a39be7d`。本地修复树基于 `4910a5192`，与该 head 的内容相同。没有重新运行或跳过远端门禁。

## 实际失败

最早的真实失败在 POSIX2/15 job `131784836093` 于 `2026-11-13T08:47:29Z` 报告：`tests/lua/map_utility_header.lua:43` 的旧期望仍读取通用药水壳 ink，生产已复用实际战斗药水的 `Theme.icon.potionTint`。Windows10/18和18/18同样失败，非环境或来源归档错误。

Windows4/18 的 `official-assets.test.mjs` 还发现官方组合直接重建整棵商人控件，违反原有 semantic 对象身份合同。修复后继续完整运行，另外核实了同组件授权的台词/点击区域几何，以及药水管理行母层必须为 `[1,1]`，以免重复乘以已经存在于战斗药水state中的缩放。

Windows1/18 的增量 ratchet 是直接测量已提交的完整源码，并非来源投影误绑定。它拒绝以下五个增长；本轮按具体职责提取，保留原门槛：

| 函数 | develop基线 | 失败head | 修复工作树 |
|---|---:|---:|---:|
| DeckUI构造 | 14 | 17 | 12 |
| DeckUI.open | 49 | 50 | 44 |
| Merchant.pose | 13 | 20 | 10 |
| Merchant.update | 18 | 23 | 15 |
| PotionUI.refreshEntry | 18 | 20 | 14 |

新职责为 browser shell显隐7、官方browser输入绑定6、speech绘制11、speech时间线9、bottle绘制7，均≤15。原本超过15的DeckUI.open仍受原49上限，未宣称已治理为15。

## 最小修复

- 官方商人复用已存在的 `v25-node-layout.styleMerchant` 原位投影，保留所有原有文本、点击控件和容器对象。没有另写投影器。原 `strictEqual` 身份断言全部保留；受该组件拥有的字段精确对比 `merchantControl(theme)` 完整规格，其他页面仍对比原快照。
- 药水原fixture读取实际共享tint并比较RGBA，原容量、稀疏背包、所有四态及不变性断言保留。新增真实生产源码负控，只将strength potion改回旧通用ink，必须触发原fixture的颜色断言。
- Lua只拆分浏览器shell、输入绑定、商人speech及bottle绘制职责，保留行为和接口。

## 来源接续

所有原903、四源及closeout压缩快照不变。修复前五源 `94d6f85a…` 完整字节另存 `shop-deck-before-ci-repair-source-epoch.json.gz`，修复前CI `fa385b20…` 另存 `run-hud-before-ci-repair-ci-source.json.gz`，loader固定验证原摘要。五源前置状态有独立完整 `shopDeckBeforeCiRepairPrior` target。原完整Full inventory保持不变。

只重收当前五源archive及当前CI continuation；CI显式新增登记本轮受影响的 `map_utility_header.lua`、`map-utility-header.test.mjs`、`official-assets.test.mjs` 三个完整来源。原历史断言、原始receipt、未知drift拒绝及每次fresh owner认证保留。

## 验证

- 9个受影响行为文件：32/32通过，包含真实wrongtint负控、完整官方semantic身份、商人点按/交易与原生卡组生命周期。
- `check-engineering.mjs`：346模块、6021/6021测量、1955条架构边；无新Luacheck诊断，保留14条历史warning。
- 原ratchet policy的工作树诊断：完整903前置源码图与五个当前Lua来源，0新违规；报告在本机 `.artifacts/pr639-full-repair-20261113/ratchet-working.json`。它不是已提交SHA的CI通过证明。
- `ci-complete-calibration`、`integration-source-epoch`、`defect-final-source-epoch`、`encounter-formation-source-epoch` 四文件完整回归：139/139通过，208.6秒；无过滤、无跳过。

本轮日志保存于 `.artifacts/pr639-full-repair-20261113/`。没有提交、推送、重跑CI或自行宣称独审通过。既有视觉截图仍绑定原候选，不能据此改称新候选官方/设备验收。

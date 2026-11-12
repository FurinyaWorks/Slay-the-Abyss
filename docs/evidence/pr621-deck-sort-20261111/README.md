# 永久牌组与战斗牌堆排序边界修复

关联 #621 / TASK-103。基于 `680be9c5740a7f0c4fd4b1ce82ee2e9018a2612b` 的独立恢复切片，不覆盖原 PR 分支，不新增竞争 PR。

**功能修复通过；合并准入仍阻塞。** 新生产字节尚未接入最终组合的完整来源 epoch。原来源断言保持并实际失败，不借本地行为通过放行 CI。

## 实际缺陷与最小修复

永久牌组 `browseSorts` 和恢复偏好均只有 `original/type/cost`。战斗牌堆新增 `name` 后，永久入口仍用共用显示名表校验，误将牌堆专属值保存到 `masterSort`。原 `deck_browse_filters.lua:55` 的 `name/rarity` 拒绝合同是有效回归，已在原 680 源码真实复现，未删除或放宽。

本片只改一处生产入口：`setSort` 用既有 `browseSorts` 判断允许值，拒绝后不写状态。`setPileSort` 的四项模式保持原样。两个既有测试文件只增断言，覆盖拒绝时投影、方向、代次和偏好对象不变，选择/详情双入口拒绝，以及正式 UI 牌堆四项排序和永久牌组隔离。未改玩法、UID、Run/RNG、素材、几何、共享 source/copy/CI/属性、库存、成本或超时。

## 本轮验证

Linux x64，Node 24.22.1。分批结果分别报告，不累计初次和重跑成绩，也不称同一次整套通过。

- 原永久牌组完整测试在旧生产源码失败于有效拒绝断言。修复后完整五组通过。
- 定向批中的三个完整 Node 测试文件通过：`deck-browse-filters`、`deck-item-lifecycle`、`deck-scroll-detail`。
- 完整 `official-assets-runtime` 21/21 通过，零失败、取消、跳过；进程 104.159 秒。9657 个清单项、9449 个物化输入在前后阶段摘要相同。保留原各子进程 30 秒限制。
- 原完整 Lua `deck_pile_view` 5 组、`game_ui_pile_entry` 4 组通过。各自记录前后输入无变化。
- pinned Luacheck 1.2.0、JavaScript syntax、guidance、Backlog、network、diff 通过。Lua 保留 14 条历史诊断，2122 项责任计量。
- 原 `official-battle-pile-source-epoch` 完整文件实际失败：当前 deck 源码不等于冻结 `afterSource`。这是仍需整合的身份边界，不修改原档案或 hash 消除失败。

首轮官方 UI 用例在构建阶段因稀疏检出未物化 `art` 的原许可证而出现20项 ENOENT；普通三文件与默认 profile 当轮通过。仅补物化原 Git `art/.codebuddy` 后重跑完整官方文件。首轮 syntax 期间1130个原缺失项被物化，源代码/脚本/测试/配置/数据未改，故不声称首轮全程输入不变。guidance 首次另缺 `.cursor`，补物化该原目录后通过。全部初始失败、原始日志和清单保留。

## 证据与接入

- [独立审查](independent-review.json)：源码与实际日志复核；来源整合阻塞保持。
- [交付摘要](delivery-summary.json)：三个修复文件、补丁和工具的完整 SHA256。
- [原始证据包](validation.tar.gz)：红/绿日志、完整原始检查、前后输入清单、运行脚本及精确补丁。包内 `MANIFEST.json` 列出成员摘要。

中央集成人应保留本片三路径增量及 #621 既有六路径修复，在真实最终组合上新增认证完整来源的外层 epoch、补齐历史读者与成本身份接线，再按精确 HEAD/BASE 独审和正常 CI。旧 `pileSourceProof`、旧 source archives、原断言和漂移拒绝必须保持。不要将本片树直接作为可合并树，也不要覆盖前移分支的整文件。

本轮没有运行 Full、Windows 原生、官方导入、ready 或设备测试；没有启用 auto-merge、写独审准入 status、合并或发布。Backlog CLI 在云环境缺失，未手改任务或声称认领/收口。

复核行为入口：先 `npm ci --ignore-scripts`、`npm run build:data`、`npm run build:ui`，再按证据内命令运行上述完整文件。保留原各阶段时限；来源准入失败需整合，不能用重跑替代修复。

证据包 SHA256：`1fa2654027631d9f8af33870cdb2d89c72b876fcc0dc25a70697e78e6a59af20`。

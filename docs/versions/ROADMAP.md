# 版本路线图与版本策略（2026-11-14）

> **当前建议目标：v2.0.0（未发布、未冻结、无 Tag）**。本文是产品版本规划与工程检查点账本，**不**代表 Milestone Done、PR 已合入、Git Tag 已创建、官方千星奇域已更新或取得实机验收证据。实际发布必须走 [v2 发布验收单](V2-RELEASE-CHECKLIST.md) 和 [发布操作单](../PUBLISHING.md)。

## 1. 先说清楚：什么值得升 2.0

上一个真实源码 Tag 是 [`v1.0.0`](https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v1.0.0)，2026-11-01 创建、固定在 master 的 `e970eb2a71e44d352850af148a8f696c5ecaed8e`。该 Tag 的说明保留了 Owner 确认部署，但 [平台发布账本](../../data/release/publications.json) 目前为空，尚未独立记录 GUID、发布时间、回执。

2026-11-14 审计远端 `refs/tags`：现有 `v0.1.0`～`v0.10.1` 的 14 个注释 Tag 与 `v1.0.0`，共 **15 个**；**没有 `v1.1.0` / `v1.2.0` / `v2.0.0` Tag，也没有 GitHub Releases**。旧 [版本索引](README.md) 和 [更新日志](../../CHANGELOG.md) 已记录 Alpha 演进，禁止重复创建、移动或冒充平台发布。

目标 2.0 的理由不是“改了很多文件”或重构了大量 Lua，而是**玩家可感知的整体产品换代**：V25 战斗/地图与各非战斗界面，原生几何拟合背景及角色表现，选角命之座、开局转场、菜单返回/恢复，及输入、资源负载、页面生命周期等贯穿首次游玩的体验重构。它同时有系统/界面行为不兼容的风险。因此，**建议将 M8-A 的对外视觉与交互更新升级定位为 `v2.0.0`**，替代 11 月 3 日 Q4 规划中 *尚未发布* 的 `v1.1.0` 候选。

**限制**：当前已合入 `develop` 的只是部分基线。[#661](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/661)（组合视觉/场景等）和 [#663](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/663)（菜单返回/继续本局）在本次审计时仍为 open，不能写成已交付。相关来源 [#662](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/662) 已关闭但未单独合并，其成果仅按 #661 最终集成与验收计入。未合功能及未验收美术不进入正式玩家更新说明。

## 2. 版本列车（版本与 Milestone 分开）

| 版本 | 类型 | 交付范围 / 定位 | 当前状态 |
| --- | --- | --- | --- |
| `v1.0.0` | 已存在正式源码 Tag | 岩系旅行者前两幕正式基线；平台部署由 Owner 确认，回执尚缺 | **保留原 Tag，禁止移动** |
| `v1.1.0`、`v1.2.0` | 11/03 历史规划编号 | 原定 M8-A 外观体验、M8-B 自研职业；并未冻结或发版 | **仅保留历史提案，不补造 Tag** |
| `v2.0.0-rc.1` | 首个可冻结候选（如需要） | 本轮视觉/交互重构的完整第一、二幕旅行者候选；内容冻结、同 SHA/产物的 RC 回归 | **待合入、构建、验证后才允许创建 Tag** |
| `v2.0.0-rc.N` | 后续 RC（按需） | 只修 RC 阻断问题；任意源码/素材更改需新候选身份和重验 | 尚未创建 |
| **`v2.0.0`** | **下一正式版目标** | 经 Owner 验收的 M8-A 视觉/交互换代；正式默认入口只承诺岩系旅行者第一、二幕 | **计划中；尚无 Tag／平台发布** |
| `v2.0.1` | 可能的热修 | 2.0 发布后确有阻断性修复才建立 | 条件性，非预留 Tag |
| `v2.1.0` | 后续功能版提案 | M8-B：经批准并实际可玩的新职业/独立机制 | 待另行范围与真机验收 |
| `v2.2.0` | 远期功能版提案 | M9：后续角色、第三幕/隐藏第四幕按容量和品质分批开放 | 不阻塞 2.0，不承诺日期 |

不因 Sprint、PR 数量、文件改动量或内部 M7 架构完成而单独强制升版。若最终用户体验并未达到换代标准，可重新评审是否回退为 `v1.1.0`；**禁止同时给同一发布候选打 `v1.1.0` 和 `v2.0.0` 两套正式 Tag**。旧 Q4 计划的版本编号由本文件覆盖，M7/M8/M9 的任务归属、验收标准和历史记录不变。

## 3. 1.0 以来关键工程检查点（不是版本 Tag）

| 观察日期（北京时间） | 已在 `develop` 的可追溯提交 | 能说明什么 |
| --- | --- | --- |
| 11/08 | [`a0c35db`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/a0c35db8d3c7242437f4dff0df373749b0d84985) | M7 职责和默认 2D 基线汇合 |
| 11/11 | [`6a614fc`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/6a614fc82697750ddb408750e54f59f801c24f1e) | UI、工程切片组合及回归修复 |
| 11/12 | [`903bf2a`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/903bf2a31e91f10fb24763ab4cea23d586d0bb83) | 以战斗页为统一正式 UI 的并行集成 |
| 11/14 | [`9f2f44e`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/9f2f44e4c79789fbcb64a515938765dbc240f830) | 1600 图元原生背景实验与工具进入 develop；**不代表该表现已在正式候选实机通过** |
| 11/14（在途） | [#661](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/661)、[#663](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/663) | 目标交付集合，直到各自 `merged=true` 且合后测试通过才属于新版本 |

这些提交是工程演进的真实事实，不是独立平台上线批次。**不补造 `v1.1.0`、`v1.2.0` 等历史稳定 Tag**；任何确实遗漏的“已真实发布”版本，必须先取得确切来源提交、对应候选/平台凭证再单独处理。这样可以回溯变化且不污染 SemVer。

## 4. 实施与命名纪律

- 源码版本号使用 `package.json`，同步 lockfile、生产 manifest、主菜单版本显示；**今天仍为 `1.0.0`，不提前写成 `2.0.0`**。
- 开发在 `develop`；冻结后根据需要从受控 `develop` 建 `release/2.0.0`，冻结唯一 SHA、buildId、GIL SHA256、payloadDigest。发布 PR 将已验版本送入 `master` 并回合 `develop`；与当前 `master` 历史协调，**不可直接把在途 PR 或旧实验证据视为 master 发行版**。
- Git RC 后缀仅用于源码版本标识；千星平台是否允许该字符串以官方真实表单为准，不将 Git Tag 与平台数字版本强行等同。
- 完成同候选必要质量/官方/设备门禁后，才在**最终、准确的发行提交**创建不可移动的 annotated Tag（比如 `v2.0.0`）；已存在 Tag 不覆盖、不移动、不重复。没有满足标准就继续 RC 或延期，而不是用 Tag 宣告通过。
- 版本目录统一记录源码 Tag/对比和计划；[CHANGELOG](../../CHANGELOG.md) 只写最终已核实的玩家可见更新，技术变更另记 [ENGINEERING](ENGINEERING.md)；平台真正发布后才写 [publications](../../data/release/publications.json)。
- 游戏品牌名、仓库名、标题、平台展示名及版本号应在冻结前一致核对，**不要仅凭仓库重命名推定所有游戏资产/官方展示均已更名**。
- 当前 M7 / M8 / M9 的正式任务和验收以 [MILESTONES](../MILESTONES.md) 及 Backlog CLI 为准；本路线图不创建重复任务、不改变 Milestone 完成状态。

下一步从 [**v2.0.0 发布验收单**](V2-RELEASE-CHECKLIST.md) 收口，不先大规模扩职业或增加第三、第四幕。

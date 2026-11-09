# 千星工具生态差分：原生素材 × Simulator × 生产 GIL（2026-11-09）

> **性质：已核对外部源码的技术路线补充／实施参考；不是完成报告。**
> **执行归属：#588（官方素材优先的完整可玩 UI）**；页面准备、缓存、失效与回收沿用 **#582 / TASK-100.1**；结果与 actual-GIL 取证沿用 **#581 / TASK-104**。本文件不建立新的运行时 Owner、Backlog 任务、CI 工作流或并行实施分支。M7/M8 准入仍以 `AGENTS.md`、`docs/SPRINT_EXECUTION.md` 和 Backlog CLI 为准。
> 本 PR 仅新增此文档；**7.2 新目录采集继续暂缓**，不修改 MCP Fork、发行策略、`master` 或候选 GIL。

## 1. 我们已有的闭环与真实缺口

| 层 | 现有实物 | 这次补的差异 |
| --- | --- | --- |
| 游戏语义 | `src/lua` 的 Run/Combat，Fengari 真实 Lua 回归 | **不写平行玩法逻辑**；浏览器操作必须调相同生产命令并读真实状态 |
| 视觉输入 | `data/presentation/ui_theme.json`、既有图片 ID、原 V25 美术 | 从「只查编号」补到**用途搜索→看原图→核对 Basic/Stretch→选少量原生图片** |
| 离线可视化 | `experiments/art-tech-lab` 的 BeyondSimulator 0.5.2、`experiments/native-ui-preview` | 从局部静态画面和 mock 断言补到**同源生产 Lua 的浏览器连续可玩** |
| 原生构建 | `scripts/build-native-candidate.mjs` + 既有 MCP + GIL 写入读回 | **有针对性的字段对照**，不把通用 Simulator→GIL 导入称为无损 |
| 性能/验收 | #581/#582 冷暖、SDK、回放及回收机制 | 只复用，区分浏览器帧率、SDK 耗时、官方客户端 GPU/容量和实体手机 |
| 固定镜头布景 | #553 3D/原生组件既有研究 | XingGou 只可作为可选离线选景参考，不恢复全量 3D 迁移 |

关键已有入口：`docs/TOOLCHAIN.md`；`experiments/art-tech-lab/{rpc,build,run,verify}.mjs`；`experiments/native-ui-preview/build.mjs`；`scripts/build-native-candidate.mjs`；`npm run test:related` / `npm run check`。已知 Beyond 0.5.2 的证据不自动代表新版本已在本机安装。

## 2. 外部仓库得到的可复用发现（按任务，非按工具数量）

| 来源 | 经源码/文档核对的能力 | 我们采用的最小部分 |
| --- | --- | --- |
| [Miliastra-image-editor-webui](https://github.com/1475505/Miliastra-image-editor-webui) | `list_asset_categories` / `list_asset_uses` / `search_assets` / `preview_assets` / `get_asset_info`；原生 UI 图片的用途/外观查询、按 ID 总览、三/九切片 | 在 #588 的**战斗页**为卡框、按钮、底板、徽章各选少量候选；将 ID、来源、原图、拉伸参数留在现有主题/清单，不搬整个编辑器 |
| [Beyond Simulator](https://github.com/1475505/miliastra-beyond-simulator) | Lua + 控件模拟、手动/实时两种时钟、Web 真正输入/动画、PNG 和浏览器渲染；白名单素材按需缓存 | 用已安装版本重用生产 Lua，额外做一条**浏览器输入→真实战斗→奖励回图**路径；避免重复截图循环 |
| [8itlab MCP / 自有 Fork](https://github.com/FurinyaWorks/genshin-miliastra-mcp) | 官方资源目录、真实 ID、GIL 读写和官方自动试玩；`scene_import_simulator` 可转其已支持的子集 | 保留为**索引与原生交付验证工具**；优先沿现有生产构建器，不强制改走通用转换器 |
| [ugc-tool](https://github.com/xiaomoL444/ugc-tool) / Beyond UI-VFX | 官方 UI 动效目录及浏览器预览；Beyond 的 Host PNG 不解码视频帧 | 对选定少量动效用**真实浏览器截图/短回放**，不把静态 PNG 无动效判成素材不存在 |
| [QHY8IV/miliastra-ugc](https://github.com/QHY8IV/miliastra-ugc) | Lua/LuaHost 静默失败、控件/模板和存档诊断 | 遇到对应错配再采纳测试思想；不引入第二整套模拟器 |
| [XingGou](https://github.com/Crazyfourrrrrrrrrrr/XingGou) / [genshin-ugc-webui](https://github.com/zmy15/genshin-ugc-webui) | 3D 原生模型离线构景；另一边有控件池/diff 的实机探针 | 选景或定位问题时参考；不替换当前 2D 交互/UI Owner |

**素材口径**：MCP 图片索引 15 类共 1,590 个 ID；Beyond 旧白名单 1,522 个；第三方镜像快照另有 21 个有 ID 但无图片内容，47 个目录差额需核实。**目录里有 ID ≠ 有可获取 PNG ≠ 可在最终客户端使用**，不得把 68 个差额全部称为 7.2 新素材。元件的 **2D 图标**也不是它的 **3D 模型/人物立绘**。图像缓存失败（原项目曾有 403/fetch failed）必须显示为缺图并给出来源，不许换同 ID 的无关私有贴图来“通过”。

## 3. 真正需要修补的两个接线点

### A. 选材与最终 GIL 语义一致

针对少量实际选定的面板、图标和按钮，记录 `imageSource + imageId + imageType (Basic/Stretch) + border/cap + tint + owner + provenance + verifiedAt`；保留原 V25 素材的身份和回退入口，不新增第二套主题系统。

对以下边界先给**最小对照夹具**、证明是否会影响本项目，确认后才修生产路径：

- `8itlab/src/simulator-import.mjs` 的通用转换器只接收已知 `qxqy-simulator-save` 范围；不是整张 GIL 逆向运行器。
- 该转换器通过 AST 将与模板 ID 数值相等的整数字面量替换为新 ID；它避免误改字符串/注释，**但无法仅凭数值证明某个常量在语义上是模板 ID**。需测试普通同值常量不被误改的路径。若 #588 不调用此转换器，则登记外部兼容问题，不把它变为本 PR 的发布阻塞。
- 当前 Beyond `defaultChildId`/四态按钮与旧转换器的按钮字段处理不同；`imageType` 的显式 Basic/Stretch 和 `Prefab` 图片来源不保证原样透传。按源→转换→GIL读回验证；失败需明确拒绝或在已有 Lua 绑定层修正，不静默退化。
- 父遮罩/子控件及非空 UI 动效配置存在已知子集约束。只对要交付的字段核实，不为此全量逆向。

**通用转换器改动不属于本次游戏 PR**；如证据证明它是实际瓶颈，后续由 Codex 在自有 MCP Fork 独立小 PR 修复并优先贡献上游。

### B. Simulator 运行的是现有生产游戏，而非静态演示

最小路径：**菜单/选角 → 一场真实 10 手牌、双敌战斗 → 点击/拖牌/取消/敌回合 → 真正取奖励 → 回地图**。

- 同源生产 Lua、主题及已登记的素材身份；真实 Run/Combat 事务、RNG、UID、伤害/状态/经济不可由 mock 或示意数据代替。
- 先用 Fengari 现有夹具证明业务结果；再通过 Beyond **真实浏览器**的输入事件和截图证明 UI 交互。不能把测试直接调控制器函数叫作“鼠标/触屏测试”。
- **两条明确不同的证据**：确定性手动时钟用于同种子回放与状态断言；Web 实时播放用于动效、资源是否真加载、点击拖动和玩家体感。Host PNG 不含视频帧，不据此否定动效。
- 每次明确加载的游戏源码 SHA、模拟器版本、save/生成候选 SHA、图片缓存状态、资源警告及页状态。仅 `simulator_pass` 不表示原生导入、官方 ready、PC 或 Android FPS。

## 4. 小实验顺序及 Go/No-Go

1. **资源选型切片**：只替换 #588 真实战斗页上最有价值的卡框/按钮/底板，候选 ID 可追溯；对图像缓存 403、缺图、基础/拉伸、可读性与完整 UI 信息显式验收。记录控件数、加载时序和同候选页面图；不同画质不能算“同画质提速”。视觉不合格保留 V25 回退。
2. **字段一致性切片**：一张小界面验证四态按钮、Stretch、Prefab 图标、遮罩、模板引用；源→Simulator→实际使用的 GIL 构建器读回，若测试的是通用导入器须单独注明；不确定字段明确 `UNVERIFIED`，禁止无损宣称。
3. **真实游玩切片**：复用 #581/#582 的 outcome 和生命周期机制：真实输入完整战斗/领奖回图、至少 20 次切场与资源回收、同一版本源码/素材。需要真实 UI 与浏览器动效证据，空白/错图/静态演示一律 No-Go。
4. **按需原生校准**：仅新增/不确定的映射用当前候选真实官方 GIL 验收；官方设备操作遵循 `AGENTS.md` 的当轮授权。冷暖、官方容量、GPU FPS、实体手机独立报告。无设备记录 `UNVERIFIED`，不虚构“90% 模拟器覆盖”。

## 5. 分工与完成条件

- **Dot / #588**：以真实战斗页优先实现及选材，不与 #582 的 UI 生命周期抢改文件；后续把产物扩至主菜单、选角、地图、商店/事件和结算。
- **#581/#582 原 Owner**：现有产品结果与 UI 生命周期机制继续各自实施和验收；这里不另建 manager、脚本加载器、缓存、CI 工作流。
- **Codex 后续独立工作**：新 7.2 图片目录仍按 Owner 决策暂缓；如通用模拟器导入出现已复现的问题，在自有 MCP Fork 另提兼容性 PR，避免阻塞 #588。
- **工程门禁**：不改 Backlog 原文件；实施时从真实 Backlog CLI 核对既有任务和 Sprint 准入；复用 `npm run test:related`、`npm run check`、候选读回和原生 Merge Queue；**本参考文档 PR 不冒充运行时交付**。
- **结果必须可审**：候选与源码/资源哈希、截图/短录屏、资产可追溯清单、动作与输入链路断言、失败和 unknown、设备证据强度明确区分。只有“可点击的完整游戏 + 可用画面 + 原生交付候选”才进入最终验收，不以工具对接数量记功。

## 6. 外部参考（本轮已查）

- [Beyond 控件支持矩阵](https://github.com/1475505/miliastra-beyond-simulator/blob/master/studio/docs/control-support.md)、[素材与缓存](https://github.com/1475505/miliastra-beyond-simulator/blob/master/studio/docs/image-assets.md)、[WebMCP 使用](https://github.com/1475505/Miliastra-image-editor-webui/blob/main/docs/webmcp.md)
- [Beyond 动效证据边界](https://github.com/1475505/miliastra-beyond-simulator/blob/master/studio/docs/ui-vfx-playback.md)、[MCP 模拟器导入器](https://github.com/8itlab/genshin-miliastra-mcp/blob/main/src/simulator-import.mjs)
- [素材编辑器的选择 Skill](https://github.com/1475505/Miliastra-image-editor-webui/blob/main/skills/miliastra-image-asset-selector/SKILL.md)、[九切片说明](https://github.com/1475505/Miliastra-image-editor-webui/blob/main/docs/image-stretch.md)
- [XingGou 真实原生静态单位验证](https://github.com/Crazyfourrrrrrrrrrr/XingGou/blob/main/docs/VALIDATION.md)

本轮外部代码和 README 核查是**研究证据**，不是这些工具已在本机重新安装、CI 执行或原生游戏已验收；不复制第三方素材与不兼容许可的源代码到本项目。

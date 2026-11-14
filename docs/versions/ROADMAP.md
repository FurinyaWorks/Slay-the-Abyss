# 版本路线图：Version → Epic → 任务类型 → 提交与计划

> 基准：**2026-11-14 21:45（北京时间）**核对 GitHub `develop@9f2f44e`。这是**版本归属索引**；当前版本上线检查在 [2.0 发布清单](V2-RELEASE-CHECKLIST.md)。玩家能直接阅读的更新公告**只**在 [CHANGELOG.md](../../CHANGELOG.md)，写法见 [CHANGELOG-GUIDE.md](CHANGELOG-GUIDE.md)。

**层级规范**：`Version`（发布批次）→ `Epic`（一个完整的玩家或工程目标）→ `Feature / Bugfix / 技术债`（执行项）→ **PR/Commit、优先级、状态**。Epic 是分组，不是另一套任务。高/中/低指**当前发版视角的处理优先级**，并不覆盖 Backlog 的原始 `priority`；高 = 影响本次发版/必须处理，中 = 已承诺的品质提升或后续必要完善，低 = 非阻断/实验/远期。**已合入**只说明 Git 状态，不等于真机验收通过。

## 版本总览：先看交付边界

| Version | Epic 归属 | 对应源码区间 / 版本提交 | 状态 / 下一动作 |
| --- | --- | --- | --- |
| **[v1.0.0](https://github.com/FurinyaWorks/Slay-the-Heavens/tree/v1.0.0)** | 岩系旅行者前两幕正式源码基线 | `e970eb2a71e44d352850af148a8f696c5ecaed8e` | **Tag 已有；不动**；平台回执未入账 |
| **v1.1.0** | E11 轻量化画面、E12 核心稳定性、E13 交付工程 | [v1.0.0 → a0c35db](https://github.com/FurinyaWorks/Slay-the-Heavens/compare/v1.0.0...a0c35db8d3c7242437f4dff0df373749b0d84985)（`develop` 侧新增 54 提交）；**落点 `a0c35db8d3c7242437f4dff0df373749b0d84985`** | **源码已合 / Tag 待补**；回溯检查点，不冒充平台发版 |
| **v1.2.0** | E21 游戏界面整合、E22 组合缺陷、E23 工程去债 | [a0c35db → 903bf2a](https://github.com/FurinyaWorks/Slay-the-Heavens/compare/a0c35db8d3c7242437f4dff0df373749b0d84985...903bf2a31e91f10fb24763ab4cea23d586d0bb83)（9 提交）；**落点 `903bf2a31e91f10fb24763ab4cea23d586d0bb83`** | **源码已合 / Tag 待补**；#665 的版本元数据补正尚未合入 |
| **v2.0.0** | E30 主菜单与选角、E31 正式游玩、E32 美术资源、E33 性能验收、E34 版本交付 | [903bf2a → 当前 develop](https://github.com/FurinyaWorks/Slay-the-Heavens/compare/903bf2a31e91f10fb24763ab4cea23d586d0bb83...develop)（当前已合 2 提交）＋ [#661](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/661)、[#663](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/663)、[#665](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/665) 在途；**最终发行提交待定** | **目标正式版本，不能打 Tag / 不能发布** |
| **v2.0.1** | E41 缺漏音效、E42 小范围体验修复 | **无提交（未来规划）** | 2.0 后的修订版，不给它提前打 Tag |
| **v2.1.0** | E51 新可玩角色与独立构筑 | **无提交（未来规划）** | 后续 Feature 版，待真正验收 |
| **v2.2.0** | E61 后续章节 | **无提交（未来规划）** | 远期候选，不绑定日期 |

> `v1.0.0` 在 `master` 的正式合并提交上，后续 `develop` 与它存在一条发行提交的历史分叉。上述比较链接是**完整源码区间**；关键节点在下面按 Epic 分类，不将每一个 CI/测试提交冒充新玩家功能。历史 Tag 的日期不等于千星官方实际更新时间。

---

## v1.1.0｜历史开发版（11/08，源码已合，Tag 待补）

**最终源码**：[a0c35db](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/a0c35db8d3c7242437f4dff0df373749b0d84985)；[查看此版本区间全部 54 个提交](https://github.com/FurinyaWorks/Slay-the-Heavens/compare/v1.0.0...a0c35db8d3c7242437f4dff0df373749b0d84985)。

### E11 · 轻量化画面基础（Epic）
- **Feature · 中 · 已合**：建立默认二维表现与合并后的绘制基线。来源 [#560](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/560) / [`a0c35db`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/a0c35db8d3c7242437f4dff0df373749b0d84985)。**仅说明源码基础已具备**，不是所有页面都已做完。
- **Bugfix · 中 · 已合**：修复地图尺寸更新相互覆盖。来源 [#481](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/481) / [`3d75e04`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/3d75e04eed1a1a0b87c959dc30333ab571e4a1e6)。

### E12 · 战斗与资源稳定性（Epic）
- **Bugfix · 中 · 已合**：处理奖励页面尺寸更新冲突、战斗画面显示顺序。来源 [#484](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/484) / [`aa4d56f`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/aa4d56f57c15727668ef8675e626b44e67a5aaa5)、[#501](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/501) / [`350233a`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/350233a27cd2f3f3561a5af866f72d660d707269)。
- **技术债 · 中 · 已合**：拆开战斗回合、状态更新、遗物生命周期等高耦合职责。来源 [#511](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/511) / [`b4ac631`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/b4ac63145689b9dd632db100eee49087f6182b39)、[#513](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/513) / [`a308edb`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/a308edbfde7792485cbe79b5650c17e1c7de98cc)、[#521](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/521) / [`c685409`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/c685409d7d34d91cae79e917090fe4299184ca8b)。

### E13 · 多 Agent 集成与测试能力（Epic）
- **技术债 · 中 · 已合**：接入独立复审后的自动合并与安全快速检查。来源 [#502](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/502) / [`67493f1`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/67493f1a707dd5332788b4081adb3c3ce6e46761)、[#531](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/531) / [`73aabce`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/73aabce8b04c604a06931b1aee3eb84d820c42e7)。
- **技术债 · 高 · 待办**：将 `v1.1.0` 注释 Tag 补到**精确** `a0c35db8d3c7242437f4dff0df373749b0d84985`；不改旧源码，不补造对应的平台已发布回执。

## v1.2.0｜历史开发版（11/12，源码已合，Tag 待补）

**最终源码**：[903bf2a](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/903bf2a31e91f10fb24763ab4cea23d586d0bb83)；[查看此版本区间全部 9 个提交](https://github.com/FurinyaWorks/Slay-the-Heavens/compare/a0c35db8d3c7242437f4dff0df373749b0d84985...903bf2a31e91f10fb24763ab4cea23d586d0bb83)。

### E21 · 战斗与冒险页面统一（Epic）
- **Feature · 高 · 已合**：统一战斗、地图、奖励、商店、卡组等主要页面的版式和信息展示；采用战斗页作为共享样式基准。来源 [#607](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/607) / [`6a614fc`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/6a614fc82697750ddb408750e54f59f801c24f1e)、[#634](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/634) / [`903bf2a`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/903bf2a31e91f10fb24763ab4cea23d586d0bb83)。
- **Feature · 中 · 已合**：接入旅行者已批准的战斗待机展示及共享缓存。来源 [#634](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/634) / [`903bf2a`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/903bf2a31e91f10fb24763ab4cea23d586d0bb83)。

### E22 · 页面错误修正（Epic）
- **Bugfix · 高 · 已合**：修复地图入口、顶栏遮挡、奖励内容重叠、牌面布局等组合显示缺陷；在同一集成节点修复相关手机操作提示。来源 [#634](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/634) / [`903bf2a`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/903bf2a31e91f10fb24763ab4cea23d586d0bb83)。
- **Bugfix · 中 · 已合**：组合整合时的来源身份和页面生命周期问题。来源 [#607](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/607) / [`6a614fc`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/6a614fc82697750ddb408750e54f59f801c24f1e)。

### E23 · 维护成本与验证工具（Epic）
- **技术债 · 中 · 已合**：继续减少运行时职责耦合、修复多分支组合回归。来源 [#576](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/576) / [`1eb2884`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/1eb288472d7b33b7450eec97a624ca2ffa526f39)、[#607](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/607)。
- **技术债 · 低 · 已合（实验 NO-GO）**：验证原生差分更新与补间方案未获得准入，不作为已交付玩家功能。来源 [#613](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/613) / [`3a061a7`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/3a061a76b5eb917ac0f4213c01a9cbafd28d1824)。
- **技术债 · 高 · 待办**：将 `v1.2.0` 注释 Tag 补到**精确** `903bf2a31e91f10fb24763ab4cea23d586d0bb83`；当前代码的三份版本元数据由 [#665](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/665) 补正，**它不属于这个历史提交**。

## v2.0.0｜本次正式上线目标（尚未合并完毕）

**提交归属**：目前 `develop` 只有 [#639](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/639) / [`e805a87`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/e805a87dc4df1a048ba5995931d98a4e4899b5e9) 和 [#648](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/648) / [`9f2f44e`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/9f2f44e4c79789fbcb64a515938765dbc240f830) 位于 `v1.2.0` 后。**#661、#663、#665 仍 Open，不能当成已合代码**；最终精确发行提交在真实合并和验收后才能确定。

### E30 · 主菜单、选角与开场（Epic）【高】
- **Feature · 高 · 在途**：完整主菜单、选角的金色命之座与角色信息、璃月开局过场。**集成入口 [#661](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/661)**；来源 [#650](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/650)、[#662](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/662)、[#660](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/660) 已关闭但未单独合并，**只按 #661 最终落地认定**。对应 TASK-103.3 等。
- **Bugfix · 高 · 在途**：解决页面准备状态导致的永久等待、选角头像阻塞、主菜单相关控件重叠。来源 [#661](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/661)；实机验收仍缺。

### E31 · 局内交互与完整两幕（Epic）【高】
- **Feature · 高 · 在途**：从局内返回主菜单、继续本局、明确放弃/退出边界。来源 [#663](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/663)，关联 TASK-4.16。
- **Bugfix · 高 · 待同版本实测**：卡牌拖放、目标选择与取消、切出返回、地图节点、两幕合法结束和结算。复用 TASK-30、TASK-38、TASK-42、TASK-77、TASK-47。**不是宣称这些代码都还没写，而是最终候选未过设备/整局验收**。

### E32 · 统一视觉与图标资源（Epic）【高/中】
- **Feature · 中 · 已合源码**：共享顶栏、卡组浏览与商店信息展示。来源 [#639](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/639) / [`e805a87`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/e805a87dc4df1a048ba5995931d98a4e4899b5e9)；最终候选仍待设备回归。
- **Feature · 中 · 在途**：敌人和遗物的低图元简图。来源 [#654](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/654) 的关闭未合来源，**仅在 #661 最终整合并完成验证后计入**；关联 TASK-25.5。
- **技术债 · 低 · 已合实验、未正式启用**：1600 图元角色背景与测量工具。来源 [#648](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/648) / [`9f2f44e`](https://github.com/FurinyaWorks/Slay-the-Heavens/commit/9f2f44e4c79789fbcb64a515938765dbc240f830)。该实验性能和正式设备仍未验；只有确认正式采用后才按 E33 的性能门槛放行。

### E33 · 启动、加载、性能与正式平台（Epic）【高】
- **Bugfix · 高 · 在途/待验**：页面准备时序、反复进出、对象回收、手机触控及加载异常。来源 [#661](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/661)、TASK-100.1、TASK-4.21、TASK-94。
- **技术债 · 高 · 待发布验证**：正式构建、全量 CI/独立审查、官方导入与 ready、PC 和实体手机、同候选官方关卡 ≤20MB 与服务器 ≤3MB。入口 [发布验收清单](V2-RELEASE-CHECKLIST.md)、[平台门槛](../PLATFORM_LOAD.md)。

### E34 · 版本、发布文案与正式上线（Epic）【高】
- **技术债 · 高 · 在途**：同步当前 `1.2.0` 的 package/lock/manifest、采用 [Keep a Changelog](CHANGELOG-GUIDE.md)、防止内部术语和版本漂移。来源 [#665](https://github.com/FurinyaWorks/Slay-the-Heavens/pull/665)（尚未合入），关联 TASK-20。
- **Feature · 高 · 待合并后实施**：确定 2.0 实际内容后，同一发行提交升为 `2.0.0` 并写用户能看懂的更新说明；**不用内部代号代替更新内容**。
- **技术债 · 高 · 待验后实施**：发行 PR → `master` 的**最终提交** → 不可移动 `v2.0.0` Tag → Owner 人工更新作品 → 成功回执。没有设备/容量证据不放行。

## v2.0.1｜下一修订版（规划，无提交、无 Tag）

### E41 · 新页面音效补完（Epic）【中】
- **Bugfix · 中 · 计划**：补主菜单、选角、地图切换、商店、领奖、宝箱等新增页面的**非关键缺漏提示音**，避免音量突变/重复播放；复用现有 TASK-4、TASK-34。仅补已存在交互的反馈时按 PATCH。**影响玩家判断操作是否成功的必要音效属于 2.0 阻断，不能后移。**

### E42 · 上线后体验修正（Epic）【中/低】
- **Bugfix · 中 · 待反馈**：针对真实设备及玩家提交的非阻断显示、触摸、声音问题修复；有复现/回归后才分配提交。
- **技术债 · 低 · 候选**：后续加载/图元实验按证据评估，不因研究任务无限延后已达标的发布。

## v2.1.0｜更多可玩角色（规划，无提交、无 Tag）

### E51 · 新角色与独立构筑（Epic）【中，2.0 后启动】
- **Feature · 中 · 计划**：雷电将军等新角色独立玩法、卡牌构筑、两幕可玩与正式角色入口，复用 TASK-85、TASK-59.3；所有功能必须实机验收才宣布开放。仅实验分支已有卡牌**不等于**正式可用。
- **技术债 · 低 · 条件性**：只有因新增角色引发新容量/性能约束时再开展对应优化，不提前混进 2.0。

## v2.2.0｜后续章节（远期候选，无提交、无 Tag）

### E61 · 内容规模扩展（Epic）【低】
- **Feature · 低 · 规划**：第三幕及其连续流程（TASK-62）、隐藏第四幕与钥匙/结局（TASK-64）；待角色和现有两幕质量稳定后再验收。
- **技术债 · 低 · 待评审**：后续容量和资产扩展必须先有实测预算，不能用历史包体读数证明可发布。

## 维护规则

- **版本归属由 Git 决定**：历史版记录完整 compare 区间和**唯一落点 SHA**；未来版先记录 PR/Backlog，合并后把最终 SHA 回填，状态从“在途/计划”变“已合/待验证”，不靠日期猜测。
- **Epic 是视图，Backlog 是工作项唯一账本**：本页引用现有 TASK，不再复制具体实现步骤或另起一套任务。新增缺口先在 Backlog 查重；仅经项目规定的 Backlog CLI 建/改任务。
- **CHANGELOG 只为玩家**：内部提交/技术债和未合功能留在这里；官方更新说明从已验收的玩家变更人工精简。参照 [Keep a Changelog](CHANGELOG-GUIDE.md) 和 SemVer，不要把自动 PR 标题直接发给玩家。
- **优先级不与 Milestone 混用**：本页“高”意味着当前发布行动紧急，不会偷偷把既有 Backlog 的 `medium` 改成 `high`。新 Feature/章节一律不阻塞本次 2.0。
- **补历史 Tag**：`v1.1.0`、`v1.2.0` 仅为回溯源码检查点。精确提交与现存 Tag 先核对，创建 annotated Tag 并远端读回。旧 commit 的 package.version 仍为 1.0.0，不重写历史，也不伪称平台已上线。**这两枚 Tag 尚未创建。**
- **正式 2.0**：在相关代码实际合入后才同步 `2.0.0` 的 package/lock/manifest/菜单显示与 CHANGELOG；源码和产物验收过关以后才在发行提交打 Tag。平台实际发布成功再补 [publications](../../data/release/publications.json)。

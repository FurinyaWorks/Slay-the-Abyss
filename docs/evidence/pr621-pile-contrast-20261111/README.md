# PR621 返回按钮对比度修复

基线：`680be9c5740a7f0c4fd4b1ce82ee2e9018a2612b`。本片独立于永久牌组排序 `9402bfb7`、六路径81项候选及 #623。只交付增量供原执行线接入，不修改这些公开分支。

## 修复

原 `mobile-typography` 在 `deckPanel/pileReturn/normal` 真实拒绝4.5对比度。普通与官方两个现有调用处现在均传入已有 `theme.officialAssets.buttonInk`，保留 helper 旧调用默认值；不修改主题、背景、几何、输入或玩法。四态最差对比度5.2088。官方最终画面沿原流程只保留 normal artwork 和独立 cursor receiver。

既有 pile layout 文件新增四态对比度、两入口自定义主题转发及官方 receiver 不变断言，未新增测试文件。独立递归比较完整 native/official 布局只发现5个 `text.colour` 叶变化：`#E0BC73` → `#FFF8E7`。没有其他结构差异。

## 本轮真实验证

- 完整 mobile-typography、official-battle-pile-layout、official-assets 三文件串行24/24；0 fail/cancel/skip，11.305秒。三个文件包含原 Lua mobile runtime 与普通/官方构建消费者。
- syntax、guidance、Backlog、network、diff 全部通过。9657项输入清单，9450项物化输入，前后完全一致。
- 独立源码、完整布局比对和结果/日志摘要复核通过，无P1/P2。原始红测、首轮聚焦测试与正式批次分开保留，不叠加计数。
- Linux x64 / Node24.22.1，不冒称Hosted或原生Windows。无Full、GUI、官方导入、ready或设备验收。

## 准入与接入边界

本片没有已证的新 source epoch 适配需求：当前88个owner不包含这三份JS，pile冻结proof仅绑定未改的三份Lua；历史deck视图使用原隔离输入，copy helper/oracle未改。此为有界源码查证，不宣称所有历史档案或全部CI已通过。新候选payload/layout身份须正常重新构建，旧候选/设备证据不能套用。

#621其余字号、永久牌组、历史命中几何/drag和来源修复不包含于此；#620/#623的共享source/CI/属性与素材合流仍由中央执行线协调。特别是 `official-assets-layout.mjs` 与 #623 交叠，应应用精确小增量，不整文件覆盖。正式当前HEAD独审准入、Full、原生队列与实际合后push均待。未改预算、时限、成本、库存、历史proof或任务AC。Backlog CLI缺失，`task:pick`返回原任务In Progress的HOLD，未手改任务或声称新认领。

[汇总](delivery-summary.json) · [独审](independent-review.json) · [完整原始证据](raw-evidence.tar.xz) · [逐文件摘要](raw-manifest.json)

证据包SHA256：`38c746a36870380a78de9ff9620d57683b0518fbe7aa4bf938d63c6e1ad1b960`。包中保留两份完整输入快照、原始日志、验证脚本、精确repair.patch、独立布局probe及结构差异。验证脚本中的原工作区路径是本轮取证路径，复跑时应指向新的独立工作树，不覆盖他人目录。

# 2026-11-08 紧急集成记录

Owner 本轮授权冻结新增功能，以唯一最终交付分支 `feat/emergency-integration-final`（PR #560）统一 develop。负责人 Furinya；Backlog TASK-88.1。原组合树在 #559 保留，因线性历史门禁失败后将同tree整理为develop单父提交，未强推、未更改历史门禁。当前记录随实际验证更新，未完成事项不作通过声明。

## 不可变起点和恢复

- develop 起点：`d8a57cae2a867200ca8e588abc0d368e6cdb3799`。
- 盘点：18 个开放 PR、26 个远程分支、30 个本地工作树。
- 本机完整引用备份：`.artifacts/emergency-integration-20261108/all-local-refs.bundle`；PR原始HEAD、工作树脏文件/独有提交和Ruleset原始JSON保存在同目录。
- 回滚须从上述起点建修复分支，使用正式 PR 恢复所需源码树；不得强推 develop。用 `git bundle verify <bundle>` / `git fetch <bundle> <ref>` 恢复实验。master不变，不发布、不创建归档Tag。
- 已向活跃协作线程和 #558/#556 发暂停通知；部分线程 API 返回已有 active writer，不能宣称已强制停止这些进程。远端HEAD在收口前再读回。

## 已纳入临时分支的来源

| 来源 | 冻结 SHA | 独有成果 / 依赖 / 去向 |
|---|---|---|
| #541 | cc4cce701d44b57b70cf9a6fc1c5d5e629629ddd | Power/Shop与CI执行政策；基于已合#539 |
| #542 | e750311b6aae38124e68f84b465f0bcf4c5be867 | 由#543承接，不重复运行时；旧失败保留 |
| #543 | 939e0820d46c4cecda571df779cfb4e9cd15aa13 | Session/Watcher/Inventory组合，祖先链承接 |
| #544 | eb47852bc6aa65718b858af72d9d86249fef47ce | LFS共享/自定义缓存识别 |
| #545 | 90c5a89a5765545f689abc6e03f27e1f3f7cccbf | 无色卡目录与能力准入 |
| #546 | 35d392bcf3049a214970127dbf587a4adae8fd9e | #543下游Act1事件职责 |
| #547 | 10bd71b00fb24c0bf0e9d7d0c5a14ad6e2207c5d | #546下游Defect规划 |
| #548 | ec93cd91fff1a643e43933ccd721466e42165410 | 由#552精确同树线性替代；不重复 |
| #549 | 3c8b0fbba73332354e1f030662fcf3169f03e8d6 | 回合末Power规划与执行 |
| #550 | 110425281a3d3baf3973c8abc7bf622052dfdd4c | 仅摘药水增量，#548底层用#552替代 |
| #551 | 962e5fe3e82e3844b0b60d3a7e79983d7d19c6b9 | Actor presence；另接8efe8b3e fixture修正 |
| #552 | a3507ef25308eb951585a4d54c225e04121a785a | 正式线性Run目录版本 |
| #555 | 1c83c4547cbdb40bd8062bce83a49aba14b4e407 | 奖励查询边界；保留动态方法槽 |
| #557 | 061702b20d17ecc4f7e9612f7262ad5040e73b9a | 2D技术研究与实施合同，非客户端验收 |
| #558 | 27bf37874fd67b6027f0039d4d588baf1cd81972 | 轻量2D、flat卡框、隐藏页面生命周期及历史合同修正 |
| 无PR | 34115e2b945a17cef3114bee3d519a71140b51f9 | 选测预检；导入TASK-81.2经CLI doctor消歧为81.3，原Fast任务仍81.2 |

主要冲突是架构边界、CC职责、CI库存、planning floors与历史源码epoch，必须保留并集。旧oracle和失败不刷新；组合源码另验。当前不能将各来源独审/CI自动视为组合通过。

## 保全与明确阻塞

| 来源 | SHA | 去向与理由 |
|---|---|---|
| #553 | 71ef036069d1f964f9e85c81ab8a8f424112efe4 | 保留3D实验源码分支与bundle；不进入默认2D |
| #556 | d80743f9d38fa451a753c21316733fc02879953e | 暂停3D正式迁移，保留源码/候选/实验；恢复见原暂停交接 |
| #554 | e7a5020a9acc543f842958fb863a12fe0fedd47e | 已知raw API回归，正文修正4db830e2对象本机不存在，暂不接错误运行时 |
| card-upgrade-runtime | 1786d84bfb7481634541b9fda61650881d9d4804 | 仅成本/来源延续，不能冒充缺失的raw修复；保留 |
| ui-production | 3073e556cd1b3337569f94ca9397e932d9d7993e | 本地bundle保全。私源目录NOTICE及派生manifest禁止公开分发，强依赖不可删；最新版v25未正式接入公开主线，n9被否决、n14未完整验收 |
| snapshot-flat | 27b889bc7f60f51cb7b1e2a14e2281388051d73b | 全图扁平快照仍属实验；bundle保全，不在紧急集成扩大高风险优化 |
| sapphire-budget | e4324d2a1e05bd7c7065949617e0143b2d163777 | 旧核心已被后续版本替代；独有第六片实验保全，是否接入按真实组合失败判断 |
| traveler-idle-lab | c89c32f226bde970c0ac431380512f2a8afff47a | 独立角色idle导入实验，保全源码和证据，不标记正式美术接入 |

## 构建模式和边界

统一入口复用现有候选构建器，`npm run build:game -- <base.gil> [output]` 默认 **2D / Enhanced**。`--art-version=legacy` 使用经典美术路径；两种模式使用相同Lua核心和data。Enhanced复用lightweight2d、现有artFeatures和nativePageLifecycle，不是最新私有v25 UI。Legacy是经典资源路径，v1.0.0全界面像素对齐尚未实测。

3D关闭：主线不接#556的模型/镜头/桥接；`--combat=3d`明确拒绝构建未验收路线。构建期分别打包，不在同GIL加载两套美术。Enhanced仍是非RC候选，不能据此发布。

## 本轮证据（持续更新）

- 核心：Power26、Act1事件22、Watcher队列与部分失败边界通过。
- 轻量2D/UI四文件40/40通过；构建模式3/3、选测预检23/23通过。
- 架构338模块/1930边通过；数据验证通过。
- LFS真实子进程验证超时/卡住，原日志和终止记录保留，不计通过。
- 完整CI、组合历史源码合同仍在收口，原#559历史门禁失败及#560初轮TASK-88.1优先级遗漏失败保留；后者已用CLI修正，未修改断言。原Full失败不能借定向绿灯改写。
- Enhanced完整GIL构建与351模块构建器读回通过：buildId `052805cb-5dc5-4f6d-ad90-48b1286dc675`，干净源码 `4d1e2f0324eaec76568c87bd9e949cf2a5e02a27`，12,163,708字节，SHA256 `4b5cff1a61907f0f6314c38f14f40d61407454121d6d061eb6ce1bab355c9f2e`。路径 `build/integration-enhanced/052805cb-5dc5-4f6d-ad90-48b1286dc675/candidate.gil`。后续线性提交和测试证明收口不改此候选生产Lua、数据、构建输入；独立整包审计另记。
- Owner再次明确本轮优先立即合并和清理、CI并行，不占用原神；本轮不再申请桌面测试。官方导入/ready/手机/官方容量保持UNVERIFIED，旧F证据不转移。

## Owner追加全部收口

Owner在#560后要求剩余来源也全部处理，本轮不再保留非主线远程待命分支。当前基线为 `a0c35db8d3c7242437f4dff0df373749b0d84985`；后续最终squash身份、远端删除与保护恢复读回同步到收口PR评论及本地最终收据。

- 五个公开实验完整保存在 [隔离恢复档案](../experiments/archive/emergency-20261108/README.md)：原base、HEAD、完整binary patch、逐文件Git blob及摘要齐全，222个变更路径实际恢复逐blob相等。Sapphire中已被后续组合改写的旧核心不覆盖当前源码；3D不启用。
- #554 delivery/runtime完整无损补丁、原失败、最小raw API修复实验及对象图保存在 [CardUpgrade恢复实验](../experiments/archive/emergency-20261108/card-upgrade-recovery/README.md)。原11组升级、29组WarriorStatus、3个Stasis及真实56字段/nil元表对照通过；UI来源前置失败保留。该职责实验归档关闭，不修改当前兼容生产API。
- 私有UI `3073e556`完整历史继续保存在已验证的本地 `integration-result.bundle` 和原独立工作树；不将私源公开归档。清理远端不删除这些本地源码、素材、候选或未提交任务。
- 组合源码授权只鲜读全部35个变动owner，原epoch的旧linked owner继续鲜读；完整当前339路径另作独立身份认证。不缓存授权、不改旧oracle。
- 修复GameUI退休与隔离默认reader，删除前重验字节、真实路径、目录身份、单链接及inode；硬链接负控在源码同卷真实执行。旧读取次数0/0/30/15/14保持。
- 修复所有根facade的LF和gzip二进制属性。102个helper暂存Git blob与固定闭包摘要逐项相等，不以仅Windows工作副本相等充数。
- 本轮UI/组合52项、Session4项、Combat原失败及新增负控、CI调度23项通过；五文件旧回放20项已通过，原5失败中的Combat2及Session3全部定点修复。独立审查另保留成功后漂移旧linked owner的拒绝证据。源码、数据和生产打包未改，两份已交付GIL继续对应同一构建输入。
- GitHub develop Full排队不计通过；删除已关闭#560对应的旧PR作业，仅保留当前基线必需验证。本轮仍不占用原神/桌面，不发布。

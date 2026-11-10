# TASK-60：托管检出 Git pack 门禁

## 交付范围

基于 develop `6a614fc82697750ddb408750e54f59f801c24f1e`。本轮修复 Quality/rules 的 GitHub-hosted Windows 检出路径：原自定义 Git 脚本仅对 self-hosted 执行，所以 hosted 路径没有运行原 32/128 MiB 摘要与异常门禁。原检查将 self-hosted 条件改为 false 仍返回空错误，复现保留于证据目录。

实现提交 `1e88a4c451bf39770e1eb5cbbb5d63bbb6f7c019`：
- hosted 检出前要求工作区没有 `.git`；保留真实 runner.environment 绑定。
- 原 pinned actions/checkout、精确 github.sha、depth 2、禁用持久凭证保持。仅该步骤使用 Git 进程环境 `fetch.unpackLimit=1`，使小对象 fetch 也保留 pack，不改全局配置。
- 检出后、安装依赖前运行同一个轻量 Node 脚本。重核 HEAD，累计正规 `.pack` 文件字节，输出并追加运行摘要；超过 32 MiB 警告，超过 128 MiB 非零失败。无 pack、非正规文件、非法 SHA、身份不符、缺摘要目标或写入失败均拒绝。
- 检查器核实 hosted/self-hosted 条件、环境绑定、执行命令与顺序，拒绝隐藏条件和 continue-on-error。
- 三处新增 workflow 块使用完整、唯一的精确逆投影进入原 Draft/Fast 历史合同。旧 SHA256 不变，部分/重复/无关漂移不得被删除。

self-hosted 完整步骤与基线逐字相同；未改其他 runner、依赖、超时、片数、worker、测试库存、成本表、来源档案或游戏代码。没有用户 GUI 或官方导入。本轮不解决 #607 合后历史回放失败，也未改动其历史启动+Curses候选。

## 验证与原始证据

[完整日志与独审](../evidence/m7-hosted-pack-guard-20261111/)。环境 Linux、Node 24.22.1，不冒称 Windows/托管执行。

- 新增及相邻轻量选集 5/5通过；明确使用名称选择，不是整个 ci-downloads 文件。
- 真实离线 Git 小仓库 fetch、实际 Node CLI、精确 HEAD、运行摘要及失败退出通过。阈值边界使用本地稀疏文件，不下载 128 MiB、不冒称网络载荷。
- ci-runtime、ci-summary-runners、ci-windows-shards、ci-posix-shards 四份完整文件最终 30/30通过，0 skipped。首次29/30的一项冻结workflow字节失败原件保留；增加精确逆投影后原期望hash保持不变。
- 全库 check:syntax、check:guidance、verify:backlog，以及最终 check:network、修改文件语法和 git diff --check通过。首次全库语法扫描后新增helper单独检查。
- 独立复核包含默认小fetch解包为0 pack与同源环境配置保留pack的实际对照、摘要写入失败及pack符号链接拒绝，以及完整 ci-summary-runners 7/7。独审仅证明本地代码范围，不是最终合并准入。

## 未完成与后续

此云环境缺少 pwsh；原 self-hosted PowerShell 完整回归未重跑，不使用旧Linux等价适配器冒充当前正文执行。没有重新跑 Full，也没有当前提交的 hosted、queue、squash或合后push成功证据。test:related 正确判定workflow属Full范围，不将计划当执行。

本轮只覆盖 Quality/rules 的初始 hosted checkout。其他job的checkout、随后为比较BASE_SHA执行的有界补取、LFS、协议/日志/依赖流量不在该pack读数中。临时hosted VM无跨轮对象复用；“新”字节仅因检出前空库得到保证。128 MiB是下载后的异常门禁，不能停止已发生的下载，也不是网络总量配额。超过阈值保持失败，不能自动重试或提高阈值。

TASK-60 AC2/4仍未勾选。发布分支/草稿PR不是运行通过，后续须独立复核最终组合、必要Full、原队列和真实合后检查后才可合并。若集中CI候选也改workflow，只合并本轮小差异，不能整文件覆盖。

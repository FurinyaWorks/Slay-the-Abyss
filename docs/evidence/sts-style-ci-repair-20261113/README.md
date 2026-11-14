# StS 呈现切片的 CI 来源纠偏

本轮接续 `f34723b6d54b6153de8a333a8abcc77884737f8f`，仅修改测试承接、精确选择器、证据存储和相应来源证明。相对该提交，产品 `src`、`data` 和布局代码没有变更。远端精确 SHA 的 Full 与设备验收仍另行报告。

## 归档与边界

| 文件（tests/helpers） | 最终 SHA-256 | 字节 |
| --- | --- | ---: |
| sts-style-ci-source.json.gz | 4dc022273fd7ca381b1de6bca1fdd1c9eb49ceb94df292d9e490b4ab2abc80f5 | 632971 |
| sts-style-source-epoch.json.gz（保持） | cc47fd96c79d7a604d2c5c269b012354d887762aecbe2990ac89fbf2ac74c1a9 | 195169 |
| sts-style-prior-runtime.json.gz（保持） | 10bf3b7d960e4c02ae2d64e26d8d5f16824439b9396949973f08ccec1c9d9330 | 4216851 |

CI 档原身份 `3ae1599f14216ab2211e5f67b56fa416cb0fe2e16d52c252365b04ae636ade72` 可从 f347 完整恢复。本次只推进当前 CI after；before 仍从 cb1eac63620b908d880b8a339ab834b1b533dfc1 的完整 Git 原文读取。三份旧测试的完整 before 摘要另有明确断言，不将历史 before 替换为新预期。历史源码和前驱 target 没有重写。

当前 CI 来源由45扩为57项，fresh helper仍为12项，完整 Full 清单仍为855→864。新增范围精确限定为三份旧测试、选择器脚本及其测试、LFS/许可执行脚本及其测试、`.gitattributes`、`config/ci-media-lfs.json`、`docs/legal/assets.json`，以及一个明确路径的运行字节等价工具。没有扫描整个 docs 或 config。

固定信任叶 `sts-style-ci-binding.mjs` 只读取 CI 档和验证固定摘要，LF SHA 为 `e88f8a68f1998a348cf872021ba0773e6bc4364d71bacf0ce77c4b630328b825`；它不进入自身归档，避免自哈希循环。实际 collector、loader、runner、entry 和投影策略继续完整纳入 fresh helpers。

现有 `closeout-source-closure.json` 的 SHA `031c42758ec5b37d1782c5fdb70542358d4b2631a5ee9b486b6bb5faccc988b5` 及其 copy helper 原字节保持；所有旧 source gzip 保持，只有本轮 CI gzip 变更。collector 的 `--check` 已逐字节再生成三个档核对。

## 具体合同承接

三份旧测试现分别验证共享选角 idle/旗形按钮、卡面前后层/费用可读性/禁用反馈、旧 Defect capability-policy 图。已退役的字形头像和旧独立卡壳预期有当前 rollback 负控替代，并保留完整 cb before。

Defect 只有两处原 policy/346 节点合同物化明确完整 cb 视图：先检查所有当前源库存及全文，再通过104 owner的 fresh gate，拒绝未知模块和任一漂移。旧345+idle/346数字没有更改。其余16项独立 VM、52场景、真实 live capability、回滚、协议和语义变异继续执行实际当前源码。

选择器仅将历史 StS helper 连到 `competition_roster_ui.lua`、`deck_browse_filters.lua` 两个既有精确入口；共享 test-lua 和未知 helper 的 Full 回退仍保留，未扩大到同目录其他 fixture。

LFS 增量为76个明确文档 gzip路径、58个不同对象、37,495,268字节。独立逐项读回工作树原字节与 manifest 一致。相对 f347，全部旧许可类别、条目和 hashRule 保持，只增加这76份含原 SHA/大小/源提交的存储登记；既有权利边界未升级。source gzip不纳入该存储扩展。

## 截图来源的字节等价

`docs/evidence/sts-neow-reference-20261113/verify-runtime-equivalence.mjs` 的 LF SHA 为 `5dc47827cbabb2691c9a678c1577e07b769aff77670953e9bb2ce325c79f29da`。它使用准备器同一库存合同（src/lua、scripts、data、config、tools及同一后缀集合），要求 before/after 完整658输入、after逐项匹配当前原始字节，且两个输入清单自身摘要正确。

仅允许四个明确的 CI/storage 输入变化：test-affected、ci-media-lfs、check-license 脚本和 ci-media-lfs 配置。25份生成物必须与磁盘常规文件库存精确相同，并逐文件比较所有原始字节；SDK 存档也比较全部原字节。模式固定为 neow（two/four）或 character（character），未知模式拒绝，不能从任意 receipt keys 推导允许集。旧截图与旧 source manifest 保持原身份；新等价记录不把不同 runtime 泛称等效。

机制验证为13/13：两个完整正控，空输入、空输出、陈旧输入、生成物漂移、SDK 漂移、未批准输入变化、额外磁盘输出、缺场景，以及 character 的错误/空场景、未知模式均拒绝。它们是合成收据负控，不能代替真实 SDK 字节正例或设备结果。

## 本轮验证记录

本轮完整五来源文件 **144/144通过**，0失败、0跳过、0取消，202311.1213ms、进程exit0。新来源五项包含在144项内，覆盖本次新增输入的完整before、fresh负控及helper认证。Node24、原断言和原时限均保持；没有将旧PASS沿用为本轮来源结果。完整日志见 `full-source-fixed-temp.log.gz`，逐档摘要和具体命令文件清单见 `summary.json`。

首轮默认Windows短路径TEMP发生EPERM mkdtemp，LFS模块在断言前退出；该批次中断并原样保留为 `default-temp-aborted.log.gz`，不计整套通过。将TEMP明确设为工作树外层可写目录后，精确Defect隔离子测试1/1通过（`defect-isolation-fixed-temp.log.gz`），随后重跑完整上述144项。未修改生产、source归档或旧helper闭包来解决环境问题。

相关整文件结果与来源轮次分开：三旧测试作者29/29、选择器作者108/108、LFS作者23/23；本切片对三旧测试及选择器做只读语义独审，存储由card_reference_audit独审。它们不并入144，也不把默认TEMP的中断批次写成综合PASS。hud_audit另独立执行新来源5/5、机制控制13/13及两个真实字节等价模式，详见其 `independent-ci-storage-review.md`。

原始材料在本机 `.artifacts/style-ci-repair-source-20261113/`：完整日志、三个旧测试 before、原/新归档摘要、57项before/after、五个实现文件的raw/LF摘要、许可对照，以及13个机制正反例的stdout/stderr。来源实现和新增验证器由本切片作者提供，独立复审由 hud_audit 负责；三旧测试及选择器源码由本切片作者只读独审，存储实现另由 card_reference_audit 独审。

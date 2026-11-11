# 源码扫描入口链接拒绝补漏

TASK-74.21 的有界遗漏修复，基线 develop `6a614fc82697750ddb408750e54f59f801c24f1e`。

## 问题与修复

原 `discoverSources` 拒绝 `src/lua` 内部的链接条目，但 `readdir` 不会报告用来抵达自身目录的链接。将 `src` 或 `src/lua` 替换成目录链接时，独立架构入口与共用工程采集都会跟随链接，违背已有链接源码拒绝合同。

扫描前按 `src`、`src/lua` 顺序使用 `lstat` 核对这两个仓库相对入口；任一为链接即沿用原错误拒绝。先查 `src`，避免检查下一级时已跟随上级链接。内部条目的原检查不变，不改变解析、度量、分类、依赖或游戏行为。

用户显式选择的仓库根目录及其祖先别名仍可使用；不能因此绕过仓库内部的源码入口检查。此处不是防止并发恶意目录替换的原子安全机制。

## 本轮证据

环境：Linux、Node v24.22.1。原始流和独审身份见[证据目录](../evidence/m7-source-root-boundary-20261111/)。

- 新增3条回归在原实现上真实失败，原9条成功；修复后该完整文件12/12，0跳过。
- `engineering-shared-inputs`、`engineering-quality`、`engineering-quality-policy`、`architecture` 四份完整文件37/37，0失败/0跳过。
- `architecture-boundaries` 完整文件2/2通过，未把它和重复独审计为单一独特总数。
- 本轮真实全库报告为345模块、1953引用、0错误；修复前后JSON逐字一致，SHA256均为 `0ee1b397d7c0fca64bd46d2844873c658ec4716cb81e7d3ea66a58365c5e7a43`。
- 独立审查 `source-root-boundary-20261111-r1` PASS、无未解决项；另检验相对有效/悬空源码入口链接、两级仓库别名及其内部链接拒绝。完整范围及源码摘要见 `review.json`。
- `node scripts/check-engineering.mjs` 本轮完整静态三入口通过：5918/5918测量、无新增诊断、原14条历史告警；不是包含变异与原生UI合同的整个 `check:engineering` npm链。
- `check:syntax`、`verify:backlog`、`check:network` 与差分检查通过。首次 `check:guidance` 因本地稀疏检出未物化 `.cursor` 失败；补取原跟踪目录后重跑通过，两轮原始流保留，未改指引。
- 20轮交错采集均读取相同345份新鲜源码。发现阶段本机中位耗时旧5.793ms、新6.880ms（20样本的中间两项平均）；仅是毫秒级本机观测，不推断跨平台Full耗时。

未新增依赖、扫描器、CI作业或测试文件；保留全部原断言、超时、预算及历史oracle。专项文件内的新增用例由现有完整回归执行。

## 验收边界

不运行重复本地Full或手动重跑远端Full。本轮未实测Windows；既有与新增夹具均使用Node支持的directory junction形式，真实Windows行为由必要CI验证。HEAD正式Full、正常合并准入及合后push仍待验，TASK-74.21保持In Progress且AC3不勾选。

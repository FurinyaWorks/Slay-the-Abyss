# 来源证明纯计算去重

本片接续公开 #571 `8660380c`，辅助真实 CI 瓶颈，不替代 M7 架构重构。实现已先保全为 `4cd0697a`，保持 Draft 待原准入，不重复 Full。

## 改动与边界

`source-epoch-runtime.mjs` 只对完整字符串的 LF SHA-256 计算和架构 JSON/token 布局判定做有界复用。布局判定按独立、已克隆冻结的 proof 隔离，语法门、重复键、顺序、转义和字符串内容保持。每个缓存最多 256 项、2,097,152 个 UTF-16 码元；超限字符串不保留。这不是整个进程内存 2 MiB 的承诺。

所有目标检查、reader 类型检查、每次完整 owner 读取与原顺序校验继续执行；不缓存 owner 授权或投影结果。当前辅助闭包仅更新该 helper 的精确摘要，旧 epoch、源档、元数据与 oracle 不改。原三个慢测测试体逐字不动，只在既有 epoch 测试内增加两项缓存命中、鲜读和淘汰负控。生产、工作流、分片、worker、权重、预算均未改变。

## 观测与验证

#564 Full [42495834681](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42495834681) 的 POSIX9 core/max-HP 为 667.964/357.996 秒，Windows11 architecture-format 为 787.443 秒。这是前置头、不同机器的历史观测，不拿本机结果冒充托管收益。

本机 Linux x64、Node v24.22.1：

- 原 core 两项断言通过，447.719 秒；同样测试体优化后 47.035 秒，约缩短 89.5%。原轮开启 CPU 采样，存在测量开销，不作为严格同配置基准。
- 三个原文件 7/7 通过。max-HP 三项合计 61.419 秒；architecture-format 两项仍合计 464.486 秒，明确保留为慢点。三文件并行整轮 470.383 秒。
- memo/各 epoch 共 77 个唯一测试最终通过，包括原 45/46/48-owner 合同、暖缓存后的漂移/缺失/类型/异常和 LF/CRLF。初轮闭包摘要未同步、另轮缺少固定 Luacheck 的真实失败及补验均保留。
- 独立审查 9/9 专项及 8,208 组基线差分通过，比较返回值、错误文字和 owner 读取顺序。差分覆盖多目标、可变调用者 proof、重复键、转义、非法 JSON、暖缓存、缺失/异常和 CRLF。
- guidance、JavaScript syntax、Backlog 范围、diff 检查通过。Backlog doctor 仍报告既有五组重复 ID 及历史归档布局问题，未运行修复，不算全绿。

原 core CPU 采样主要落在重复 token/JSON 判定。architecture-format 剩余单个变更 layer 负例仍需 16.381 秒，采样指向冻结原 GameUI/CoreLifecycle/RelicQuery 私有 identity/token 计算。继续修改需要扩大历史 oracle 审核范围，本片不为凑齐降幅重写它们。

## 证据与未完成项

[证据索引](../evidence/ci-source-calculation-20261109/index.json) 包含测试日志、失败补验、统计、CPU 摘要、独审及可重放差分脚本。原始 CPU profile 约 237 MiB，不增加仓库体积；摘要记录其 SHA-256。

只完成本地定向验证和独审。当前候选 Hosted Full、Windows、管理员原生准入、实际合并及合后复验均未完成；旧 #564 Full 不覆盖本片。TASK-75 保持 Furinya / In Progress，既有 AC 状态不变。

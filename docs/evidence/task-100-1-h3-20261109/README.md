# H3 菜单代理归因

相同 eager 候选的三份独立 SDK 实例先暖机30次更新，再采样120次菜单更新。旧 bridge 只补当前 Host 所需的空 `step`；另一负控在当前 bridge 中只关闭方法包装器命中。三者可见模型摘要相同，当前方法分配从1752降为0。`nativeAt/GetChildren` 在本窗口均为0，历史菜单退步原因仍未证明。

`raw-counters.json.gz` 保存实际计数和两端快照；上一层 JSON 给出输入摘要、归因和边界。这里不包含 SDK、GIL、模板、素材或截图。计数观察器会改变运行成本，不能据此报告墙钟提速或设备 FPS。

显式复跑（在包含冻结 `ae71692631e5a84c9716ea291dd1b32aa87281e0` Git 对象的仓库根目录）：

```text
node docs/evidence/task-100-1-h3-20261109/replay.mjs <adapter-receipt.json> <candidate.gil> <actual-gil.save.json[.gz]> <sdk-export.mjs> <new-private-output-directory>
```

调用方提供同摘要私有输入和已记录 SDK 导出及其依赖；入口重新校验 GIL、投影和原始 Lua 精确标记，再向独立复制的 save 注入诊断计数。它不写原存档或生产源码。输出包括原始计数、插桩 bridge 和可见模型，必须放在私有目录。SDK 进程关闭不作为官方资源销毁验收。

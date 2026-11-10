# PR #579 Host 事件传输定向修复

基线 `0f382e9e8464eb474c61ac042656ca2c2cd3463e`；仅测试夹具/观察器/传输，不改 gameplay、场景、断言、窗口或 30,000ms 子进程预算。Linux Node v24.22.1；Windows Node v24.18.0 尚未复测，不能宣称 Windows 已修复或 Full 通过。

## 原始故障与范围

原 Windows rules 18/18 job 129644323656 原件压缩保留；解压 SHA256 `a6d6b0ac74b34588e5f1b4f215611eecad5ff7dfcc50e3658c39fecf23c901ed`。new seed6 boundaries28–30 在 30,072ms 超时；已记录 done30，stdout 已收到 3,228,249 编码字节。done 表示命令执行结束，不保证该 checkpoint 图序列化或进程退出完成，不能由此断言具体 Windows CPU 热点。

Linux 同一失败样本复现：old 27,863ms 完成，new 30,086ms ETIMEDOUT；保留 baseline.log 与 VM 原始收据。没有重试掩盖首次失败。

已确认的冗余工作：每个事件 JSON 从观察器 JS 字符串编码为 Lua 字节串，Lua 收集并拼接，再由 print 解码为 JS。新 EVENT_WRITE 在相同时间调用相同 fresh observer，将完整事件 JSON 留在 JS；checkpoint 原位置按原顺序拼接、写出并清空。完整图、对象身份、nil 参数数量和所有字段仍保留。gzip、输出上限及父进程校验不变。

## 本轮验证

- `npm run build:data` / `npm run build:ui`：通过。
- `node --test --test-name-pattern='whole Host result seed 6 boundaries 28-30' tests/game-ui-host-result.test.mjs`：修复后一次通过；old/new 含解码总计 23,493/25,385ms，详见 native-events.log。首次基线 old 含解码 28,176ms。
- 授权的一次原 harness old 侧字节复核：23,237ms。因此运行噪声明显，不能把单次 old/new 时差当成稳定加速比。此改动消除真实冗余传输，但 Windows 余量仍须 CI 确认。
- original-byte-oracle.log：原 harness old、新 harness old、新 harness new **完整解压字符串严格相等**，每份 44,529,985 字节，SHA256 `07bd0eaa83ee9bc5ea6facca489b5c89d2ab8c24b9603cf4d860ce0dd72c668e`；3 HOST_TRACE、3 HOST_EVENTS，完整 PASS 与 executed=30 换行结尾。三份原始解压文件留在本地 worktree `.artifacts/host-timeout/original-old.log` 与 `build/ui-host-impl/{old,new}-main-6-28-30.log`。
- 正向精确廉价过滤：`node --test --test-name-pattern='native graph|native event|fresh graph|graph strings|reference-push|result anchor|original result' tests/game-ui-host-result.test.mjs`，7/7，通过。保留固定原观察器摘要，新增 native event 对旧路径字节对照、空/尾 nil/false、循环共享身份、Unicode/NUL/换行、UTF-8 缓冲变更拒绝；实际 collector 原窗口与相邻窗口差异负控保留，新增两种 sink 完整输出对照。
- 首次廉价过滤误用了 `^(?!whole Host)`，Node runner 仍启动额外 Host 样本；观察到额外 old 输出后主动 Ctrl-C，退出130；最终落盘显示该额外 seed1/25–27 的 old/new 均已完成（含解码 23,591/22,602ms）。helpers.log 和对应收据保留；该轮未完成，不作为通过证据。此后仅用上述正向名字过滤，未启动 Full。
- `git diff --check`：通过。Backlog CLI 不可用，任务文件未手改。

原有 128MiB decoded / 32MiB encoded 限制、gzip 单帧与逐字节比较保持原样；本轮未修改分块/压缩算法，不新增独立测试文件。

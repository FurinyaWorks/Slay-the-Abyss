# PR #599 永久治疗来源与成本接线

源码基线 `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04`；既有治疗切片 `074258935b5cf6acef99089d7ded90d855facb22`。本增量不修改三份生产 Lua 或架构配置，不改变治疗、平衡或原生 UI。

## 修复内容

- 新增严格外层 RunHealing epoch，绑定配置、Run、Uncommon、RunHealth 四份真实来源；公有入口覆盖 340 个完整路径、54 个变化 owner，每次重新读取和校验。
- 保留原 Formation 公有入口为独立前代；新模块在每个历史目标中显式为 null，不删除源码证人或伪造原先存在的模块。
- 历史 Seven/Silent/Defect/Formation 断言保留，先经过认证的当前→历史读取；原 gzip、旧哈希和历史源不改写。
- 追加 helper closure 与 Windows LF 文本约束；文本身份支持 CRLF，gzip 仍使用原字节。
- 旧 800 JS / 1,410 Lua 库存和断言保留。当前 802 JS / 1,412 Lua 单独验证；新增/变化的十个完整文件以实际进程观测登记成本，保留初次失败、较慢成功与不稳定输入记录。

## 验证范围

初次五份来源/集成完整文件 77/77、Seven 9/9 通过。独立源码复核覆盖 16 个历史入口、308 个正负探针，旧原始来源与发布 Git 对照一致。原 Hosted 失败的四份完整来源消费者另外 41/41 通过，655,512 ms，无失败/跳过/取消；最后再次核对 5,920 个已捕获输入无变化。源码架构检查为 339 模块、1,930 引用；本增量不声称再次减少依赖环。

完整成本与最终输入验证分阶段保存：`ci-complete-process-observations.json` 是成本选择记录，初始与后续完整文件观测不冒充最终相同输入；封包后的 aggregate 收据才用于最终四份 CI 文件验证。保留原未知成本、Windows 17 / POSIX 15、worker、并发、timeout、预算和 60 秒预留。

当前规划为 Windows 1,799,873 / 1,800,000 ms，只有 127 ms 余量；POSIX 1,134,458 / 1,200,000 ms。这是原预算下的排程预测，不是 Hosted Full 成功或实际运行时保证。不得降低已知成本或放宽门槛来宣称完成。

## 原始失败与交付边界

`original-ci-failure.json` 保存原 Quick run 42786493383/job 129728901791；`original-full-failures.json` 保存同 HEAD 两份已失败的 Full 日志。原红灯没有被重写。无手动 rerun/dispatch，无重复本地 Full。

Backlog CLI 在当前环境不可用，未手改任务/里程碑或冒称重新认领；`check:guidance`、`verify:backlog` 通过。新增工作树继承 sparse 配置，首次本地缺工作流文件的失败保留，补齐的是 HEAD 原字节，不是修改门禁。

保持 Draft。源码、成本与本地定向检查不等于当前公开 HEAD 的必要 CI、精确独立准入、原 Merge Queue 或合后验收通过。没有操作用户鼠标键盘、官方导入、真实 ready、手机或发布。

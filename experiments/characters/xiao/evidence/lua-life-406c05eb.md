# 魈生命成本卡共享作者验收

精确 shared `406c05eb576cf4bb69a6fb47d87c82d6cb9a270a`，父 `08d5ee04`，整合已独审角色切片 `6b99fae8`。作者独立 workspace archive、src/build-only 执行，不改 owner 工作树。

获得唯一测试窗口后，`NODE_OPTIONS=--max-old-space-size=256` 串行：
- `xiao-life-paid.test.mjs` 1/1 PASS，17.52s。x10/x17 基升源顺序断言、固定奖励 Run UID/升级继承、HP门槛、真实支付/耗尽、24自动执行/拒绝，4个基升收益后故障完整 Run 恢复并重试。
- `xiao-starter-launcher.test.mjs` 1/1 PASS，7.04s。默认八张定义及封闭 starter 未回退。

HP>2/3 前验不会因 Intangible 放宽，但获得准入后原生血费实际降至1。继续保留适配/平衡 HOLD，不宣称JS固定血费一致。获得实例移到手是公开契约测试夹具，非自然抽到概率。此批不表示75张全部共享/自然池、人审、UI、全量CI或手机验收。

执行结束已通知 owner 释放唯一测试窗口。独审另补自动坏入口HP不变探针属于 reviewer 独立证据，不冒称本作者suite已包含该额外断言。

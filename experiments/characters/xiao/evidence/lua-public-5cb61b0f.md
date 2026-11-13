# 作者独立公开验收

对象：共享集成精确提交 `5cb61b0fd7ab38e23246338fc2f2cf7a568f73c2`，git archive到独立临时目录，执行该快照scripts/build-lua-data.mjs。仅src/lua和build/lua优先，不加载角色实验目录模块。

1. 该快照 `experiments/characters/lifecycle/xiao-paid-usecard.test.lua` 实际执行输出：
```
PASS PUBLIC Xiao x01/x04 payment life UID target discard and relic-once
PASS PUBLIC Xiao host command restores paid card HP mask and references after adapter failure
XIAO_PAID_TRANSACTION_PASS
```
2. 此前角色分支备份 `lua/public_play_test.lua` 仅将包路径改为src-only，不改变任何断言，独立执行输出：
```
PASS PUBLIC Xiao x01/x04 payment life UID target discard and relic-once
PASS PUBLIC Xiao host command restores paid card HP mask and references after adapter failure
```

已核：真实C.new opt-in、C.play基升付款/UID/目标/生命拒绝、真实弃置、入场遗物一次、实际dispatch故意异常后公共命令完整恢复。没有共享运行时猴补或构造paid夹具来替代公开命令；仅测试故障注入临时包裹实际dispatch后抛错，执行后恢复函数。

这是作者独立重放，不能代替独立评审人的批准。仅x01/x04，其他牌的effect证据不因此升级为公共付款证明。owner-end、turn-start、正式角色选择/奖励、全75及人审/平衡未放行。未重跑全量CI。所有当时“公开规格未执行”的历史段落由本次精确共享快照限定结果取代，不追溯声称旧基线已接线。

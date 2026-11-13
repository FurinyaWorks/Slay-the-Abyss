# 四角色 Lua 生命周期接续

基线：`develop 903bf2a31e91f10fb24763ab4cea23d586d0bb83`。只做隔离候选证明，不注册正式职业，不修改共享 Combat，不宣称 75 卡或官方设备验收完成。

## 刻晴 owner-end seam

`keqing-owner-end.lua` 把纯 reducer 包成现有 `abyss_end_turn_powers.prepare` 的 extension，保留 Act3 membership/planner，不替换原 Constricted。extension 是调用栈对象；保存的动作只有 op/turn，状态不保存函数。资源只在实际 action 被执行时提交，未到此阶段的暂停和终局不能提前清资源；重复或跨回合动作拒绝。

冻结 reducer 原件来自刻晴 `c13beefe88ff687ffadf9dee377d443755437ad1` 的 `experiments/characters/keqing/resource-lifecycle.lua`。本目录 fixture 完整复制用于可复现实验，SHA-256 `bfe8e578a88f75b15211716bfa0555296cb7166f7678b8524c87a2dac8f80632`，不是第二份正式实现。

定向测试：

```sh
node --test experiments/characters/lifecycle/keqing-owner-end.test.mjs
```

验证真实 Power planner、ActionQueue、Snapshot、Combat/Actor 组合：
- 计划不消耗，action 到点提交；Act3 Constricted 原 source 身份及真实扣血保留。
- pause/repeated run/abort/resume，资源和 pending choice 原引用还原；继续后只执行一次。
- action 后的注入失败恢复资源、turn marker、能量和队列，允许恢复后重试。
- 死亡、末敌死亡时不运行资源动作；过期 turn 和重复动作拒绝。
- 普通旧角色不带 marker，未注入任何资源；现有 Combat.endTurn 可正常执行。

**验证边界**：fixture 自己装配队列 handlers 与命令 snapshot。没有修改 `ordinaryOwnerEnd` 的固定 Act3 参数，也没有声称覆盖真实 UI 取消或生产 continuation 路由。正式集成还必须连通该参数、动作分发、事务准入、保存读回，并在真实公开命令上验证暂停恢复；不能把此 seam PASS 当完整生产接入。旧角色检查是基线烟测，不是源码变化的差分回归。

## 已协调的阶段合同

| 角色 | 作者冻结点/边界 | 必要约束 |
| --- | --- | --- |
| 甘雨 | 远端 `f6775209e4e4f67adc08993c456d78731fc643d4`，分阶段 planner 待独审 | `bankBeforeDiscard` 只存蓄并清余能；`stormAfterDiscard` 才减 tick、伤害。中间可能弃牌/虚无/抽牌暂停或死亡，不能提前耗冰雨。全命令回滚覆盖两阶段。 |
| 刻晴 | 远端 `6a6f4f2188f89bc569621c2ad9531134a87b1fda` 含上述 reducer | `resolved` 只在成功付费且整张卡真正完成时 exactly-once。`Combat.play` 返回 true 也可能暂停，不能作为完成事件。owner-end 才清附魔/过期雷楔。 |
| 钟离 | 作者 local `1aaa14d32ae808f5d9adea7bf2f801143ddffd7f` lifecycle 待审 | 柱伤→双方仍存活→修补，是显式顺序，不由两个 Power 获取顺序决定。付费安装及队列接口尚在制作；jade 与 Buffer/Torii/Tungsten 的相对伤害时序未定，不能擅接。 |
| 魈 | 作者正制作独立 Lua planner | 面具实际 owner-end 扣 HP→存活才 guard→减时长→自然到期储能；自然到期不得触发主动退出钩子。需真实 loseHp 规则与 Schedule 移除，不以直接改 HP 冒充引擎完成。 |

共享层由统一集成 owner 独占，各作者仅修改角色模块。付款前拒绝不得变更资源，暂停不可重复付款/资源扣除，异常须还原同一图的原引用。正式职业注册、正式候选和设备/用户集中实测仍遵循原门禁。

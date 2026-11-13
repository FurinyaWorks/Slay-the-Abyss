# 甘雨 20/60/23 原生付费蓄力链

源文件逐字承接 `charge-draw-definitions.lua`（62ec1676）、`charge-burst-definitions.lua`（d4a074f7），不改费用、数值、稀有度、升级或 HOLD。20：2费先抽2/3后蓄力1；60：1费先蓄力1/2后抽1并耗尽；23：0费蓄力2，升级随后格挡3，并耗尽。

实际 C.play / Run.play 入口严格校验完整源字段，普通抽牌与格挡进入原生队列，单个蓄力 stage 沿用 UID/turn/playId 一次性鉴权、活资源计算及完整事务回滚。保留原生费用变更和耗尽行为。

新增显式 `abyss_ganyu_charge_chain_reward_run.new`：52定义/50非basic奖励，仅新 marker 启用。basic2/common10/uncommon38/rare2；旧49及全部正式池保持不变。

作者验证：90个base/up × charge0..2 × normal/full/empty/noDraw/shuffle真实付款案例通过；新奖励23次真实生成领取与跨战付款覆盖20/60/23，旧49回归通过。击杀、手牌位置仍为受控夹具，不冒充实机。新增源字面值与暂停/恢复回滚复测记录随提交结果。独立复审待记录。

不代表完整75卡、正式注册、全量CI、官方导入、平衡及设备验收。用户统一实测仍待后续完整交付。

作者最终 paid 定向含源字面值及真实 Scry 暂停/恢复故障回滚 1/1 PASS（13.85s）；新旧奖励域 2/2 PASS（81.94s）。

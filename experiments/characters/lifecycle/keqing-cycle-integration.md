# 刻晴公开意图与有限削甲 paid 切片

## 来源与边界

- 基线 `275f03d493f3327d651ef6a4f12e3a6bd4450072`。
- 权威 `character-keqing-batch23`，源提交 `89d898c`；`mechanics.mjs` SHA256 `489cf1d13748337fac61b28d31edf514a19fe782e03f6681ba7d6b7358453bac`。
- 6 面文本由该文件 `describe(id, upgraded)` 输出逐字核对，不自拟机制。
- KQ041：1 费攻击，4/7 伤害，出牌前公开伤害意图正值则 5 格挡。
- KQ058：1 费攻击，5/8 伤害，出牌前公开伤害意图为零则同目标再 4 伤害。
- KQ061：1 费攻击，先移除目标至多 5 格挡，再伤害 6/9。
- 三张均非消耗，pending rarity 保持 special/HOLD。新隔离 29 张等权研究奖励，旧 26 域不扩大，正式各色 75 池、正式门禁不变。
- Backlog CLI 不可用（`command not found`），未伪造认领或状态更新。

## 真实结算

paid.prepare 在宿主出牌结算入口捕获已选定公开意图，使用核心 `Actor.intentAttackAmount` 正零值，不读 AI 后续意图、不引用 UI 模块。支持选定 effects 中原生 `damage/damageAll/enemyVampireDamage` 及普通 block；无伤害的 gainStatus/applyStatus 映射零伤害。若 gainStatus/applyStatus 位于后续伤害之前，会改变顺序预演，当前明确拒绝整牌；未知 effect、unknown 意图、Runic Dome 隐藏均拒绝。**不是所有公开意图形态完整支持**，特殊/顺序预演扩展仍未验收。

KQ041/058 条件在所有本牌 stage 前捕获，中途改变目标意图不改变条件。每段伤害使用宿主捕获 modifier，附魔每伤害段 +2，但每攻击牌仅由现有收尾扣一次。native TOP/BOTTOM 反应排序不改；目标死亡不改目标。KQ061 削甲为有限非伤害变更，不触发伤害反应、不加附魔，后续实际伤害照常触发。

每个 stage 保存完整拷贝并绑定 uid/turn/playId/step/targetId，篡改与重复拒绝；真 paid/Run 事务负责回滚。终局依宿主清队列与完成策略，不重新插入动作绕过门禁。

## 本轮证据

1. 首轮 session91520：17.55 秒失败在 hidden 测试向 nil relics 追加；修正为显式 `relics={'runic_dome'}`，非产品放宽。
2. session74368：paid 36 个 base/up×infusion×intent modifier 组合、36 源漂移、24 阶段篡改/重放/后置异常回滚通过；6 个整 Run/permanent UID/对象引用回滚重试通过。随后奖励失败于缺少新域 `abyss_card_pool` 路由，33.12 秒退出，已补严格 29 域路由，不扩大旧域。
3. session75353：仅补跑变化路径与奖励：10 个前置 status 拒绝/后置 status/零伤害/负力量意图边界通过；旧26域有限抽样数量/不含新 ID/输入图不变通过。新29域 finite/source drift/zero/prismatic/afterSampling 全 Run 回滚通过。
4. 固定预定 seeds42..120，上限79局；全部新 ID sampled/claim/next Run.play 后提前结束，实际 **6 局、15 个不同 offer ID**，非全池覆盖。控制了999伤害胜利、将领取牌放手牌、energy10，非自然通关或平衡验收。
5. 源 describe 文本核对 `true`，`git diff --check` 通过。

未运行全量、CI、官方导入、GUI、移动端或真实试玩。待独立复审，不将本批与已有 HOLD 的整角色完整验收混淆。

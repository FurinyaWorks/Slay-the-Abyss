# 甘雨正式 Lua 队列接入第一切片（未注册）

基线：远端 develop 903bf2a31e91f10fb24763ab4cea23d586d0bb83，本轮重新ls-remote/fetch核验。候选源为甘雨分支本地49b4ddf/远端5f13156a中的75卡cards.json（0.26）；这里只读拷贝并在生成物记录SHA256，不调候选值、不声称来源/平衡已审批。

本切片不是另造战斗引擎：把01、02、22、24的基升结构映射为真实Lua卡定义ABI（amount→value、enemy→ENEMY、upgrade、exhaust），在测试私有data副本注入，经正式Combat.new/Combat.play、真实UID、原动作队列/支付/扣甲/抽牌/消耗结算。没有改data/cards.json、角色注册、源卡池、V4或共享dispatch。定义前缀ganyu_lab防碰撞，productionEnabled=false。attack/skill分类是此适配提案，不代表角色生产审批。

## 实测与差异

- 编译器2测试通过：4卡独立字面值、71卡明确未映射；未知资源、保留、非法目标/数值/额外effect字段拒绝。
- 正式Lua执行14组基升场景通过：支付、护甲、盾、抽牌、消耗、无效目标、能量不足、原注册未污染。
- 已复现真实差异：22击杀最后敌人后正式队列清掉draw尾，研究JS模型会继续抽牌。本适配遵循正式引擎，不静默修改它，不宣称与旧模型全局等价。
- 此处敌HP100/指定手牌只是队列集成夹具；非自然构筑、完整角色试玩或设备验收。

## 下一步产品阻塞

71卡仍未接入，包括尚未验证的普通组合；蓄力上限/消耗、满蓄/单蓄分支、冰雨跨回合字段/延长/提前释放、首回合遗物hook、检索与保留均须正式状态/队列生命周期协议。不得把字段塞入UI或用研究引擎替代正式动作队列。44设计支配及源头/命名/人审仍HOLD。完整角色注册需上述协议、单卡对照与独立审查后另行进行。

## 复现

先安装项目锁定依赖并执行 `node scripts/build-lua-data.mjs`；然后：

```
node experiments/characters/ganyu-lua/compile.mjs
node --test experiments/characters/ganyu-lua/compile.test.mjs
node node_modules/fengari-node-cli/src/lua-cli.js -e "dofile('experiments/characters/ganyu-lua/verify.lua')"
```

本环境复用已有锁定依赖目录；Backlog CLI不存在，未伪造任务认领。未启动全量测试，独审/CI/正式导入/真人验收未完成。本目录为未注册集成切片，不是可选正式角色。

## 隔离角色资源/生命周期提案

resources.lua 是无共享注册的纯数据计划器，尚未接入正式回合生命周期。实现蓄力0–2、主动产蓄、满蓄两段箭、单雨场取max刷新、回合末剩余能量入蓄（遗物真实合同不是战斗开始赠蓄）、消耗tick与重复owner-end拒绝。输出仅标准damage/damageAll动作及待提交资源，不直接改Actor，也不自建伤害引擎。resources-test.lua 实际调用正式Effects.apply验证主目标死亡仍对第二敌人绽放、雨伤击杀结果；资源输入不变和异常断言通过。

挂接约束：正式Combat.endTurn事务须在弃牌前提交bank，弃牌后/敌行动前排tick；资源与能量必须同一事务回滚。lastOwnerEnd需随战斗重建，不是跨战永久资源。当前仅计划器加真实伤害执行测试，不证明上述自动挂钩已完成。共享待协调点为abyss_flow_actions、abyss_end_turn_powers和正式资源可见视图；本分支均未改。类型、伤害修正与遗物来源适配仍需批准及审查。

## 第二切片（待独审）

扩至8个未注册定义：新增04、08、21、55，复用正式damageAll、block/draw、零费exhaust。3编译测试与22组原Combat.play基升检查通过；其余67未映射。卡文/升级文从同结构输出，ALL_ENEMY采用正式定义ABI，不能当设计批准。数值生成限制为Lua平台32位非负整数。04 attack类型与其他类型仍属接入提案；正式力量/虚弱/敏捷等修正将由原引擎承担，不强求与未建这些状态的研究模型等价。资源阶段另加未完成bank禁止新bank，防跳前轮冰雨；集成owner需取最新快照。

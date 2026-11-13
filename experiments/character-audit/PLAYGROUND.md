# 四角色统一隔离试玩入口

这是已有 `character-audit` 的终端扩展，复用其文件身份快照函数，以及各角色现有 battle 层。没有第二套伤害、抽洗、遗物或回合引擎，也不改 owner 分支或正式数据。

**来源、命名、平衡均 HOLD；不是正式游戏接入。** 只做独立单战：无奖励取得、商店、营地、持久升级、连续战、动画、浏览器或原生设备验收。其他角色目录已有更完整的奖励研究，本入口不会以简化单战替代它们。

## 运行

Node >=22。先在单独的干净 worktree 固定模型版本；不要让入口读取作者正在编辑的活动目录。若使用稀疏检出，需要在该独立副本加入 `experiments/characters`。调用工具与模型可以来自不同工作树。

```sh
node experiments/character-audit/play.mjs /path/to/pinned-ganyu ganyu EXACT_40_CHAR_HEAD 37 starter
node experiments/character-audit/play.mjs /path/to/pinned-xiao xiao EXACT_40_CHAR_HEAD 37 all
```

在本轮云 workspace，源码位于 `play-utility-review/`，固定副本为 `play-pin-ganyu`、`play-pin-xiao`、`play-pin-keqing`、`play-pin-zhongli`。例如从 workspace 根：

```sh
node play-utility-review/play.mjs play-pin-ganyu ganyu c3b152dae42af9c8ddfd1e24d7e2d6026572bf37 37 starter
```

`starter`沿用该模型的默认初始牌组。`all`为每种已实现候选各一张的人工测试牌组，经过原模型正常抽洗；不是自然取得或批准卡组。只执行基础版，图鉴同时显示基础和升级规则，不提供假营地升级。

命令：

|命令|行为|
|---|---|
|`show`|显示当前手牌、牌区数量、生命/能量/资源、敌人当前意图、遗物状态|
|`catalog`|查看该固定模型的全部已实现候选及基础/升级卡文，保留HOLD|
|`p REV SLOT [TARGET]`|按显示的revision出第SLOT张手牌；编号从1开始|
|`e REV`|完整结算敌方行动、状态和下一回合抽牌|
|`c REV`|取消尚未提交的输入，战斗状态不变；不是撤销之前的行动|
|`r REV`|用相同种子和牌组模式重置本场；不代表战后恢复|
|`q`|退出；EOF同样正常结束，不算胜利|

每次成功出牌、结束、取消或重置都会增加REV。重复发送旧REV会被拒绝，避免旧手牌号误打下一张牌。非法操作与模型异常不改变会话状态。

目标编号保留原敌人数组位置，死亡敌人也不重新编号。省略目标时，魈/刻晴使用第1敌人，若该敌死亡会拒绝；甘雨单体牌需要明确目标；钟离只有单敌。显示到什么手牌就能操作什么牌，不公开未来牌序或随机状态。

## 已核固定版本

|角色|已测试本地HEAD|该快照实际实现卡数|远端对应身份|
|---|---|---:|---|
|甘雨|c3b152dae42af9c8ddfd1e24d7e2d6026572bf37|31|699939561abb1cdf81523d6faaaddb2979afae0d，运行依赖blob全部一致|
|魈|1e4d02a092f06dbca33f697ffbfdb61925a838bd|32|638b233d7e281ce8d93498073d0c1feb107044df，含intent.mjs的运行依赖blob全部一致|
|刻晴|d2b078e33260549ffe3da17adb71e46f730fd0d0|24|本轮查到的8cab47dc远端mechanics blob不同，不冒称是本测试版本；准确版本的远端备份由owner继续处理|
|钟离|60c54bdea796b6770f129b02f4c6fa76e2367172|14|bcd763bae34a9122140f9d990849839a0a743eb3，运行依赖blob全部一致|

本地与远端提交历史被分别保存，SHA不能互换。命令传入实际检出HEAD；运行依赖相同是文件级核验，不冒充已在另一提交重跑。未来版本须重新做适配与定向回归，不能继承此表批准。

## 适配合同与限制

- 甘雨复用现有play.mjs的两只合成敌人和固定意图。其数组意图表示本回合多段，保持原义。endTurn后只在between时调用nextBattleTurn，两步全部成功才提交。
- 魈调用newBattle/battlePlay/advance及intent。数组是跨回合序列，只展示本回合经过suppression后的意图；不展示后续序列。独立campaign已有三战奖励，本入口未接它。
- 钟离调用battleStart/playInstance/nextTurn/visibleState。沿用现有play.mjs的每三回合14、其余8原始意图，另显示虚弱后逐段值。带抽牌的卡经完整playInstance完成pendingDraw清算。
- 刻晴调用createBattle/useCard/finishTurn。沿用默认单敌固定意图；不把previewVisible或低层nextTurn当执行入口。
- 初始遗物均来自原模型初始化；不另加免费资源或开关。魈没有独立遗物卡文函数，显示其结构化合同及使用状态。
- G3只展示待命名与角色职责，不把候选名或AI评审当人类批准。G4对目标、异常、取消、牌区和回合边界做入口合同测试；逐卡独立数值期望仍归owner现有测试，本入口不认证全部效果语义。
- 参考雷电同版本规则源与取得/抽到/支付的区别，以及胡桃full75入口的可读性/交互要求；没有复制其冻结V4数据、批准或浏览器证据。

身份保护复用audit.mjs的snapshot：精确HEAD、全工作树脏状态（含未跟踪）、角色目录MJS及cards/relic/sources JSON摘要。输入前后复查，不匹配即拒绝。每进程同一模型只导入一次，路径规范化防ESM旧缓存。动态导入只适用于已核可信模块；工具不是OS沙箱。当前运行依赖在被摘要覆盖的角色目录中，未来越界依赖需扩展保护。

## 验证与独立复审

```sh
PLAY_PIN_ROOT=/workspace/scratch/c1a4970a76e0 node --test experiments/character-audit/audit.test.mjs experiments/character-audit/play.test.mjs
```

PLAY_PIN_ROOT下须存在表中四个play-pin-*副本。无该变量时，四项真实模型测试明确SKIP，不能将剩余单测当四角接线通过。

本轮19/19通过、0跳过：9项既有audit回归、6项事务/解析/快照guard单测、4项真实adapter（每角starter/all各一轮）。覆盖合法出牌与回合、非法输入、取消、旧REV重复、重置、图鉴、人工全池种类覆盖、无未来牌序输出。四份CLI管道冒烟均退出0、无stderr；重复结束被拒，退出后的缓冲命令未执行。

两个独立评审实际读源码并分别重跑10项play测试，均10/10、0跳过；另检验EOF、退出缓冲、甘雨/魈意图语义。未发现隔离备份阻断。之后仅提取既有snapshot共用、补目标提示与全池数量断言，作者再跑19项及四角CLI冒烟。详见play-evidence.json。

未跑Full；未修改角色owner、正式数据、原生加载器或审批状态。没有自然奖励、长期平衡、人类审美、浏览器及PC/手机验收声明。

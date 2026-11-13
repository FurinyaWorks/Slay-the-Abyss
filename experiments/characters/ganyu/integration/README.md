# 甘雨正式引擎接入差距（只读，不是导出器）

本轮 `git ls-remote origin refs/heads/develop` 实际返回903bf2a31e91f10fb24763ab4cea23d586d0bb83；并通过GitHub读取develop角色profile开头核相同内容。不是凭旧记录假定最新。主控确认无其他Agent负责甘雨生产适配；魈独立检查其自身接入。当前环境无Backlog命令，未伪造领取、未改公共注册。

## 已完成安全部分

`node experiments/characters/ganyu/integration/audit.mjs` 从固定commit读取6个生产数据/源码并绑定SHA256，将75卡基础/升级逐效果列入report.json。未知操作fail closed；damage/block/draw/aoe仅标有类似机制，不标兼容。它不写生产数据、不生成可误用的Lua、不打开角色、不改变争议数值。

## 真实阻断与下一切片

1. 生产profile只显式构造ironclad/silent/defect/watcher；缺甘雨注册/卡池/初始遗物。研究结构base.cost/effects.amount与生产cost/effects.value及upgrade覆盖不一致；未做静默字段转换。
2. 研究牌实例为id/upgraded，生产保留模块读取uid/cardId并维护实例字段。须保持实例UID、选择token、牌区和升级；不能将同名奖励归因当实例证明。
3. 生产战斗调度器有队列/反应/暂停所有权。研究纯函数克隆原子语义不等于生产副作用回滚；伤害会受生产力量/虚弱/敌反应等影响。至少需单体/群体/护甲/反击/杀最后敌时序的跨引擎同条件测试，而不是数值直拷。
4. 蓄力状态与初始遗物未接生产回合钩子。需定义未花能量计算时点、清零顺序、回合结束/死亡/提前胜利是否触发；不靠通用block或draw替代角色主轴。
5. 雨场max强度/max持续、主动消耗tick/拆场、零伤存续条件尚无生产适配。需确定群伤逐敌/终局/反应队列，主轴分支保留供统一试玩，不能删争议牌假装接完。
6. retain/exhaust已有生产基础设施但不是无条件兼容；检索需明确堆、首张、当前变体、手限与选择暂停，不能自动套随机卡选择。生产整型边界也不能用研究MAX_SAFE_INTEGER替代。
7. 来源/命名/B8/独评及真实ready/设备门禁未通过；即使将来通过Lua一致性也不表示正式可选。

下一可执行切片应先在独立测试夹具将基础伤害/盾/抽牌参数与生产effects合同逐项对照，再接专属状态钩子。当前不造共同schema、不改冻结V4、不把鉴别清单算实现完成。

# 魈十二非basic有限研究域（模块切片）

基线29f529e3。最新授权12张覆盖旧4common提议：03/06/07/08（common4）、09/10/11/12/13/15（uncommon6）、17/18（rare2）；01/02/04/05 basic排除，未共享其余59张排除。source rarity只是冻结候选标记，不代表正式分布或人审批准。

4张common从私有starter_source生成；8张additional静态投影来自cards.json SHA256 1ff068409fdc403c9a7e44e25da9f41e493627d225bc7056ba2401f0904cfdfa。完整cost/type/exhaust/基升有序effects与Bridge全字段比对，source metadata保留原rarity/color/sourceId。运行时Bridge不是自己的来源证明。factory复制输入，仅提前加8additional，Starter.new恰一次注入自身8张，不能传opts或替换starter。正式红绿蓝紫75不变。

provider只接受显式xiao-reviewed-nonbasic-twelve-v1，私有精确名单；完整run catalog source漂移/重复ID/Prismatic拒绝。clone cardRng后按宿主rarity回调同类别有限无放回，稀缺不重抽、不跨类别补齐；可短offer，空offer明确失败。先确定全部身份再按已有act规则掷升级，rare不升级，RNG和offset返回交宿主事务commit，不在prepare修改run。

此模块切片未接真实Run奖励生成路由。测试将只称factory/provider可执行，不能称真实胜利自动发出本域奖励；路由、领取/失败全Run事务由owner后继整合验证。该模块不改Run/Combat/CardPool/architecture或全局池。不把研究域当自然平衡、正式角色注册、人审/命名/来源批准。

首次执行的四色“前后”比较夹具失败：原始D尚未经Run构造补充正式牌池，直接与构造后75比较得到75≠0。修订为同一个正式Run.new(D,42)构造后的四色各75基线，未改runtime/牌池/阈值；caller D整个对象仍单独断言不变。随后provider/factory测试通过；补全metadata漂移/重复ID/真实constructor后fault原输入恢复后再次定向验证，结果以回执为准。

最终模块wrapper 1/1 PASS，8.68秒，四个PASS标志，256MB独占串行；未接真实Run奖励路由，未将模块验证冒充自然胜利领取事务验收。测试进程结束后释放窗口。

## 后继shared真实Run接线

上述模块阶段已通过独审，后继仅以明确domain在CardPool.prepareRewards路由，
不修改正式抽样或Run/Combat引擎。新增真实胜利结算生成→领取→永久UID/升级→
次战Run.play十二seed链，以及实际抽样后故障、零候选/Prismatic/源漂移结算回滚、
真实obtain后领奖失败的完整Run/RNG/nodeFlow及原引用恢复、重复领奖拒绝与claim0放弃。
Boss实际同类池仅17/18两张，因此短offer2；不重抽补足、不令rare升级。
Owner链明确使用控制击杀/次战移手与能量夹具，不作为正常战斗生存或全12自然取得证明。
作者自然战斗见证另报；原生血费Intangible、末敌后跳退出等已披露HOLD不变。

# 甘雨 09/36/56 公开队列接线候选

基线：27f2a6512fd9cc906ff70b436f2a3620dbae5258（shared 远端 6c1b30f9）。

源定义按已审 0eebf9de 原样复制，SHA256 `37c45ce3245451ca5ae1637b18c68e0bc9ec7366db0bbfdba524f6592da52e30`。卡值、稀有度、名称批准状态不变。作者合同来自独立分支远端 `3782941510cd3798120d0671ccd6ec603cb6ef8e`，该提交不是 shared 功能提交。

只添加 Paid.shieldChargeDefinitions 与三个 source-bound paid 分支：普通 block 在 native 队列捕获出牌时敏捷/脆弱；后续原有 charge ABI 在执行时读取蓄力并封顶 2。资源提交留在宿主整命令 Snapshot 内。56 使用正式 selfRetain；未打不产生格挡或蓄力。完整源双面/消耗/保留等约束与运行时效果验证分开，原生动态费用仍由宿主处理。

已实际运行：36 公共 C.play 组合、56 两变体两回合保留、6 固定奖励 Run.play、暂停后动态资源与固定盾捕获、native 后失败整图恢复、死亡门禁及自动出牌与畸形 source 拒绝。新套件 1/1 PASS（最终 source 严格校验版本）：36 公共组合、2 个未打56保留变体、6 固定 Run，78 自动出牌/负例组合及暂停、死亡、故障回滚。旧14/75与03/06顺序回归 2/2 PASS。仍未独审、未远端发布，不声称已合入共享。

首次启动因新工作树缺 node_modules 链接而 MODULE_NOT_FOUND，未执行 Lua；补上已有依赖链接后完整新套件通过。随后静态加固未知 source 字段拒绝，最终完整新套件再次通过。没有修改卡值或稀有度，无随机获取测试。

入口：`NODE_OPTIONS=--max-old-space-size=256 node --test experiments/characters/lifecycle/ganyu-shield-charge-usecard.test.mjs`（仅独占窗口授权后运行）。

没有修改奖励 provider、CardPool、正式角色选择或任何正式池；旧44定义奖励域保持不变。新47域尚未实现。来源/命名/平衡/真人/生产门禁仍 HOLD。

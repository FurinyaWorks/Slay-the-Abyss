# M7 TreasureSource 奖励身份职责（2026-11-09）

接续 TASK-74.20，基于 develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。只修改生产 `abyss_treasure_source.lua`，不改 Run/Nodes/UI、奖励、RNG、交易提交或其余在途切片。

## 实际边界

`pair` 原 CC35 拆为物品槽收集、Sapphire 双向绑定与额外遗物规范身份校验，入口 CC8；其调用的 `item` 原 CC19 分离遗物字段校验后为11，`relicItem` 为9。新增 `collectItems` / `linkedPair` / `matchingExtras` 分别为11/14/8。六个具名入口及嵌套函数纳入原 CC15 门禁；其余完整模块函数也均不超过14。

保留先检查物品形状/唯一槽，再区分 gold/sapphire/base/boss 的顺序；Boss 拒绝先于成对身份检查，缺少 base/key 先于额外遗物检查。所有原字段读取、短路、规范编码、公开返回数量和拒绝文本保持；不新增持久 owner 或依赖。中间多返回只属于私有收集函数。

## 同源计量与验证

- 完整338模块：5604→5608测量，CC>30 33→32，CC>15 209→207；最大61、14条既有告警保持。
- 完整依赖图1929引用位置逐项相同，SCC68/11/2及其内部边完全不变；不宣称降环。
- 独立旧新VM各2444边界案例、4888完整遍历检查点的可重建全状态图流逐字一致，14个具名可解析真实语义变异均被指定断言检出。16/16；图定义使用增量编码，不是4888份独立全量快照。
- 四个原始Lua夹具旧新各自通过：source_treasure_token、source_treasure_nodes、source_treasure_owner_guards、sapphire_current_relics。每侧128对照检查点与原断言保持，含同值替换、token失效、原生mock手势、嵌套失败事务和Sapphire额外奖励。
- 固定Luacheck与真实CC拒绝控制3/3，原职责合同19/19、完整工程采集、Backlog范围与guidance通过。
- 新52-owner来源11/11；原Formation/集成49/49、其余七历史epoch59/59。保留原档、原hash、原断言和每次调用的实时owner认证。独审穷举22历史target ×339路径及LF/CRLF，1234投影、13682未变路径、64168鲜读通过。
- 独审另20边界案例、每侧40检查点通过；生产语义未发现阻断。最终整片身份及来源/成本结论见证据目录。

## 成本与未验边界

实际新增三个JS测试，当前803JS/1410Lua全库存另验，原800库存证明保留。只追加新来源23130ms与行为10624ms规划floor；行为保留较早成功10623.134307ms和后来完整输入认证10177.375855ms。两次为同一16项，不叠计覆盖。

完整成本合同45/45、runtime13/13以及其余原相关CI合同通过；首次相关CI 34过1失败源于历史reader误读新增floor，已只修复历史读取边界并在原runtime完整文件复验。旧证据不改。Windows17/POSIX15、预算、60秒预留、unknown10000、worker、并发与工作流均不变。最终预测Windows1796804/1800000ms，余3196ms；POSIX1131726/1200000ms。极小静态余量不是Hosted性能或Full通过证明。

原行为负控夹具/语法接线失败、首次复杂度测试复制名称错误、基线采集缺少materialization输入、旧doctor5组重复ID等原始记录均保留。没有放宽门槛、删除旧断言、重复本地Full或操作用户电脑。

保持任务In Progress和未勾AC。Draft交付后仍须精确HEAD/BASE独审、正常Hosted检查、原merge:auto/原生队列和实际合后验证，不直接合并、绕过保护或发布。没有GIL、官方ready或设备验收声明。

完整可读与机器证据：[本轮目录](../evidence/m7-treasure-source-20261109/README.md)。

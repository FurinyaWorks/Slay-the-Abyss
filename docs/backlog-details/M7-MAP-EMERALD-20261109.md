# M7 Map 翡翠精英身份职责（2026-11-09）

接续 TASK-74.20，基于 develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。仅改 `abyss_map.lua` 中 `emeraldNode` 验证跨度，未改地图生成、prepare/commit/restore、RNG、公开 API 或其他在途生产切片。

## 真实职责与指标

原 `emeraldNode` CC38 拆为选择形状、地图身份和唯一标记节点三个阶段。入口为9；`emeraldSelectionShape`、`emeraldSelectionOwner`、`markedEmeraldNode` 分别为12、8、13，全部具名入口及嵌套函数纳入原CC15门禁。保留字段读取/短路次序、`map.act` 默认化、pcall多返回裁剪、完整节点遍历、裸返回与单nil、节点引用身份。

完整338模块的同源测量5604→5607，CC>30为33→32，CC>15为209→208；最大61、14旧告警保持。1558个去重依赖对、1929个引用位置、SCC68/11/2与内部边逐项一致。没有降环声明。Map其余原职责 `configuration`24、`generate`17、`available`16、`restore`28不在本切片，未放宽或冒称全模块CC15。

## 行为与证明

原 Emerald map 六组断言原样保留。固定Git整文件baseline与当前真实模块在独立VM运行相同边界矩阵，采集完整图/循环别名、packed pcall多返回、依赖轨迹、错误类型及消息、RNG和前后状态；真实三幕generate→prepare→choose→commit→restore另在矩阵中执行。14项具名真实语义负控全部检出，未以语法错误或固定输出代替行为敏感性。

同一完整测试文件两轮10/10通过，分别63,562.020062ms和87,637.813005ms，不叠计覆盖。第二轮严格hash→run→hash，4281个保守完整输入逐字稳定；首轮没有pre-run hash，只保留完整原始日志。首次内部nil→false变异在公开入口折叠而等价，改为公开返回的真实语义变异；首轮输出未完整落盘，保存的initial-failure是明确标注的可见摘要，不伪称原始完整日志。

最小outer epoch只认证新增map owner，共52个当前owner；旧339 current binding集合与21个历史target保留。原facade逐字冻结为predecessor，旧Formation测试仅指向它；新5合同、旧11 Formation和38 integration合同通过，原档及hash不更新。独审另11个Git原始/当前直接探针覆盖精确8次代理读取、零/单返回、别名、Acts.mapSeed异常及多返回，通过且无生产阻断。

相关真实Run/Nodes/Map检查11项、原职责门禁19项、关键变异4项、原生UI离线合同6项通过。完整工程采集、guidance和backlog范围检查通过；Backlog doctor原5组重复ID保持，未修复无关任务。没有重复本地Full或使用用户电脑。

## 成本与交付边界

完整本地测量仅作规划依据，不是隔离性能基准或Hosted结果。本轮严格收据执行期间有独立小检查并行。只增加本文件87638ms真实规划floor，原hosted5802/4240ms及32项旧floor不变。800JS/1410Lua完整库存重算：Windows17含60秒预留1,799,118/1,800,000ms，余882ms；POSIX15为1,134,372/1,200,000ms，余65,628ms。极小静态余量不证明Hosted性能。追加核验发现CI校准完整单文件已超过既有10000ms默认权重，其他修改CI文件完整成本仍须核清；因此当前配置预测有已知低估，本Draft成本闭环保持BLOCKED。

原历史planner改用锁定完整原脚本与冻结timings，不用简化函数副本。校准45/45通过；补充CI首次20项12过8失败，原因是三个历史reader将新floor带入旧容量证明，已仅追加完整字节认证的outer投影并完整20/20通过。真实current planner与全部原断言、预算、worker/并发仍保留，失败原始日志不覆盖。

同一次双报告核对：CI校准原生file summary3909.987245ms、Node完整13041.312295ms、进程wall13158.719973ms；runtime分别2131.63404/11921.762917/12018.856545ms。两次均12输入前后稳定。证实file summary不含完整进程成本，但不能把全部差额都归因于ESM。保守把已知完整观测放入内存规划后，Windows1799951ms仅余49ms、POSIX1135751ms余64249ms；其他修改CI测试尚缺完整独立成本，未虚构floor。详见ci-cost-observations.json，结论DRAFT_BLOCKED_COST_ACCOUNTING。

最终7个修改CI文件串行79/79通过；另分片19/19、sibling10/10、Defect来源4/4均有完整日志，不叠计总覆盖。修复前首次CI45通过日志曾被覆盖，仅保留明确说明而不伪造原始文件。

任务继续In Progress，owner及AC不变。提交后仍须精确HEAD/BASE独审、正常Hosted检查、原merge:auto与原生队列和合后实际验证，禁止直接合并或绕过保护。没有GIL、官方ready、客户端画面或设备验收声明。

完整证据：[本轮目录](../evidence/m7-map-emerald-20261109/README.md)。

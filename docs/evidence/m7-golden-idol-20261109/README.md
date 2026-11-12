# Golden Idol 选择职责切片

基线：develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。TASK-74.20 既有明确指派续做；检查七个开放 PR 无 Golden Idol 生产路径占用。不是新认领，不提前勾选任务 AC。

## 生产收益与边界

仅修改 `src/lua/abyss_golden_idol_event.lua` 中选择职责：遗物获取、陷阱健康校验、诅咒获取、代价提交四个私有 helper。choose CC31→9，helper6/8/7/6；不新增模块、层次、状态 owner 或缓存。完整338模块5604→5608测量，>30热点33→32、>15热点209→208，最大61及14条旧告警不变。SCC仍68/11/2，内部边513/44/2，依赖图完全相同，不宣称降环。

原前置prepare/options字节不变。保留取得遗物后才进入陷阱、逐次Run动态槽读取、health短路顺序、Circlet替代、Omamori、HP clamp及失败部分写入；公开事务回滚仍由Run/Nodes负责。全模块、初始化与匿名函数纳入原CC15门禁。

## 本轮验证

- `behavior-complexity-pass.log.gz`：5/5；独立旧新VM各98完整图（92输入情景）、8个具名真实语义mutant；真实固定Luacheck旧31拒绝、5职责及嵌套超限/缺失/重复/坐标漂移负控。
- `real-regressions.json`、`real-regressions.log.gz`：八个原Golden Idol Lua夹具旧版/当前各8/8，所有原断言保持。覆盖真实获取/代价、晚失败回滚、IEEE32、自然事件与gold RNG、UI触控。这里比较原断言输出，不冒称这16次保留了完整图；完整图证据来自新差分和独审。
- `review/`：独审额外907新旧完整图逐字相等，含动态读写、48操作失败位置、表错误别名及返回arity；源码、全模块门禁和来源合同无阻断。评审只绑定记录中的字节，发布提交另外精确读回。
- `engineering-metrics.log.gz`、`metrics.json`、`quality-{before,after}.json.gz`：同轮完整质量/架构/静态门禁与精确base来源复核通过；`responsibility.log.gz`19/19。
- 来源新52-owner和冻结51-owner合同22/22；历史五文件63/63，剩余六个来源合同48/48。独立single-file11/11、32447.110123ms由`source-receipt.json`绑定385个输入，逐次所有owner认证、LF/CRLF、暖漂移、缺失、无效reader与隔离闭包均保留。旧archive/hash/断言不改。
- `ci-final.log.gz`首次58项55过/3失败，45项校准与新当前库存通过，3个旧runtime历史入口尚未接精确投影；`ci-runtime-corrected.log.gz`中间失败继续保留；修复后`ci-runtime-final.log.gz`13/13，最终同批`ci-verified.log.gz`58/58，`ci-consumers.log.gz`17/17。
- Backlog验证、guidance、diff通过。doctor保留既有5组重复ID与93个旧归档位置警告，未擅自修复。

## 成本、来源及未完成门禁

只增加两个JS文件，当前802JS/1410Lua。新增来源完整文件floor32448ms；行为+复杂度完整5217.84175ms仍使用原unknown10000ms。全部旧成本、预算、17Windows/15POSIX形状、12并发、2 Lua worker、60秒预留与执行上限保持。

当前算法预测Windows1796561/1800000ms，余量3439ms；POSIX1131638/1200000ms。预测不是Hosted实测。保留所有不利样本，包括本地runtime完整15685.916156ms与首次来源/门禁失败，不能据此承诺实际排队、耗时或跨平台成功。

历史800库存、旧来源收据和成本断言通过精确完整输入适配继续原样执行；新当前802全库存另检查无重漏与实际预算，不伪造旧观测。未重复本地Full、未手动rerun/dispatch、未使用用户电脑、未发布游戏。PR保持Draft；当前HEAD Hosted Full、正常队列和实际合后验证仍待完成。

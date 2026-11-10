# PR #586：历史证明克隆启动开销修复

## 范围与真实失败

接续 `a46634168bced808b40a084403f916fa50ebb0f6`，本地受测基线为 `1eb288472d7b33b7450eec97a624ca2ffa526f39`。发布前实时读取 develop 已为 `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04`（#592流程调整）；新组合尚未验证，不沿用本轮旧基线审查作准入。本轮不增加生产架构切片；先解除既有 WatcherFlow.withCards CC32→5 切片的实际 CI 阻塞。生产 Lua、SCC、成本 floor、调度、worker、超时及全部原门禁均不改。

[Quality 42729040298 attempt 1](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42729040298) 完整38作业：35成功、2失败、1正常跳过。失败仅 Windows rules17/18 的原拖拽 cases8–15 在原30000ms外层期限超时，以及汇总 check。该片46个JS文件完整结束，45过/1失败；208项207过/1失败。其后独立Lua分片未执行，不算通过；其余32回归分片通过。原日志中 Lua阶段的10319ms是进入该阶段时的累计时间，不是 Lua运行耗时。原失败日志、run及38-job快照完整压缩保留，见 archive-index.json。

## 修复与合同

旧历史证明链反复 `JSON.parse(JSON.stringify(input))`，将很长且不可变的源码字符串反复序列化。原入口CPU诊断显示 JSON clone 占约5.1秒self CPU；仅用于定位，不将有profile与无profile运行直接作速度对比。

- 普通JSON数据使用容器深拷贝，复用不可变字符串；数组按自有数据属性创建，重复引用仍复制为独立容器，防止改变原JSON语义。
- Proxy、访问器、toJSON、自定义原型、稀疏数组、非有限数、负零、循环及其它非普通JSON输入回退原转换。输入变更隔离、冻结、原始哈希验证和每次新鲜owner读取均保持。
- 增加完整档案与JSON对照、别名隔离、源漂移负控和隔离子进程的继承数组setter回归。独立复审发现并修复覆盖map/species及原型setter的两处边界。
- 只在历史成本收据读取边界为两个精确变化的helper恢复a466原始字节；before SHA256/Git blob和after SHA256逐项认证。LF/CRLF接受，脏/截断/外国路径和非文本全部原样拒绝投影。真实复制闭包绑定当前runtime，不能靠历史投影授权当前脏源码。
- #582及其下游#588另有显式冻结输入复用选项；本轮不改其分支。将来组合必须同时保留该选项及本轮默认克隆语义，不可用覆盖文件代替合并。

## 本轮验证

- 最终六份代码/测试身份见 reviewed-source-inputs.sha256；源码/历史runner与WatcherFlow来源24/24，calibration/runtime63/63。两轮完成后所有输入哈希保持。
- 完整原拖拽文件7/7通过（86.730秒），两片分别21.814/25.048秒；见 validation.json 和 drag-exact-final.log.gz，原15 cases、全部断言和两片各30000ms期限不变。
- 独立18类旧JSON/新克隆边界探针通过；完整审查见 independent-review.json/md。代码审查不冒充GitHub独立状态握手。
- guidance初次因稀疏工作树缺失两个原有指引文件失败，恢复HEAD原文件后通过；失败原日志保留。verify:backlog通过。没有借机更改指引规则。
- 原indexed-copy候选的drag7/7记录及可能受最后编辑影响的source日志仅作中间证据；不冒充最终版本。一次最终定向进程会话丢失、输出为空，不算成功，保留说明后重跑该定向文件。未重复本地Full。

802JS/1410Lua和35项floors不变。Windows18预测1705160ms，POSIX15预测1137499ms；Windows17仍1801749ms、超1749ms。所有较慢样本和历史成本原样保留，见 forecast.json。预测不是Hosted实测，本地拖拽通过也不证明Windows余量。

## 仍待完成

新精确HEAD的自然Hosted CI、独立审查状态握手、正常原生队列及实际合后验收仍待。保留Draft、TASK-74.20 In Progress和全部未验AC。不手动rerun/dispatch、不直接合并、不绕过保护、不操作用户GUI；不复用旧HEAD的绿灯。

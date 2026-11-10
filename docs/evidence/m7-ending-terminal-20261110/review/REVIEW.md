# EndingHistory 终局职责拆分独立技术审查

- reviewId: ending-terminal-independent-20261110
- 审查基线：`ab65ed3b5b4240eb653af4651a13c1b8c72b2e04`
- 最终 reviewedHeadSha：待提交后绑定。
- 当前结论：生产行为、源码身份链与CI改动未发现未解决缺陷。不是合并许可或完整质量通过声明。

## 审查范围

审查终局证据拆分、CC15静态门槛、历史完整源码对照、getter及异常顺序、source epoch及独立复制闭包、CI历史契约适配、新成本下限与跨平台字节身份。未修改生产逻辑。

五个证据谓词保留原表达式与短路顺序；协调器仍先捕获nodeFlow、lastResult，再读取run身份。finish及持久化状态更新未变化。六个终局函数及嵌套函数纳入既有AST/复杂度完整测量门槛。旧完整源码固定到Git blob，不以重写后的预期冒充历史输入。

测试保留原有Ending/Host断言、完整对象图、非法输入、可观察getter轨迹、字符串和table错误身份、writer拒绝/抛错/修改、重复finish与10种命名语义退化。错误行号适配只处理可唯一对应的原源码语句，不删除任意错误内容。

新增外层source epoch只替换Ending当前源码，保存完整前代元数据和历史目标；验证前代身份、压缩/解压字节和复制闭包。52个当前raw owners每次重新读取，配置按token文本验证而非对象等价。外来源码不触发授权读取，未知target拒绝。

## 独立执行证据

- 既有integration-source-epoch选择性契约35/35通过：完整当前生产树、16个旧inverse/config入口、外来输入与warm-success后的owner漂移。
- 修改后的Encounter Formation前代完整suite 11/11通过。
- 16个旧inverse入口分别投影当前Ending和architecture config；每次warm success后分别污染52个raw owner。1664/1664负控均拒绝。
- CI proof的10个before绑定逐一对照真实基线Git对象，after绑定逐一对照当前文件，全部一致。
- 六个新增成本floor所指收据SHA256逐一匹配。
- 隔离Git仓库设置core.autocrlf=true，实际add、删除、checkout-index；全部7个收据绑定测试保留原LF raw hash。

探索性探针两次失败已保留：最初将“所有发生投影的旧入口”都要求经过52-owner combined链。既有original_v4 capability专用投影可先返回，不适用该断言。这不是本次变更引入的绕过。最终探针限定到本次Ending与config真实combined路径，1664次全部通过。

## CI审查及已解决问题

最初新测试只有10秒未知成本回退，现补六个本地完整执行下限；complexity实际低于10秒，保留原回退。旧成本条目保持历史身份，不冒充修改后文件的验证。CI适配严格匹配完整当前字节后投影到基线，四个旧消费者继续执行原断言；新增独立合同验证当前803 JS/1410 Lua库存和真实调度。

审查发现Linux raw hash收据与Windows CRLF checkout可能冲突。现通过精确LF属性修复，并以真实Git autocrlf checkout验证；未放宽原raw hash或重写测量证据。

成本仅新增规划下限，未提高deadline、预算、未知fallback或worker数量。Windows17模型含60秒预留为1,798,303ms，仅余1,697ms；POSIX15为1,133,696ms。极小Windows余量是明确风险，模型不证明Hosted执行安全，必须等待当前提交真实CI，不得以模型替代Full。

## 验证边界

新Ending三完整文件28/28已有本轮执行记录，审查未重复运行。最终CI四完整文件在最终成本/helper登记后串行64/64通过，0失败、取消、跳过，42.888秒；已独立核对压缩/原始日志hash及收据中全部九项当前文件hash。局部helper 2/2未替代这次完整消费者验证。原始测量发生于最终成本登记之前，收据保留当时实际输入，不声称最终helper字节已由原测量覆盖。

未执行Full、官方导入、实际游戏或设备测试。最终HEAD/base绑定、必要Hosted CI及分支保护仍须完成。

# Watcher Flow 来源证明构造复用

状态：接续 PR #586 已发布 `3b281879`，其完整树等同原本地 `58b1fccc`。复用原候选 `c5b6af1a` 的完整测试代码，交付范围仅去除无关任务元数据并更新本轮证据；不重复实现或 Full。精确新 HEAD Hosted 仍待验证。

## 最小变化与授权边界

新增 outer 原本仅保留一个 target projector，GameUI native/develop 嵌套投影反复克隆、哈希并冻结完整证明。现在缓存最多两个已验证不可变 projector，按最近使用淘汰；重入期间的执行中局部引用不计入缓存容量，不宣称总堆大小固定。只复用构造，不缓存读者、授权或投影结果；所有 51 owner 每次仍有序真实读取。执行中的 projector 由局部变量持有，嵌套淘汰不替换正在执行的认证。

核查全部开放PR后，#579/#582已有共享 runtime 与 GameUI 原测试工作；本切片仅治理#586新增outer，保持独立归属，没有复制或改写其实现。共享 runtime 和 GameUI 原测试未改。当前 closure 仅更新该 outer 一项完整哈希。既有 preparation source 测试增加永久构造计数、容量、跨 target、重入淘汰、中途漂移及逐 owner 缺失/漂移回归。原 unknown/invalid-reader/CRLF/词法身份合同保留。

仅四个完整当前文件可投影到 58b1fcc 历史输入：outer helper、closure helper、preparation source 测试和 timings。旧 receipts/proofs/archives/expected hashes 均未覆盖。投影只接历史测试入口；新收据对原始当前输入取哈希，不经逆向适配。

## 分层证据，不互相覆盖

- 原 HEAD `3f633f3123d41e0a0d19955c91e7b9e226722b7a`、旧 outer SHA `773b8738355b677bd65c042c0ae9f421d3e838b6f9553c495b8592a4be0a9e1c` 的 Hosted POSIX1 job129040954716 记录 GameUI 完整成功 `1157502.785265ms`。完整原日志 gzip 和身份见 hosted-slow-witness.json。该 job 整体取消原因未明确，不能声称整套通过。
- 同机器短路径探针：相同 170 次调用，projector 构造158→2，构造8174→230ms。只是这三条本地路径；不能据此宣称 Hosted 提速。采样 RSS 不是全文件峰值。
- 新原 GameUI 文件完整14/14：78818.61186ms；全进程最大子进程RSS 2205204KiB（约2.10GiB），默认Node24.22.1，无扩大heap参数。原先10/14因current closure旧哈希拒绝的失败样本完整保留，没有跳过该保护。
- 原 source 文件11/11：29121.53503ms，后追加永久回归的最终12/12：26235.83895ms。保持已发表50618 floor，不降低。
- 前后授权探针各5661条owner读取记录、完整序列SHA相同；永久回归再验证3 target与嵌套认证。
- 间接CI三文件9/9：17440.473765ms。
- 最终 calibration49+runtime13 共62/62：23198.913443ms。首次61/62旧GameUI权重绑定遗漏失败样本保留，修复仅给原真实权重函数绑定精确历史timings，并另查真实当前权重。

GameUI 本地floor仅从77215上调至78819，旧完整对象见 previous-gameui-floor.json；其余34条floor及全部预算、未知成本、worker、并发、timeout保持。新本地样本不是覆盖旧1157502ms Hosted记录的理由，也不是新HEAD Hosted准入证明。当前完整模型复算见 forecast.json，17片继续拒绝；18/15模型在预算内仍不代表实际 Hosted 通过。

## 定向命令

- `node --test tests/game-ui-extraction-source-inverse.test.mjs`
- `node --test tests/watcher-flow-preparation-source-epoch.test.mjs`
- `node --test tests/ci-complete-calibration.test.mjs tests/ci-runtime.test.mjs`
- `node --test tests/ci-host-timing.test.mjs tests/ci-windows-shape.test.mjs tests/lua-shards.test.mjs`

收据输入哈希在成功运行后采集，保守覆盖仓库来源及closure；并不声称每个列出的文件都执行过，也不声称完整覆盖外部Node/npm或临时文件。永久回归位于既有source测试文件，没有增加JS inventory文件。

## 当前取消轮与接续验证

- 当前已发布 `3b281879` 的 Quality42673923936/attempt2/POSIX1（job129377737470）共选56文件，仅33份有成功完成收据，23份未完成。GameUI本体完整成功1310431.086131ms，注入reader案例522345.490658ms；之后日志仅称operation canceled，取消发起方/原因未知。原始日志及完整缺失清单见hosted-current-witness.json，不把未完成文件认作失败或通过。
- 本轮在代码与c5b6af1a逐字相同的候选上，仅重验注入reader一个案例：1/1，案例5848.020356ms，Node报告20467.055543ms，全进程20.578秒、最大子进程RSS1603940KiB。见reader-focused-current.json和原始日志；不把该单例算作14项整文件复跑，不将不同环境差值宣称Hosted提速。
- 原完整GameUI/source/CI成功和失败日志保持；旧1157502ms与新1310431ms均为未应用此优化的Hosted观测。没有抬预算、扩大worker/并发、减少fresh-read、改负控或降低floor。
- 原共享runtime与GameUI测试仍属#579/#582/#588其它在途工作，本次不改。当前开放PR窄范围交集见open-pr-ownership.json。
- 本次最终manifest、checkout证据与独立review按实际交付文件重新绑定，不把原较大本地包的审查直接当作新交付批准。Licenses仍单独失败；原失败作业恢复被GitHub403拒绝后未继续重试。完整Hosted、审查状态握手、原生队列和合后验收仍待。

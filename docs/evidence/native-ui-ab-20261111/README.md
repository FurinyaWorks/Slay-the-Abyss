# PR #613 本轮原生 UI A/B 证据

结论：**两项局部 NO-GO / EARLY_STOPPED**。保留原生产源码；实验范围和复现见 [实验说明](../../../experiments/native-ui-ab/README.md)。本轮没有官方客户端或实体手机可用，设备结果全部UNVERIFIED。

- [机器摘要](summary.json)：同源身份、真实B模块/GIL摘要、单变量校验、否定样本、REPORT_ONLY时延和未做项。
- [A原始回放](sdk-A.json.gz)、[差分原始回放](sdk-diff.json.gz)、[Tween原始回放](sdk-tween.json.gz)：完整阶段/逐步记录、桥计数、模型/内存、日志和局部卡牌轨迹。均为Node22.22.1、Windows、固定身份SDK0.5.2的单次顺序运行。gzip仅压缩，不改写原始JSON。
- [A构建收据](candidate-A.json.gz)：当前源码构建、私有输入摘要与实际GIL身份。源码基线 `a423259c1d669344ff5ee1f235aa58e455c22c5b`，其生产源码与最新核对的 `develop@6a614fc82697750ddb408750e54f59f801c24f1e` 相同；dirty包含本任务登记，不冒充干净HEAD构建。
- [归档清单](manifest.json)：压缩文件/解压原件及实验源码hash。SDK、GIL、完整投影与私有素材不重复分发，保留在独立工作树 `.artifacts/native-ui-ab/`；未来缺私有输入不能宣称新鲜复现成功。

差分双敌暖态600帧，1200次写变1200次读，净桥请求不降。Tween在接触后首个差异样本A缩放 `.37075617283950624`、B仍 `.5`，B下一样本才到A上一值；隐藏时A为0、B为 `.0003858024691357764`。已核SDK先推进动画再执行OnUpdate，与相位差相符。两项否定结论均不依赖未控的时延比较。

`verify.mjs`重新读取实际GIL全部Lua，核对完整投影脚本、相同挂载参数、同源原生树/资源/配置以及只有一个模块改动。只在验证adapter生成的准确值后，规范化描述名称和两个来源GIL路径。首版严格比较因这三个描述字段失败；没有剥离行为字段或更改原报告。随后[真实校验通过](verify-pair-2.log)，[改原生visible并重算hash的负例](negative-pair.log)被具名“非介入原生模型不同”拒绝。

[差分边界](name-boundaries.log)验证false/throw、重试、外部写入和下一update重入协调；其中20次属性重写不是页面往返。[Tween边界](tween-boundaries.log)使用真实Feedback模块和模拟句柄验证cancel/disable调用Kill(false)，不证明官方或SDK中途engine销毁安全。原有[可见性回归](regression-intent_visibility_cache.log)、[反馈生命周期](regression-actor_feedback_lifecycle.log)、[启动失败恢复](regression-feedback_start_recovery.log)均通过；[Backlog检查](backlog-check-2.log)通过。

早停未做：20次真实页面往返、目标失效、迟到回调注入、动画中途engine销毁、重复/顺序平衡性能样本、实际渲染视觉验收。官方导入/ready、PC/手机帧时、触屏体验、容量全部UNVERIFIED。600空step不是往返；原始Control桥计数漏计Tween创建/生命周期/内部引擎写入，不作为原生总调用节省；不同准备步数导致全画面idle相位/hash不同，不宣称全画面等价。

准备期间保留本机失败：旧素材目录已迁移、沙箱Python/子进程EPERM、本地缺luaparse、首次把多文件参数传给单文件Lua入口。分别通过既有迁移清单、本地缓存`npm ci --ignore-scripts --offline`、授权离线子进程和原单文件接口处理；没有重装框架、修改阈值或跳过有效断言。

独立审查与精确HEAD原CI/队列/合后读回分别由正常交付记录证明，本目录不把尚未取得的CI或设备结果写成PASS。TASK-100.2仅勾已证实的NO-GO/设备边界，完整验收AC保持未勾。

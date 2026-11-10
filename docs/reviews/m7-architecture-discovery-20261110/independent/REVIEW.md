# 独立复审：TASK-74.21 架构源码发现

结论：PASS，无阻断发现。审查是离线源码/Node 验证，不代表 Full、Windows、GUI、真实导入或运行验收。

审查基线 ab65ed3b5b4240eb653af4651a13c1b8c72b2e04。候选为该基线加 reviewed.patch，隔离于 /tmp/m7-eleven-review/candidate。未修改实现工作树或远端。最终提交绑定待主控提供。

## 设计

两个入口共享原 discoverSources 和原模块身份转换，保留 name in byModule 的拒绝行为（包括继承名）。sourcePaths 原始路径映射传入 analyzeSources 第四可选参数，普通诊断、边界、环诊断均准确。默认 analyzeSources 的旧调用兼容。报告 schema 与源摘要结构不变。没有跨调用缓存，未读历史报告为通过依据。initializationFunctions 与基线逐字一致。

边界：src/lua 根目录为链接时原 discoverSources 会跟随，本轮未改；树内任意符号链接仍拒绝。已有成功 architecture.json 在后续采集抛错时可能保留，但 CLI 非零，未被采集器使用。此为既有行为，本轮不声明报告清理或根链接加固。

## 独立验证

- unit.log：architecture.test.mjs + engineering-shared-inputs.test.mjs，16/16。
- probe.log：真实 dotted 文件路径、嵌套环路径、同进程新建/删除源码、策略文件新内容、扁平点名/嵌套路径身份冲突，全部通过。
- 独立 CLI：合法源码 exit 0；违规、冲突、空树、文件/非 Lua/悬空/目录链接均 exit 1。旧成功报告不能使空树返回 0。
- mutant-path.log：移除真实路径映射，嵌套环路径断言失败，exit 1。
- mutant-collision.log：移除冲突拒绝，碰撞断言失败，exit 1。
- baseline-probe.log：旧实现空树和嵌套违规均 errors=[]，链接跟随，与递归发现行为不一致。

## 便携重跑

将 probe.mjs 与 negative-controls.py 放在同一目录。两者接受显式仓库绝对/相对路径，省略时使用当前工作目录。仓库需已安装 Node 依赖，系统需 Node 和 Python 3；符号链接能力是本探针的验证前提，不具备时失败而不静默跳过。

从待审仓库根目录运行（将 /path/to/review 替换为附件所在目录）：

- node /path/to/review/probe.mjs .
- python /path/to/review/negative-controls.py .

或在任意目录传入仓库路径：

- node /path/to/review/probe.mjs /path/to/repository
- python /path/to/review/negative-controls.py /path/to/repository

正控仅在系统临时目录构建夹具，finally 清理。负控自行复制当前仓库到系统临时目录（排除 .git、node_modules、build、.artifacts），只链接只读使用的原仓库 Node 依赖；先验证隔离副本正控成功，再分别变异私有源码，检查非零且确实失败于目标断言。每项 finally 恢复字节，最外层自动清理整份副本。无需旧 candidate、original-*.mjs 或基线源码副本。

2026-11-10 便携版已在实现仓库四份受审源码上重跑，正控全部通过；隔离绿控通过；两项负控均在指定断言真实拒绝。新日志 portable-probe.log、portable-negative-controls.log，旧 probe.log 和 mutant-*.log 保留。覆盖不缩减。

## #601 组合

精确 #601 HEAD ab5d3fd04753de30411afb4d9e5400d36d6a7334 已存在本地对象。其两份执行文件与旧本地 681a75c4 相同。将该提交的 scripts/check-architecture.mjs 和 tests/architecture.test.mjs patch 应用在本轮隔离候选，干净应用，无冲突。组合 tests/architecture.test.mjs + tests/engineering-shared-inputs.test.mjs 18/18，额外独立 probe 全通过；见 pr601-combination.log、pr601-probe.log、pr601.patch。随后撤销组合 patch，恢复本轮候选。

## 本轮四源文件 SHA256

- scripts/check-architecture.mjs: 0487dc90d47a5a748e5911c746ece6a2a21481e5c02f3e8d4e80c57f030858e5
- scripts/check-engineering-quality.mjs: dddc51fbd8c1a6a44dc1bdb4a60ca34e74d01346a77fc82dcdf68e156f3ecd12
- scripts/lua-quality-metrics.mjs: a7c2143575955ef265b1de0405cd020255fbe72d4b8b61320ea09d3bad6fba02
- tests/engineering-shared-inputs.test.mjs: 55dce4d9b80f0e7b4316dd4fb5282ac18c12933f89394d1ce2d6606a25c0ee7f

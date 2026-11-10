# Colorless 本地 CI 接线证据

基线为 develop `ab65ed3b5b4240eb653af4651a13c1b8c72b2e04`，工作副本在 PR #594 源码提交 `3a09dfba19fca59c5bcd434a6ad09ed7d0330902` 上接线。所有结果仅为本地云 Linux；没有运行 Full、重新执行归档 3232 场景行为矩阵、使用用户电脑或提交到远端。

## 最新完整文件观测

- Colorless source epoch：5/5，进程墙钟 16109.848212 ms，Node 16051.366630 ms。
- Colorless complexity：1/1，墙钟 743.103171 ms，Node 677.462768 ms。
- CI complete（最终）：44/44，墙钟 8839.169766 ms，Node 8772.340114 ms。
- CI host：4/4，墙钟 6785.660853 ms，Node 6721.571003 ms。
- CI windows：3/3，墙钟 7243.778219 ms，Node 7172.362813 ms。
- CI runtime：13/13，墙钟 8047.295613 ms，Node 7988.269988 ms。
- Formation source epoch（修复后完整文件）：11/11，墙钟 12507.143192 ms，Node 12439.901916 ms。

以上 7 个完整文件合计 81/81；每次失败、取消和跳过均为 0，执行前后输入清单一致。清单是源码、测试、历史证据、配置、解释器和工具的目录超集，不宣称操作系统级动态依赖跟踪。之后的计时和证据整理不冒充原执行时的输入；每次原始清单、日志和收据单独保留。最终更新观测清单后，注册的 Colorless CI 合同另跑 2/2 通过，见 `contract-final.log`。

`ci-complete-receipt.json` 保留此前同一测试文件的 44/44、8513.949634 ms；`ci-complete-final-receipt.json` 是最终观测，两者没有相互覆盖。桥接安装前的窄失败探针只证明缺少接线，不是业务行为证据。

## 保持的历史与真实预算

- 原 800 个 JS 测试完整保留，加入 2 个 Colorless 测试后为 802。1410 个 Lua 文件和对应摘要未变。
- 原历史 receipt、hosted 测量、32 个旧 local floor、unknown fallback、执行超时、worker 安全、预算和矩阵不变。9 个完整已知文件通过精确字节桥投影回原始基线；外来路径、局部改动和重复 JSON key 不被接受为旧身份。
- 只新增真实完整观测 floor：Colorless source 16110 ms；CI runtime 8048 ms。Complexity 保留 unknown 10000 ms；其他 3 个 CI 文件保留原有效 10000 ms。Formation 实测 12507.143192 ms，仍保留更高的旧 17342 ms floor。
- POSIX15 预算预测（含 60000 ms 余量）：1130998 / 1200000 ms，余 69002 ms。
- Windows17、2 worker 预算预测（含 60000 ms 余量）：1795777 / 1800000 ms，仅余 4223 ms。没有扩大预算；这只是规划估算，不是 hosted 成功、Full 完成或可合并许可。

## 复现与收据

单文件采证入口：

`node docs/evidence/m7-colorless-description-ci-20261110/measure-file.mjs tests/<文件>.test.mjs <新标签>`

已注册的外层合同从 `tests/ci-complete-calibration.test.mjs` 自动导入；也可独立执行 `node --test tests/helpers/colorless-description-ci-contract.mjs`。计时/观测整理入口 `update-planning.mjs` 只接受完整成功且输入稳定的收据，不改旧 floor；`build-ci-proof.mjs` 用 Git 基线重建精确投影。

`complete-process-observations.json` 指向每个原始 receipt、压缩 TAP 和前后输入清单及其 SHA256。`planning.json` 保存当前预算。`final-file-hashes.json` 保存交接冻结时文件摘要（不含自身）。本目录不包含独立审查结论；独立审查由父任务另行完成。

## 公开副本的环境路径脱敏

本目录公开的是原已完成观测的路径规范化副本，不是重新执行结果。云工作目录前缀替换为 `<cloud-workspace>`，Node 安装位置替换为 `<cloud-runtime>/node`；仓库相对路径、文件数量、工具与源码字节身份、测试数量、状态、时间戳和耗时全部保留。每份输入归档与收据注明原件 SHA256，`publication-transform.json` 列出原件到公开副本的逐文件摘要及变换类别。原件仅保存在私有证据归档中，不随公开 Git 历史发布。

`final-file-hashes.json` 是原始私有测量冻结的历史身份，不能当作当前公开副本摘要。具有原件访问权的审查者可运行 `node docs/evidence/m7-colorless-description-ci-20261110/sanitize-public-evidence.mjs --verify`，逐字节重现并核对转换。没有私有原件的读者可核验公开文件摘要和转换规则，但摘要本身不能证明隐藏原件的内容。原测量采集器保留原样，未来执行仍须先私有保存原件，再经过明确的公开转换。

## 后续旧消费者接线修复

上述公开路径转换和 `publication-transform.json` 对应首个公开提交 `45473f7ffe38399a98de46653ea17c1b1e3fe0b4`、树 `631fdf5ee48c55f50fa6708ade03e353e8f9f7d8`。转换脚本的 `--verify` 应在该历史 checkout 中使用具有授权的私有原件执行；后续 CI proof 变更不属于原转换，不能重写原映射或声称是再次执行原测试。

本次另修正 Defect/Silent 两个 live-owner case：只有该 case 局部使用当前公开 epoch 与当前 owner 集合，原冻结 50/49-owner 合同、历史数量及所有漂移/缺失负控不变。CI proof 对这两个测试各增加完整字节到 `ab65ed3` 原源码的逆向绑定，既有九条绑定原样保留。两项 filtered case 均先精确复现 Colorless owner 身份失败，再各 1/1 通过；相关 CI 来源、历史 floor 与 inventory 合同按名称选择 9/9 通过。没有重跑整文件或 Full，上文 81/81 是先前候选的历史结果，不是此次补丁的新完整回归。Defect/Silent 原正式规划下界 13784/10937 ms 与全部预算保持不变；filtered 进程耗时不作为新完整文件测量。

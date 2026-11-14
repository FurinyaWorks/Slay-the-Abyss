# CI修复与SDK输入等价独立复审

结论：**通过，无阻断**，限定来源collector/binding与运行输入等价验证器。本复审未实现这些文件，未修改产品或启动SDK/桌面；完整144+相关回归仍由作者执行，未把下列定向结果冒充完整suite。

| 最终文件 | SHA-256 |
| --- | --- |
| tests/helpers/generate-sts-style-source-epoch.mjs | 9afd1071889e2613b362e82b45f16736930cfc933f079d418fcb9389e6ec4b64 |
| tests/helpers/sts-style-ci-binding.mjs | e88f8a68f1998a348cf872021ba0773e6bc4364d71bacf0ce77c4b630328b825 |
| tests/helpers/sts-style-ci-source.json.gz | 4dc022273fd7ca381b1de6bca1fdd1c9eb49ceb94df292d9e490b4ab2abc80f5 |
| tests/sts-style-source-epoch.test.mjs | 5f3203ebb1fa08733473fdbefc9f4d3be091a0a3efdb35fa3778a3a3065de61d |
| docs/evidence/sts-neow-reference-20261113/verify-runtime-equivalence.mjs | 5dc47827cbabb2691c9a678c1577e07b769aff77670953e9bb2ce325c79f29da |

独立运行collector `--check`，三归档重新收集逐字节一致；新CI档632971字节。生产档`cc47fd96…`、完整cb runtime档`10bf3b7d…`不变；closeout helper closure `031c4275…`及copy helper `d53c67e0…`已与修复前原件逐字节比对，未变。

CI层有精确57份完整before/after见证、12份fresh helper和855→864 Full清单。原scripts/tests/data范围外，仅显式加入`.gitattributes`、`config/ci-media-lfs.json`、`docs/legal/assets.json`与该verifier，不扫描全部docs。当前主题与JS布局仍被fresh认证；三份修复测试的原cb全文SHA保持。固定leaf只读archive并检查固定摘要，不含投影/授权策略，其自身不加入自身archive的引导信任边界保持明确。独立来源定向测试5/5通过，含实际库存、旧target保留和foreign/missing拒绝。

独立重放verifier机制控制13/13：两模式正例通过；空输入、空生成物、过期after、生成字节漂移、SDK字节漂移、非白名单输入、磁盘额外输出、缺场景、character错/空场景及未知mode均在对应断言拒绝。已核对stderr位置，失败不是工具启动/超时。控制使用完整658真实路径库存，但模拟生成物只证明机制，不冒充实际SDK验收。

实际输入也已独立复验两模式，输出与根证据JSON逐字节一致：

- `neow`：25生成物、two/four两份完整SDK分别53305246/53305247字节，SHA为`10a57d5f…`/`0ae2290c…`。
- `character`：25生成物、完整SDK53306522字节，SHA为`90296e9c9e16da43b71c577318c28ca3c31ea3266ff3ec75923244c84410a1cf`。366脚本和server/client树全部参与完整archive字节比较；observer注入保持`8ff8fc20…`，没有剥掉observer或只比Lua片段。
- 两模式before闭包均为`52b6582bfc5a1eb2507fd6aaa2ced4272db7bd521781ff5ef3d738cdf73c5731`，after均为`b1271f1897a41afb3e2eaa8759e812dfc2190c6e31228062e04e6b7a98cff563`。658路径库存完整且after逐项fresh，变化严格限check-license、ci-media-lfs、test-affected三个脚本与ci-media-lfs配置。

原三份捕获manifest与固定前驱`f34723b6d54b6153de8a333a8abcc77884737f8f`的Git原文逐字节一致，after manifest另存；不把新闭包伪称为原截图捕获闭包。根公开等价证据与独立结果的SHA分别为character `973ac69a…`、Neow `be668dd6…`。

私有复核日志、13项原始stdout/stderr、实际两模式结果、manifest恢复核对在`.artifacts/hud-independent-ci-review-20261113/`。另已只读根`remote-existing-content.json`（SHA `4801fa0e…`），其报告76路径/58原字节对象已在同公开远端f347；远端逐项API核验与LFS传输由根/存储负责人执行，不在本次独立重放范围。

此证明允许原SDK截图继续代表相同应用输入；它不是新截图、新官方ready或设备/GPU实测。

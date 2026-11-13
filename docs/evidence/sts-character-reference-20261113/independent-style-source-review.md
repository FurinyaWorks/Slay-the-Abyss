# StS来源续接独立复审

复审者`hud_audit`，未参与本轮来源框架/归档实现。最终结论：**通过，无阻断**。此结论限于来源身份、历史承接、薄dispatcher及其当前功能见证，不替代精确提交的远端CI或官方设备验收。

生产切片`a73043a738cd5c6d11b3f6a66ef7383cbd463c01`，完整前置`cb1eac63620b908d880b8a339ab834b1b533dfc1`。

| 最终归档（tests/helpers） | SHA-256 | 字节 |
| --- | --- | ---: |
| sts-style-source-epoch.json.gz | cc47fd96c79d7a604d2c5c269b012354d887762aecbe2990ac89fbf2ac74c1a9 | 195169 |
| sts-style-ci-source.json.gz | 3ae1599f14216ab2211e5f67b56fa416cb0fe2e16d52c252365b04ae636ade72 | 268717 |
| sts-style-prior-runtime.json.gz | 10bf3b7d960e4c02ae2d64e26d8d5f16824439b9396949973f08ccec1c9d9330 | 4216851 |

上述摘要已独立读回，并独立运行`node tests/helpers/generate-sts-style-source-epoch.mjs --check`，三档逐字节复收通过。旧gzip的`git diff --numstat -- tests/helpers/*.gz`为空；原903、四源`51034e9d…`、五源及CI纠偏前驱保持原字节/原摘要，不用新行为重写历史。

完整生产库存由347条前置路径扩为348条（347 Lua+配置）；外层23条登记路径逐Git blob验证前置与当前，未知/缺失/未登记漂移拒绝，收集后再读防中途变化。全部旧target原绑定保留，新增page_reveal在旧视图显式为null。实际投影逐次重新读取所有登记owner，不缓存授权。

**非Lua也有显式fresh见证**：CI归档完整before/after包含`data/presentation/ui_theme.json`和14份修改/新增JS布局、构建与测试入口（game-ui、两noncombat、official-assets/card-chrome/portraits/run、四份StS组件、v25-scene/character及test-lua）。独立逐份LF摘要读回均匹配；历史入口在物化cb前调用`assertStsStyleCiCurrent`，同时验证这些CI.files、完整Full清单和12份helperSources，不把当前主题/JS静默遮成历史。修改helper既有fresh摘要，也有完整before/after接续；首轮漏接combined helper的错误有失败记录，最终已修。

引导信任边界明确保留：`tests/helpers/sts-style-ci-binding.mjs`完整文件SHA为`a3ada9bfd336d269d0b31450719800b13d2977f69f4cc7364b329477296367c3`。该叶只读取CI归档并检查固定摘要，没有投影/授权策略；不把自身纳入自身归档，避免自引用。实际loader、collector、entry、runner、production proof、extension及相关旧helper全部在fresh helper闭包。生产detached依赖仅含其实际production proof/runtime/gzip等依赖，不伪造CI/archive自认证循环。

两旧12槽Lua全文及所有原断言保留。薄dispatcher仅同仓库根、精确两路径进入历史入口，隔离cwd不会递归。入口先认证当前完整来源，再校验旧Lua全文，物化完整cb可执行/文本输入，运行三个原builder后执行完整原Lua；准备与运行共用原总deadline。只读资源链接与安全临时目录清理已读审。独审发现Windows反斜杠guard/runner不一致，作者仅在helper补归一；app脚本与截图闭包未改变。

验证证据分开报告：

- 本复审独立运行最终`tests/sts-style-source-epoch.test.mjs`，5/5通过，覆盖真实完整旧target、当前raw owner、missing/foreign、helper fresh及清单负控。
- 已读回作者完整五文件来源suite日志：144/144、fail/skipped/todo均0，254736.9235ms。命令为`node --test --test-concurrency=1 tests/ci-complete-calibration.test.mjs tests/integration-source-epoch.test.mjs tests/defect-final-source-epoch.test.mjs tests/encounter-formation-source-epoch.test.mjs tests/sts-style-source-epoch.test.mjs`。未重复整套。
- 完整suite之后的唯一helper归一小修，已读回其最终style5/5和两个Windows路径原Lua全文PASS日志，11910ms/15432ms；旧deck保留全部5组。
- 日志位于`.artifacts/page-reveal-audit-20261113/style-final-{source-epoch-tests,helper-tests,windows-roster,windows-deck}.log`。
- 当前功能由真实`sts-character-browser`三项承接；最终SDK五图闭包`52b6582bfc5a1eb2507fd6aaa2ced4272db7bd521781ff5ef3d738cdf73c5731`另有本目录`visual-integrated`验证：共享五列十牌、详情/返回、无Run/RNG/初始卡组漂移。其图像与官方设备边界单独记录。

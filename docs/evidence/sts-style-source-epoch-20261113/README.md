# StS 共享呈现的完整来源续接

生产来源切片为 `a73043a738cd5c6d11b3f6a66ef7383cbd463c01`，前置为 `cb1eac63620b908d880b8a339ab834b1b533dfc1`。后者含已交付的共享顶栏、原位商人投影、卡组浏览器及其CI纠偏。归档只存源码与证明输入，不存场景执行结果。

## 新归档

| 文件（`tests/helpers/`） | SHA256 | 字节 |
|---|---|---:|
| `sts-style-source-epoch.json.gz` | `cc47fd96c79d7a604d2c5c269b012354d887762aecbe2990ac89fbf2ac74c1a9` | 195169 |
| `sts-style-ci-source.json.gz` | `3ae1599f14216ab2211e5f67b56fa416cb0fe2e16d52c252365b04ae636ade72` | 268717 |
| `sts-style-prior-runtime.json.gz` | `10bf3b7d960e4c02ae2d64e26d8d5f16824439b9396949973f08ccec1c9d9330` | 4216851 |

原903、四源、五源、CI纠偏及所有更早压缩档均未改动。新增生产层登记22个Lua与architecture配置，共23条路径；完整当前库存为347个Lua加配置，共348条。收集器逐Git blob核对完整cb前置和a730当前库存，并二次读取拒绝中途变化；未登记的源码漂移、缺源及多余文件均拒绝。

全部旧target保留原绑定，新 `stsStylePrior` 提供完整cb前置。新增 `abyss_page_reveal` 在旧target中显式为null，不伪造其历史源码。完整生产owner从原97变为104，每次投影均fresh验证全部owner；无授权缓存、无未知源码回退。

CI层保留全部原Full清单，精确增加9个StS回归文件。修改过的helper同时保留完整before/after源码，避免只验证当前hash却漏接旧版本。新的runner、entry、collector、投影器、来源loader及相关旧helper均在 `helperSources` 每次fresh认证；新增测试保持未知成本下限，不获得虚构的历史hosted时长。

固定信任叶 `tests/helpers/sts-style-ci-binding.mjs` 只负责读取archive并验证固定摘要，不含投影或授权策略；它不加入自己的archive，避免自引用。最终文件完整SHA256为 `a3ada9bfd336d269d0b31450719800b13d2977f69f4cc7364b329477296367c3`。所有实际策略均在上述fresh helper闭包中。

## 旧12槽与当前共享浏览器

`competition_roster_ui.lua` 与 `deck_browse_filters.lua` 原文和全部断言未改。`scripts/test-lua.mjs` 仅为这两个精确路径增加薄dispatcher，同root才进入历史入口，隔离目录不会递归；helper同时接受Windows分隔符。

历史入口先验证所有当前生产owner、完整CI来源和Full清单，再校验原Lua全文摘要，物化完整cb提交的可执行/文本输入。它运行原 `build-lua-data`、`build-ui`、`build-ui-theme`，再执行完整原Lua。准备和执行共同受原总deadline约束；只读art、依赖、helper及fixture资源不写回工作树。原12槽正向断言仅描述这个明确历史视图。

当前功能由 `tests/sts-character-browser.test.mjs` 三项真实Host回归承接：共享五列浏览器、36牌完整计数、只读投影、局部UID、无新Run/RNG、原生owner、控制器排序/详情/返回、陈旧输入失效与真实ready边界。未删旧测试来迎合新UI。

## 本轮验证

- 四个完整旧来源文件，加新StS来源文件：144/144通过，0跳过，254.7秒。命令为 `node --test --test-concurrency=1 tests/ci-complete-calibration.test.mjs tests/integration-source-epoch.test.mjs tests/defect-final-source-epoch.test.mjs tests/encounter-formation-source-epoch.test.mjs tests/sts-style-source-epoch.test.mjs`。
- 其后独审发现仅测试runner未归一Windows反斜杠。修复后新StS来源5/5再过；两份Windows路径完整旧Lua分别11.91秒、15.43秒通过，后一份保留原5组全部断言。原总deadline未变。该小修不改变生产档、前置runtime档或旧target。
- 当前starter browser三项真实Host回归通过。此前来源首轮139项曾124过/15败，完整失败日志保留；遗漏的helper before接续已修，不改历史hash或原断言。
- 原始日志位于本机 `.artifacts/page-reveal-audit-20261113/`，主要为 `style-final-source-epoch-tests.log`、`style-final-helper-tests.log`、`style-final-windows-roster.log`、`style-final-windows-deck.log`。归档读回用 `node tests/helpers/generate-sts-style-source-epoch.mjs --check`。

上述日志的完整gzip副本及首轮失败日志已保存在本目录。`summary.json` 记录每份附件摘要、完整144项运行时的CI档身份及其后小修的定向验证，避免将不同轮次混称同一轮。最终collector读回全部通过；完整CI来源45项，fresh helper12项，Full清单855→864，所有旧tracked gzip差异为空。

本报告只证明来源、回归与历史承接；独立审查、精确提交SHA的CI、最终SDK截图及官方设备结果分别报告，不互相替代。

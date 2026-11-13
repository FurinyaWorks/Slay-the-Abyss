# CI 来源接续独立复审

复审者：hud_audit。未参与本次 CI 来源接续实现；本复审不作为本人 HUD 组件实现的独立复审。

结论：未发现阻断项。

- `run-hud-ci-source.mjs` 固定完整压缩归档 SHA-256；每个 before/after 同时核对完整源码 SHA-256 和 Git blob，并递归冻结。仅路径与规范化后完整源码匹配才接续，未知源码保持原样，不按片段改写。
- inventory 只在完整 after 集合及新增测试源码均匹配时还原 before。重复、外来文件和新增测试源码变化有负控。新增 HUD 回归仍属于真实 Full inventory，两个平台沿用 unknownMs，没有伪造历史时长。
- `ci-complete-calibration.test.mjs` 对比 903bf 基线，原断言保留，仅包装已命名历史读取/发现入口并追加当前源码与负控合同。
- 归档收录项没有 `src/lua` 或 `config/architecture.json`，没有在生产源码 owner 的新鲜性认证之前替换生产源码。
- `integration-source-epoch.test.mjs` 对商店/卡组接续新增完整前任、未知漂移、缺失 owner、owner 修改、收集期间变化以及隔离目录 LF/CRLF 负控。原断言保留。
- 903bf 至当前的既有冻结来源/CI 压缩归档没有改写；该范围唯一新增来源归档为商店/卡组接续，HUD CI 归档为本轮新增文件。

独立执行：`node tests/helpers/generate-run-hud-ci-source.mjs --check` 通过，归档 280270 字节，SHA-256 `4df0e5e15e03a44d841cfd047b065c1e7269edcc41b0c21ea5b11020feb3c1e1`。此命令只读重算，没有重写归档。主线程负责完整测试结果记录。

## 药水运行时颜色修正独立复审

复审者未参与主线程的颜色修正实现。结论：无阻断项。

`abyss_potion_discard_ui.lua` 单行改动与战斗 `paintPotionContents` 使用同一优先级：`icon.potionTint[id]`，否则火/普通 shell ink。不存在新增 profile 限制；基础主题已有 tint 表，派生主题继承，Lua 构建递归转换颜色为 r/g/b/a，缺表/缺项仍有原 fallback。没有改变库存、使用行为、目标或输入 owner。单行修正保留原静态检查行号。

新增测试将正式主题颜色经真实 `colourToLua` 转成 RGBA，再执行真实 Lua 刷新，逐通道验证当前图片的 tint；稀疏场景包含火、力量、能量，仍覆盖三/五槽与多次切页。旧图片/可见性断言保留。独立运行 `node tests/official-run-chrome.test.mjs`：10/10 通过。

## 最终五 owner 与双归档读回复审

结论：无阻断项。前文 `4df0e5e…` 为初次 CI 接续归档的历史复审结果；最终交付采用下列完整 digest，不以旧 digest 冒充最终字节：

- 生产五源归档 `shop-deck-source-epoch.json.gz`：`94d6f85a83a1593bbbaf34ae13986ddfbca97312e183b4e7f6b08ca58b8d911b`。
- 最终 CI 接续归档 `run-hud-ci-source.json.gz`：`fa385b20797f37ca5a8c0a406d6ecdad6b4c0539c27a825e751b7eadeb4f5408`。
- 原 PR639 四源前驱完整保留为 `shop-deck-four-source-epoch.json.gz`：`51034e9da34cbe0ab153f00ab66a16918db1097ef7173932ab326cc6c2076f2b`。原 `903bf` closeout 压缩档仍独立保留。

最后只读核验包括：重新调用生产 collector，收集内容逐字段等于五源归档；恰有 deck、merchant、game_ui_input、node_ui_feedback、potion_discard_ui 五个 owner；非列入源漂移与收集期间变化检查仍在。closeout 显式验证五 owner 列表和每个 `903bf` 前驱绑定，再建立独立 `shopDeckFourPrior` 视图，未覆盖四源前驱历史。

实际投影第五个 potion owner 到四源前驱与原完整源码一致；将该 live owner 改为缺失会触发 `linked owner identity`，没有使用归档文本补缺失源。closure 中五源归档、四源前驱和 closeout 模块的散列均与磁盘一致。

CI collector 现显式限定24个 reviewed paths，最终运行时再次验证 schema、LF规范化与固定基线。读回24个 after 绑定均匹配本轮完整源码，追加未知换行仍原样拒绝投影。未新增 `src/lua` 到 CI 投影路径，没有绕过生产 owner 的新鲜性认证。本轮最终复核未重跑已通过的71项/10项完整测试，也未修改归档或生产文件。

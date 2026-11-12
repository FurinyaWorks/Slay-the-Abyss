# 原生 Lua API 检查的字符串与注释边界

基线 `3a061a76b5eb917ac0f4213c01a9cbafd28d1824`。接续 TASK-86 的候选完整性维护；`task:pick` 返回 ALLOW，但当前 Backlog CLI 不可用，未改任务状态、负责人或 AC。

## 缺陷与修复

原检查先用正则删除注释，再删除字符串。因此 `local text="--"; io.open("x")` 中真正执行的 `io.open` 会被错误删除；包含 API 名称的合法长字符串又会被误拒绝。

复用已安装、已锁定的 `luaparse 0.3.1`，按 Lua 5.3 词法顺序区分字符串和注释，保留词元之间的空白。原禁用 API 规则、语法回调和批量写入逻辑不变。回归明确检查拒绝后不生成输出、不修改输入存档。这是词法检查修复，不是完整 Lua 沙箱或间接调用分析。

独审发现当前历史诊断也需接续：原守卫现在先拒绝新改的 `native-script-batch.mjs`，而非原预期的 backdrop。只调整当前诊断的首个拒绝路径，继续核对完整错误、实际摘要和冻结预期摘要。没有修改历史档案、helper、来源投影、CI 配置、依赖或测试文件数量。

## 验证

全部为本地 Linux、Node 24.22.1；不冒称 Hosted 的 Node 24.18.0 或原生 Windows。

- 原始 RED：batch 2/3，漏拒绝真实 `io.open`；直接复现同时记录合法长字符串被误拒绝。
- 最终 batch、candidate-scripts、native-client-check 三文件 **15/15**。其中 batch 的 3 项包含 13 个字符串/注释样例、坏语法与无写入断言，不重复累计。
- 候选及 BGM 构建入口两文件 **29/29**，使用既有 mock 工具链，不是官方导入。
- 对所有 **345** 个生产 Lua 文件比较前后验证结果，无变化。
- 独立探针 **64** 个词法样例和 **9** 个回调/坏输入边界通过。
- 独审来源合同首轮 **23/24**，失败原样保留。修正上述当前诊断后，完整 art-feature + beta-integration **20/20**、另完整 beta-delivery **4/4**，两批不重叠。单独诊断 1/1 包含在这 24 项内。
- 完整 1,268 份 JavaScript 语法、diff、guidance、Backlog 和 network 检查通过。宽相关选测仅生成计划，未运行 Full。

源码身份见 `source-identity.json`，证据摘要见 `SHA256SUMS`。最终源码差异 SHA-256：`137a30c17a426cedaa5069d765cd5df682aa4ce368aaaa140e33b1e8744ec643`。

## 复现

在仓库根目录运行：

```sh
node --test --test-concurrency=1 tests/native-script-batch.test.mjs tests/native-candidate-scripts.test.mjs tests/native-client-check.test.mjs
node --test --test-concurrency=1 tests/native-candidate.test.mjs tests/native-bgm-build-provenance.test.mjs
node --test --test-concurrency=1 tests/art-feature-source-inverse.test.mjs tests/beta-integration-source.test.mjs
node --test --test-concurrency=1 tests/beta-delivery-composition.test.mjs
node docs/reviews/native-lua-lexical-guard-20261112/lexical-probes-portable.mjs .
```

## 交付边界

此目录保留首轮失败、修后通过及独审记录。当前 `gh` 未登录，不能执行原 `merge:auto` 身份握手；不通过其他入口绕过。PR 保持 Draft，正式精确 SHA CI、独审准入授权、正常队列和合后验证仍待。没有重复 Full、官方导入、新官方 ready、实体设备或发布验收。

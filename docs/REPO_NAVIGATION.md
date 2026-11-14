# AI Agent 代码导航与目录治理

这是面向多 Agent 协作的**渐进式导航入口**，不是“每个目录必须少于 20 个文件”的规定，也不是目录迁移完成的证明。最高协作约束见 [AGENTS.md](../AGENTS.md)；状态归属与依赖边界见 [领域架构](ARCHITECTURE.md)。

## 30 秒定位

```bash
npm run repo:where                   # 可查询的业务领域
npm run repo:where -- combat         # 领域对应的源码与测试锚点
npm run repo:where -- 拖牌           # 中文检索
rg --files src/lua scripts tests | rg 'battle|combat|card'
rg -n 'targetSymbol|require\(' src/lua scripts tests
```

机器可读取的职责路由在 [config/repo-navigation.json](../config/repo-navigation.json)。**其中列出的文件是跳转锚点，不是该领域所有文件。** 先定位职责，再查调用关系、状态写入者和真实测试，不能照文件名前缀盲改。

## 已核实的结构约束

| 路径 | 发现方式 | 直接迁移到子目录？ |
| --- | --- | --- |
| `src/lua/` | `scripts/native-candidate-scripts.mjs` 第一层扫描 + `scripts/test-lua.mjs` 的扁平 `LUA_PATH` | **不能**：先升级模块发现、模块身份与候选打包 |
| `tests/lua/` | `scripts/test-lua.mjs` 第一层 `*.lua` 用例发现 | **不能**：`helpers/`、`support/` 为已存在的辅助代码，不是自动运行的用例 |
| `tests/` | `package.json` 与 `scripts/ci-shards.mjs` 只发现根层 `*.test.mjs` | **不能**：嵌套后可能不执行测试 |
| `scripts/` | npm 命令、工作流、相对 import、生成输入清单 | **可逐簇评估**：先更新全部路径/构建合同，不能整包盲移 |
| `tests/helpers/`、`tests/fixtures/` | 辅助代码、历史快照与向量 | 可按职责组织，必须保留来源和引用 |
| `data/`、`art/`、`docs/`、`tools/` | 已有部分业务子目录 | 保留可用结构，不按文件数强制再分层 |

文件数量由 `repo:where` 的 `--check` 模式动态统计；**数量仅用于观察，不作无依据的硬门槛**。当前可强制的高价值规则是：Agent 不能加入构建器发现不了的运行时 Lua，也不能把测试放到现有测试选择器扫描不到的子目录。

## 新增文件及迁移合同

1. **按业务定位**：先用 `repo:where`、`docs/ARCHITECTURE.md` 和依赖图确定所属领域；优先扩展已有模块，不创造第二个状态提交者或通用 `utils` 大桶。
2. **Lua 新模块**：当前继续平铺在 `src/lua/`，保持 `abyss_*.lua` 模块身份；新模块登记 `config/architecture.json` 并经候选打包、负载检查验证。
3. **独立测试用例**：Node `*.test.mjs` 放 `tests/` 第一层；Lua 运行用例放 `tests/lua/` 第一层。辅助代码可进 `tests/helpers/`、`tests/fixtures/`、`tests/lua/helpers/` 或 `tests/lua/support/`；不要让 CI 悄悄漏测。
4. **scripts**：内部工具优先使用已有职责子目录；公开构建入口保持稳定。迁移时检查 Node import、package 命令、GitHub 工作流、代码中的路径字符串、测试/生成物身份。
5. **真实迁移步骤**：先补递归发现和模块名映射的反例测试，再迁移一个业务簇；比较完整 CI、快速测试选择器、候选打包收据、原有加载与回滚行为；不得偷改玩法或放宽质量门禁。
6. **保持索引可用**：修改或删除索引锚点时同步 `config/repo-navigation.json`，运行 `npm run check:guidance` 和定向测试；不自动刷新历史基线。

## 成熟实践与取舍

依据：
- [OpenAI Harness Engineering（2026）](https://openai.com/index/harness-engineering/)：短指引作为地图、知识渐进披露、依赖不变量用结构测试守护，Agent 不靠一次性提示词记住约束。
- [Node.js 原生测试运行器](https://nodejs.org/api/test.html)：Node 原生支持测试目录的递归发现，但**当前仓库**明确用 `tests/*.test.mjs`、自有 CI 分片和选集，不可假设默认行为已启用。
- [Lua 5.3 官方模块规范](https://www.lua.org/manual/5.3/manual.html#6.3)：`require` 的模块名由 `package.path` 搜索规则决定；静态工具发现子目录不等于正式游戏加载或千星打包支持子目录。
- [GitHub Actions 工作流路径过滤](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)：路径匹配与工作流运行是独立合同；重命名后必须审查匹配范围、文件选择及结果收据。

技术裁决：复用现有 Node 标准库、`node:test`、`rg` 搜索、已有 Lua AST 架构检查与 CI，而不是为了目录拆分再安装 Nx、第三方依赖图服务、另一个测试框架或新 CI 流程。现有质量门禁已约束不少真正的耦合，新增一个大型脚手架的维护成本高于收益。

当前首个试点选择**无需重排生产源码**的领域导航 + 扫描闭合测试；真正目录移动另立独立小批 PR。验收必须证明：搬迁前后源码内容/RNG/回滚语义不变，运行时模块与测试清单不减少，原生候选和质量收据可比较，且不靠跳过历史测试。**禁止因为“文件数量多”本身把 CI 设红灯，也不得静默修改历史来源身份。**

这一机制解决的是**Agent 导航和结构防误改**；缩减数百个扁平文件的物理迁移应独立、可回滚、不影响当前发布。

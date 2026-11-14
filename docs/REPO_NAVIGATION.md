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

这一机制解决的是**Agent 导航和结构防误改**；缩减数百个扁平文件的物理迁移应独立、可回滚、不影响当前发布。

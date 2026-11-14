# Lua 源码局部说明

所有可打包 `abyss_*.lua` 目前保持平铺：`scripts/native-candidate-scripts.mjs`、`scripts/test-lua.mjs` 和历史路径合同仍假设第一层源码。不要为美化目录擅自移动，或改变 `require('abyss_*')` 模块名。

先运行 `npm run repo:where -- <业务词>`，再读 [导航与迁移合同](../../docs/REPO_NAVIGATION.md)、[职责架构](../../docs/ARCHITECTURE.md) 和 `config/architecture.json`。新增模块必须分类；状态写入遵守 Run/Combat 责任边界。重构必须保留 RNG、事务回滚、UI 只读约束和原有测试语义。

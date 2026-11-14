# 测试局部说明

当前 `npm test`、CI 分片仅发现 `tests/*.test.mjs`；Lua 执行器只发现 `tests/lua/*.lua`。新增独立测试先保持平铺；`tests/helpers/`、`tests/fixtures/` 和 `tests/lua/helpers/` 用于辅助代码/证据而非隐藏测试。

按 [导航与迁移合同](../docs/REPO_NAVIGATION.md) 找到对应产品入口，确保新增断言确实被现有选择器发现；改发现器或目录时必须补反例测试，不能因测试数量减少而宣称提速。

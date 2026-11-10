# PR #588 原生官方装饰的默认布局兼容修复

基线为 `20a23f0095ed3f82020f0ccfb13bca3de617ac73`。本轮仅离线源码/合同验证，没有 GUI、GIL、官方导入、ready 或设备验收。

## 原因与修复

- [Quick 42780885802 / job 129710376316](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42780885802/job/129710376316) 的 225 项 JS 已通过；Lua `growing_card_text_slice_4.lua` 因默认生成卡面没有 `nativeBannerRight` 而失败。原始日志为 `quick-failure.log`，本地基线复现为 `local-before.log`。
- `abyss_battle_card_view.writeFrame` 在检查返回值前无条件查找官方专属半幅旗帜；同文件 `writeSkin` 对 `nativePlayableRim` 存在同类问题。保留严格 mock，不伪造控件、不改变其查询语义。两个访问仅在既有 `Theme.presentationProfile == 'official-assets-first'` 下发生；该配置要求真实控件存在，缺失即断言失败。
- 默认数据本身也含 `officialAssets` 配置，因此不能仅判断该表存在。生产只新增正确的 profile 边界与必要控件断言，不改素材、布局、Lua 规则/RNG/输入事务或 #582 生命周期。
- 原来源归档不变；新增 `tests/helpers/official-banner-source-epoch.json.gz` 是一份完整单文件前后源码证据。`beforeCommit` 绑定上述真实基线，`afterCommitRole` 明确为受审工作树源码，不伪造已发布提交。压缩字节、解压字节及两侧源码各有 SHA-256；before 完整源码必须等于原 alignment 的 after，随后才接续原完整来源闭包。

## 验证

所有时限、预算和原断言保留，不新增测试文件或重跑整套 Full。

- `growing-slices.log`：原失败 slice4，以及 growing_card_text、slice2、slice3 全部通过，共 10 个原用例。
- `runtime-contract.log`：完整 `tests/official-assets-runtime.test.mjs`，4/4 通过。原十牌双敌/拖放/取消/回合、C档/弹窗/胜利回图两例保留；追加真实默认与官方生成布局，四档稀有度，默认不查官方子控件、官方两半同色；删除 nameBand/nameRule/art 或官方 banner/rim 均必须失败，恢复后重绘成功。
- `closure-and-mocks.log`：完整来源及 mock/生命周期文件 23/23 通过，包括每个晚期关联来源漂移/删除拒绝、实际失效控件与 Controller 清理负控。五份真实 mock 一字未改。
- `legibility.log`：7/7 通过，保留官方费用、文字与几何合同。
- `syntax.log`、`guidance.log`：通过。
- `banner-contract.log`：保留开发中首轮新用例失败；严格查询揭示第二处 nativePlayableRim 缺陷，另一失败来自测试修改了原始数据而非 Combat 的独立 catalog，测试已改为每个独立进程的战斗 catalog。没有将失败删除或当作最终通过。
- `source-closure.log`：首次来源检查 18/18；最终版本复验以 `closure-and-mocks.log` 为准。
- `lua-static-missing-tool.log`：首次缺固定工具；随后复用本机已有 Luacheck，SHA-256 `d68da17fca0697d9e2fb04201f3884abd259fa558b3a449bccaed47f1390defc` 与 `config/lua-tools.json` 一致。最终 `lua-static.log` 通过：无新诊断，14 条明确历史告警；2106 项治理测量满足原门槛。

Backlog CLI 不在 PATH 且共享依赖没有其可执行文件，本轮未改任务文件、未创建新任务，沿用 TASK-103。远端实施前及本地交付前均读取 HEAD，仍为 `20a23f0095ed3f82020f0ccfb13bca3de617ac73`。没有 push、合并、强推、改历史或降低门禁；#582 依赖、既有 merge ancestor 导致的 Full 历史阻塞、原生验收缺项保持未完成。独立审查及最终发布由协调者另行完成。

## 独立增量复审

协调复审独立隔离验证两种真实生成布局 2/2，并将旗帜/边框的 profile 条件分别强制为 true/false，四个语义回退全部失败。原始错工作目录调用单独保留，不算测试执行。完整审查及来源守恒见 `independent-review.json`，原始日志和变异脚本以 `independent-` 开头。该结论仅覆盖本次增量，不是整 PR 或当前 hosted 合并准入。

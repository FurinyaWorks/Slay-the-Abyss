# 单主角版本集成取证（2026-11-14）

本轮只集成岩系旅行者前两幕相关成果。没有修改可玩角色准入，没有纳入其他角色的储备分支；完整历史源码及其后续审批保持原状。平台导入、ready、手机、正式容量及发布验收均未在本轮执行。

## 固定来源

| 来源 | 完整 HEAD | 本轮去向 |
| --- | --- | --- |
| #643 共享 UI、菜单与任务门禁 | `96219b31e628709d50d31255f74221fab6f91dc3` | 上游协调者独立负责实际合入及合后验证；本组合完整接续其源码 |
| #652 宝箱说明与背景 | `a98a4d8389f4776753da5fb2f21245c13f12f9b3` | 完整纳入关键词、关联说明、文本容量和原生背景 |
| #653 任务登记 | `43bd197879b8193415b1a1cfdf7aa32da3d350c1` | 保留原任务及原容量依赖，新增对应里程碑投影 |
| #654 敌人与遗物简图 | `181e4cde61532e13bac912119aca3dc503a4170b` | 保留 42 种敌人、88 件遗物、旧精绘和素材登记 |
| #655 商人对白分页 | `9e554e68fa6b01c32e968f2975e87a774e0c4dc9` | 完整接续原分页和生命周期回归；人工及设备阅读验收仍待 |

上述原提交在本地组合历史及完整恢复 bundle 中保留。发布组合须从 #643 实际落地后的最新 develop 建立同树单父提交，再绑定精确 HEAD/BASE；本地合流提交不替代线性历史准入。

## 冲突取舍和实际修复

- 素材登记按条目合并，来源摘要不变；四张新增 PNG 已独立读回。
- 共享 StS 展示与 lowcost 图像接线同时保留；主题仅叠加宝箱 rewardList 的四处布局字段。
- 架构同时保留 page reveal、低图元绘制及商人分页模块。没有通过删模块、放宽复杂度或跳过断言解决集成失败。
- 宝箱两个来源合并后，`renderRow` 的 CC 为 16，原上限 15 真实拒绝。仅将原两条图像语句提成 `renderPicture`，参数、调用顺序及行为保持；工程复验通过。

## 精确来源合同

生产固定源为 `a3f0295829eda4e7e342e1edab69fa892606d63a`；之前完整候选 `cd2ff444a3de3ae78fda3c82163bf870e850e97d` 已取得独立增量复审。

- 350 份完整生产来源，14 个本轮变更 owner；55 个旧 target 原有记录逐条不变，新模块历史为 null。
- 原 105 owner 合同保留为历史断言；当前 112 owner 的读取顺序、缺失、漂移及未知输入检查均保留。
- 当前 Full 原始发现仍包含 872 个 JS 文件和 1420 个 Lua 文件。历史清单投影只服务固定旧收据，新增测试仍在当前 Full 中执行。
- 测试辅助依赖经完整复制闭包登记；生产源码认证不使用 CI 文本投影。只复用已冻结的完整源数据，不缓存 owner 授权或实时读结果。

两个版本化生成器默认 `--check`；`--write` 才重建当前包，不改原历史归档：

```powershell
node tests/helpers/generate-release-source-epoch.mjs --check
node tests/helpers/generate-integrated-ci-source.mjs --check
```

生产归档 SHA256：`365dc664152b6446d67519d42037ef8e717de8fdd5fe512144c0dcd4145f06aa`。

## 验证边界

工程检查通过：349 模块、1978 边，6144/6144 测量，2185 项职责门槛，无新增 Luacheck 诊断，保留 14 项历史警告。Backlog、指引、语法、许可证及日常平台负载检查通过。日常负载报告仍保留相对旧基线的增长警告，离线字节和控件数量不代表官方容量。

完整当前负载离线规划为 Windows 1751564 ms、POSIX 1186961 ms，分别低于原 1800000/1200000 ms 预算，原 reserve 不变；这些规划不代表 Hosted Full 成功。

冻结提交 `cd2ff444` 的两个生成器均逐字复现；最后 11 个受影响套件 167/167 通过，零失败、零跳过，包含功能、来源复制、完整清单、预算及 112-owner 鲜读/缺失/漂移回归。

静态复核再补齐 Defect-final、Watcher 与 Room 的旧 raw 固定数量合同；历史集合不变，当前集合逐项纳入两个新增模块。追加的 5 套件 62/62 通过，零失败、零跳过，日志为 `integration-next-current-corpus-final.log`，不与前轮重复用例累加冒充总数。

本轮原始本地日志保留在仓库根 `.artifacts/`：`integration-next-engineering-final.log`、`integration-next-owner-one.log`、`integration-next-source-stable.log` 及最终同提交复验 `integration-next-cd2ff444-final.log`。此前失败、取消及本地临时堆限制触发的 OOM 均保留，不计为通过。最终合并还须精确 HEAD/BASE 的正常 CI、原生队列及独立 develop push Full。

独立复审链：`independent-agent:/root/review_integration_fix/release-production-0eac1d3c` → `release-complete-d2aa7800` → `release-final-cd2ff444`。官方与设备 AC 不因本轮集成或源码检查而勾选。

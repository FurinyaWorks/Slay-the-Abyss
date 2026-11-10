# PR #579：同树历史修复与离线报告纠错

## 两个分开的步骤

1. 历史接续提交 `b6a9c9e407118b90177440c9950397bab5dfb608` 将原 PR 完整 tree `9f674fb31a92f98f5fac129f0c2a29ab3c7841de` 原样接到 develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。旧 base `c35d67e9` 与 develop 的完整 tree 均为 `cdb2dd66f12349f09937b0bc5f5e9ceaf0ec873d`。原 232 项文件差异不变，旧 head `062a5776` 在 `preserve/pr579-before-reanchor-062a5776` 可恢复；使用精确旧 SHA 租约更新。GitHub 由冲突变为 mergeable，不等于合并准入。
2. 后续新独审发现，离线报告把 `ok=false` 的失败出牌也统计为实际出牌。真实 M3 在成功断言前记录动作，故这是可达报告错误。仅为 `played` 增加原动作成功条件，失败 action 和阻塞理由仍保留；不改游戏 Lua、规则、RNG、原驾驶器策略或其他统计。现有测试文件新增失败单项、混合动作及汇总回归，原断言保留。

## 本轮验证

- 四个完整边界/职责/来源文件 **13/13**。
- 七个 CI 合同首轮 **151/152**，唯一失败是本地原 UI 生成物尚未构建。执行原 `npm run build:ui` 后完整 calibration **53/53**，因此 152 个不同 CI 用例都有通过结果；首轮日志保留，不累计重复覆盖。
- 新报告测试在旧实现 **7/8**，修复后 **8/8**，完整文件 Node 时长约 0.733 秒；保留 RED/GREEN 原日志，不降低 unknown 成本或改登记预算。
- 完整工程采集、guidance 和 verify:backlog 通过。首次 guidance 缺 sparse checkout 的原 `.cursor` 文件，准备原文件后通过，失败记录保留。Backlog CLI 不在 PATH，未编辑任务、owner、状态或 AC。新的自主领取仍 HOLD，本轮只接续已有 PR。
- 原源码树鲜采 **338 模块、5613/5613测量**；最大 SCC **66/11/2**，大环506引用/317依赖对；CC>30 **32**、>15 **208**、最大61、14项旧告警。与当前 develop 比，大环68→66、CC>30为33→32，这是原 Stasis/Wheel 实现收益，不是本轮历史修复新增降幅。报告修复不改 Lua，不能把它当架构指标变化。

## 审查与限制

历史 source review JSON 的文件hash已逐项审计，但原 reviewer 会话来源未能独立取得，所以不能仅用那些 JSON 授予整片独立审查通过。本轮已重新完成 59 个执行/配置路径的新独立源码审查，结论 PASS、无未解决发现，不继承旧 JSON 的批准。`fresh-source-review.json` 与 `fresh-source-coverage.json` 绑定具体文件摘要；另独立核对四份冻结 Lua、22 项 CI 前驱、六份原始成本证据，并对 54 个 owner 执行 108 项暖调用漂移/删除负控。最终提交身份仍需外部精确重绑，源码审查不代替 Hosted 或合并准入。

未重复本地 Full、战役长跑或真实设备验证。新 HEAD 必须使用本身的 Hosted Full、精确 HEAD/BASE 独立审查、原 `merge:auto` / 原生队列和合后检查。正常推送导致的旧运行被替代不等于新头通过；保持 Draft，未操作 Ready、Auto-merge、保护、版本或游戏发布。

日志与摘要按本目录 manifest 的 Git 原始字节核对；现有 `docs/reviews/** -text` 属性保留跨平台原字节。工程采集及来源/CI日志绑定历史接续的原 source tree，报告 RED/GREEN 绑定随后的两文件修复；不能把前一轮扩大成后一轮 Full。

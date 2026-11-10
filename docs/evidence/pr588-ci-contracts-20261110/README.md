# PR #588：当前美术切片的 CI 合同接续

基线：`5b3e9f11a25211173a3710d570ca8e4c22664d25`，`develop` 为 `1eb288472d7b33b7450eec97a624ca2ffa526f39`。

本轮仅修复测试合同并保留原始失败证据。生产 Lua、素材、布局、默认主题、游戏规则及此前 GIL 均未改动；未操作用户 GUI、未重跑 Full、未改变门禁或合并。

## 原始失败及修复

正常 [Quick 42761531123](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42761531123) 的 253 项中有 3 项失败，原始日志保留为 `quick-42761531123-original.log.gz`。

1. `official-assets-legibility` 仍要求旧深色 107202 费用盘上的浅色 `#FFF8E7` 字。当前候选已换为 107270 和深色 `#403829`。现在绑定完整素材/字色配对、所有卡牌宿主的未染色圆形底图，以及默认主题不被修改；原按钮浅字断言保留。现有真实 Host 测试还调用实际 CardSkin，检查中性、降费、加费、能量不足、其他不可用状态及恢复后的字色和方向。
2. `seven-refactor-source-epoch` 的两个历史测试直接把当前视觉代码与旧组件时代字节比较。新增独立测试用来源档案，绑定已提交 `a0c2dc558b2a37f26678dc104bb98df194b0f2d8` 与 `5b3e9f11` 的四份完整文件：`abyss_battle_card_view.lua`、`abyss_card_skin.lua`、`abyss_game_ui_view.lua`、`abyss_traveler_portraits.lua`。档案、解压内容和每份完整源码均校验 SHA-256；输入及关联读取使用相同精确投影。原 component/seven/combined 档案及历史断言不变，未知或部分修改原样传回并被原来源校验拒绝。

这不是放宽历史来源身份，也不是新素材像素对比度或官方画面验收。

## 本轮验证

环境：Linux x64，Node `24.22.1`；不是 hosted CI 固定 Node `24.18.0` 的结果。

- 本地原始失败：费用 5 通过/1 失败；两个历史目标均失败，日志保留。
- 费用与真实 Host：9/9 通过，包含真实十牌双敌、拖牌、取消、回合、C 模式、胜利和奖励返回。
- 完整来源时代测试文件：18/18 通过。随后将新增晚期变更/删除回归扩展到全部 68 个关联来源，只重跑该项，见 `source-closure-final.log.gz`。
- 相邻素材构建/旧 V25 费用轮廓/值反馈：12/12 通过。
- 独立复核：八份完整旧/新源码均匹配 Git 提交；68 个完整闭包来源的晚期变更及删除均拒绝。隔离负控恢复旧浅字、旧费用图、移除动态费用语义，分别被对应断言捕获。
- `check:syntax`、`verify:backlog`、`check:guidance` 通过。首次 guidance 因稀疏工作树缺 `.codebuddy` / `.cursor` 文件失败；按同一 HEAD 恢复已跟踪文件后通过，原失败日志保留。没有修改指引检查器。
- 独立复审和精确路径 SHA-256 见 `review.json`。所有证据文件摘要见 `sha256.json`。复审报告中的原始 `.log` 附件按相同名称加 `.gz` 保存，解压字节不变。

本轮是聚焦回归，不是完整 `npm run check` 或当前 HEAD 的 hosted Full。

## 保留的阻塞

- #582 尚未合入；其精确 Full 通过不等于原 Merge Queue 握手完成。
- 原 [Quality 42761530867](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42761530867) 因双父祖先 `1a733d800a2a50309803face7f30fd2a98b2cd31` 被线性历史门禁阻止；追加测试修复不消除该阻塞。依赖合入后再保全重建线性分支并取得精确 CI。
- 本轮未生成新 GIL、截图或性能结论。官方导入、新 ready、PC/实体手机验收及当前画面/流畅度仍未完成；PR 保持 Draft，TASK-103 保持 In Progress，未勾验收项。

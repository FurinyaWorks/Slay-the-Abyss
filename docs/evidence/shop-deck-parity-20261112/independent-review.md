# 商店／永久卡组整包独立复审

## 初次结论（历史；当前结论见文末 R2 复审）

**发现 2 项 P2；未发现 P1。建议修正这两项后复核相应边界。** 已知的 map/button source epoch 尚未最终重绑单独记录，不作为新增发现。

- 对象：`F:\New folder\.worktrees\shop-deck-parity`，相对 `903bf2a31e91f10fb24763ab4cea23d586d0bb83` 的整个当前 tracked diff，以及本轮新增计划、来源接续和视觉证据材料。
- 评审者：本轮独立 OpenCode reviewer；没有实施本切片。
- 源码覆盖快照：`2026-11-12T15:22:00.263Z`；下列 hash 是**完整文件**的 SHA-256，不是 diff hash。
- 操作：只读检查、内存 Fengari／布局／来源合同探针；唯一写入为本报告。未改生产文件、tests、Backlog 或来源归档，未跑 Full、工程整套或重复主 agent 的相关测试集。

## P2-1：隐藏的浏览返回接收器能跳过后续 optional choice

**位置：`src/lua/abyss_deck_ui.lua:419-423, 625-630`；下游提交点 `597-601`。**

永久卡组现在选择 `browserShell`，玩家实际使用 `pileReturn`。该接收器的 pointer click 直接调用 `self:back()`，只有 controller 绑定带 `self.browserShell` 的可用性条件。pointer 路径既不检查当前是否仍属于浏览壳，也不校验取得输入时的 generation。

当浏览结束、后续 optional choice 已打开时，旧 `pileReturn` 虽然隐藏，其迟到 click 仍会进入 `back()` 的 optional/multiple 提交分支，取得**新 choice 的 token**，以 UID=0 调用当前回调并关闭选择。不是仅修改视觉状态。原战斗牌堆的裸 listener 已存在；本次复用把这个入口扩展到了普通永久卡组路径。

### 最小探针及实测

内存加载本轮 `fixture-save.json.gz` 的生成数据、主题与模板，所有同名生产 Lua 以当前 `src/lua` 字节覆盖；使用现有 `game_ui_fixture` 控件和真实 `abyss_deck_ui`。没有修改 Lua 实现或落盘夹具。核心序列：

```lua
assert(deck:open(host.run)); deck:update()
local late = panel:GetChild('pileReturn'):GetChild('hit').click
assert(panel:GetChild('pileReturn').visible)
assert(deck:close())
local choice = {token='new-choice', op='codex', optional=true,
    cards={{uid=999, cardId='defend'}}}
host.run.combat.pendingChoice = choice
deck:open(host.run, choice, function(token, uid)
    picked={token,uid}; return true
end)
deck:update()
assert(not panel:GetChild('pileReturn').visible)
late({touchId=800})
```

实际输出：

```text
PERMANENT_RETURN_VISIBLE true
CHOICE_RETURN_HIDDEN true CHOICE_VISIBLE true
STALE_RETURN_RESULT true CHOICE_VISIBLE false PICKED_TOKEN new-choice PICKED_UID 0
READ_ONLY_LATE_RETURN_PROBE_REPRODUCED
```

这是 native 回调边界的定向探针，不宣称已在官方客户端复现迟到事件的调度时序。

**最小修复：** pointer 与 controller 共用当前浏览壳可用性谓词，至少要求 `visible && browserShell && !choiceToken && !detailOnly` 后才准许 `pileReturn` 调用 `back()`；具备 Down/Up 的宿主同时绑定本轮 generation，在关闭、详情切换和新 choice 打开后使旧手势失效。不要取消 `back()` 对合法 optional/multiple 确认的支持。

**回归建议：** 保存永久浏览返回 listener，关闭后打开 optional choice／达到数量的 multiple choice，再送旧 click；新 choice、token、selected 和回调均应保持不变。现有新增测试验证了迟到网格刷新和非 optional forced choice，但没有覆盖这条隐藏返回接收器路径（`tests/official-assets-runtime.test.mjs:约 780-905`）。

## P2-2：新通用气泡与 V25 旧商人投影混装

**变更入口：`data/presentation/ui_theme.json:3271`、`scripts/cinematic-ui-layout.mjs:103-138`。接续位置：`scripts/v25-node-layout.mjs:226-233`。**

通用主题现在总有 `merchant.bubble`，所以旧 `v25-reference` 也会先生成新气泡结构。V25 随后仍按旧横条投影更新 panel、portrait、line、talk，完全没有投影新增的 bubble 及其内部几何。

实际 `buildUI` 顺序是 `gameLayout()` 使用通用主题生成控件，再由 `applyV25NodeLayout(layout, theme)` 处理（`scripts/build-ui.mjs:148-150,175`）。V25 theme 的深合并保留了新增 `bubble`，而覆盖了 box/line/portrait 坐标；运行时 `Merchant:pose()` 又按 V25 box 移动气泡，但不会改变它保留下来的 56×88 尺寸。

### 最小探针及实测

以真实 `v25Theme(nativeTheme)`、`gameLayout()`、`applyV25NodeLayout()` 生成后，取实际 merchant spec；再在内存 Fengari 中用现有控件夹具运行当前 `Merchant.new`、`enter`、`react('buy')`、`tap()`。

实际输出：

```text
V25_RUNTIME_BUBBLE 0 0.0 56 88 LINE 25 -14.0 560 32 TEXT 「眼光不错。」
READ_ONLY_V25_BUBBLE_PROBE_REPRODUCED
```

line 是左对齐的 560 宽文本框，其左缘为 -255；气泡左缘仅 -28。实际购买短句从气泡之外开始绘制，portrait 在相对 x=-300；旧 panel/border 仍是隐藏的替身。文字、浅色底、人物和点击区域不再形成同一个对白。这是旧可选 profile 的生产装配回归，不影响截图采用的 official profile。

**最小修复：** 在 V25 装配边界明确选择并重建一致的 merchant：例如用不含 bubble 的 V25 主题重建原横条，且生成的 Lua theme 同样不启用 bubble；或完整投影新气泡、尾巴、正文、头像和 talk。不能只调整 Lua position 或恢复旧 panel 一个字段。official 现有的重建边界可作为结构参考。

**回归建议：** 针对最终 `v25-reference` 装配后的真实购买反应检查正文包围盒属于其背景、尾巴／头像相对关系及点击目标。现有新 clearance 测试仅覆盖 native 和 official（`tests/merchant-action-group.test.mjs:35-44`），无法发现 V25 混装。

## 其他重点边界检查

### 永久语义、生命周期和最终装配

- `open()` 仍先复制 `run.deck` 并独立构建永久 catalog；只有 `choice` 或 `pileKind` 才绑定 combat。`browserShell` 不再决定 `pileView`、battle 或 card surface owner。永久费用、成长文本、详情与升级预览没有被替换为临时战斗实例。
- 最终 `buildUI` 先完成 official card passes，再由 `battlePileCardTemplate()` 克隆最终手牌面，给 `pileGrid` 绑定独立模板；并再次执行 `assertOfficialRunContracts`。检查了模板中的 hit、UID 反馈行、rim/glow 和共享材料，不是只看共享函数名。
- 网格校准、generation、延迟刷新、销毁后解除 controller 绑定、详情返回滚动状态和 C 档两行分页有明确实现及新增用例。永久排序使用独立 `masterSort`；战斗 pile 排序没有覆写该偏好。普通 forced choice 仍走旧反馈 grid，非 optional back gate 保留。
- `close()` 恢复 veil/header、隐藏 pile chrome/tools/return，并清空当前网格；直接信息详情与 relic overlay 的下一次打开没有看到新增壳状态残留。

### 地图、商人和离店按钮

- `runRoute` 是 nodePanel 下独立 live 控件，不是复制在装饰 bar 内的第二个输入 owner。地图为当前 map 的只读预览，`closeExit()` 一次关闭 route/menu/exit，返回保留的 node mode；没有重新进入商店、重抽库存或推进路线。
- route 的 Down/Up 身份检查包含 exit/menu、deck/potion generation、run、map、roomGeneration 和 choice generation，当前 modal／settlement gate 仍生效。现有新增探针测试确实送了过期 choice generation、deck 覆盖和重复点击，而不是只断言控件存在。
- 商人隐藏时由 nodeUI.visible 阻止 update 和 talk；重新显示不会再次 enter 同一 run/node。购买／拒绝立即替换反应、队列／长叙述分页、自动收起、重读、idle 只发生一次和不等待 farewell 的路径已追至节点生命周期实现及新增测试。
- official 最终重建 merchant 使用 official frame 和货架 columns；通用 runtime 也读取同一主题投影。未发现 official 这条链的额外几何错配。
- button feedback 每次 repaint 都重新写 official enabled ink，禁用写 `C.textMuted`，覆盖 normal/hover/pressed/disabled 分支；后续 referenceChrome 在 official 当前配置没有把它改回旧主按钮暗字。当前截图仅验证了前三态，禁用态尚无本轮像素实测，不能算四态设备验收。

## source epoch 接续审查

- 原 `closeout-source-epoch.json.gz` 的完整字节身份保持 `36aba7fc…a9ac237a`；新四源外层独立归档。逐项确认原 **49 个历史 target** 完整保留，`shopDeckPrior.files` 与原 closeout 的完整 current 表一致。
- 原 Defect 50-owner、Formation 51-owner 历史 assertions 的 test body 和完整目标循环继续保留；没有改为 skip、过滤目标或仅检查归档名。旧 current96 的精确28-owner差集改为对独立 `closeoutPriorEpoch` 断言，同时新增真实 current97 的验证及 merchant-owner 负控。两层责任是明确的。
- 源码投影先对已知完整 LF 身份匹配，再逐调用新读全部 owner；未知字节保持 opaque，不会自动替换成归档“通过”。现有完整当前树 test 会另行拒绝源码漂移；collector 同时校验未列源、缺源、inventory 和采集期间二次读。
- 核对了 helper 拷贝闭包对新增 gzip 的认证、孤立导入及缺失／变更负控；运行时 projector 没有把活 owner 授权结果缓存。
- **本轮只读独立探针：** 在内存以 collector 收集的最终四源构建 projector，50 个 target 的 deck 完整投影均符合各自历史源；逐个改变 97 个 owner，97 次均拒绝；未知 deck 字节触发 0 次 linked read。这是内存接续能力验证，没有改写落盘归档，不能冒充落盘最终接续已通过。
- 落盘 archive 与当前源码的差异**恰为** `abyss_game_ui_input.lua`、`abyss_node_ui_feedback.lua`，符合用户预告。主 agent 最后仍需执行既有 rebind／`--check` 及实际 live-source assertions；本报告没有放宽任何 static guard，也没有用内存投影掩盖已知 stale。

## 截图与证据边界

实际打开查看：`visual-final/01`、`02`、`03`、`04`、`06`、`07`、`08`、`10` 的 PNG。

- **01-shop-bubble.png：** 左侧独立人物，浅色头顶气泡和向下尾巴；商品／价格未被该气泡覆盖；底部中央旧黑条消失；顶部地图及右下深底浅字离店可见。
- **06-deck17-top.png：** “卡组 · 17 张”、暗场、五列、四项排序、左下返回；07 支持滚动到最后两张，08 显示永久牌组升级与来源说明，10 回到同一商店。
- 02/03 中离店 hover/pressed 仍是浅字；04 为只读地图及返回入口。
- 独立只读校验了 **10 张 PNG** 的 SHA-256 与 1280×720 尺寸、**652 份**归档源与清单摘要、当前磁盘源码零漂移，以及清单／render receipt 的闭包身份一致。
- README:30、capture 的 renderer 字段都明确说明 **headless Chromium SwiftShader 软件 WebGL**；该组证据不是官方导入／GIL 读回／官方 ready／PC 或手机／设备 GPU 证据。没有发现把截图级别冒充上述结果的声明。
- 原收据中 1 条 HTTP 400 保留，正文没有伪称零错误；目前没有足够证据归因到本轮生产改动。

## 本轮实际执行与范围

- `backlog instructions overview`、`task-execution` 和两任务 view：只读取得任务／约束。
- `git diff 903bf2a31 -- …`、`git status --short`、`git diff --check 903bf2a31`：检查整包 diff；diff check 返回 0（有 Windows CRLF 提示，无空白错误）。
- `node --input-type=module -e …` 内存探针：V25 最终布局／真实 merchant pose、旧 pileReturn 对新 optional choice、来源接续与 97-owner 负控、证据身份与完整文件 hash。上述缺陷探针均成功复现；来源和证据检查结果见前述数字。
- 未运行 Full、全套相关测试、Luacheck 或重新安装工具；主 agent 的 setup／最终工程验证不在本报告中计为通过。

## 完整文件覆盖 SHA-256

算法：`SHA256(UTF8(readFileSync(path,'utf8').replaceAll('\r\n','\n')))`。保留 BOM、单独 CR 和末尾换行；不是 trim／重序列化后的摘要。两次抓取的十份生产文件与前六份核心 helper 摘要一致。修改下列源码后需按受影响边界补审，单纯最终来源重绑也需读回归档身份。

### 生产 10 文件

| 路径 | 完整 LF SHA-256 |
| --- | --- |
| `data/presentation/ui_theme.json` | `b1f821652f923eca88e8d6cad227926343f07237167fc3df01867536ac8c11ae` |
| `scripts/cinematic-ui-layout.mjs` | `3ca7562e7e17386bd2ea86b5b7855d602ccad646f59b3eb4b8dbe043930aa4ca` |
| `scripts/deck-ui-layout.mjs` | `544daeb9340393b70d8bdfd81268075c3c7e4d886241ced2a6ab7702b715f578` |
| `scripts/official-assets-layout.mjs` | `3e7b8352eb03a61b74ccb35e08046b8267ea088da87727726b37b74656255b10` |
| `scripts/official-battle-hud.mjs` | `2f87ea23c3005ed0fda904f99260b612d96196bedf4ae18acc7cce51363ee917` |
| `scripts/official-run-layout.mjs` | `cc7f3f913bd156e0148f540f9406f1ce5c4a26563312f08f0a4d1d79c7869d17` |
| `src/lua/abyss_deck_ui.lua` | `85b80f3ede3f11b35c336d65c8210673693440d0a595c11dbfbf03c3c72bc12d` |
| `src/lua/abyss_game_ui_input.lua` | `abf7e6b4397070e6ed1cfa21d7802003d7f9d37f9363242cf34759f2258c83f5` |
| `src/lua/abyss_merchant.lua` | `579ca9f8c7f57a503c8f243a12caee9e37c8ecbfb769851a57c2ba167f2e2535` |
| `src/lua/abyss_node_ui_feedback.lua` | `60c2b35eb9f4056fd0db345dcf13835d0e6b98431b4294712912207d23118aac` |

### 核心 helper／闭包文本

| 路径 | 完整 LF SHA-256 |
| --- | --- |
| `tests/helpers/closeout-source-epoch.mjs` | `8649dc36045cd6df15274f9f7a9097d81c6d49a2c7a9488bcae0ac6977dd06a0` |
| `tests/helpers/generate-shop-deck-source-epoch.mjs` | `58fb7a53d4142bfbf7f242742291af53c6b45eafa8ed935797956165a9c8757c` |
| `tests/helpers/copy-integration-source-closure.mjs` | `4ac622bf9e0831f1732a7e83c9ca71eae7b18d9f31d23368258b9190b8c20c14` |
| `tests/helpers/closeout-source-closure.json` | `6dc0b90d4c02424098e3ecf55a242d78400e08436c7c70d89d32f729328ceb2d` |
| `tests/helpers/combined-epoch/source-epoch.mjs` | `d6237003597c687547c2ec2cc0b08995696997194b2d2423e278e34b40a020ac` |
| `tests/helpers/combined-epoch/source-epoch-runtime.mjs` | `5341c965ce41e956f153caf90c2e2097ccaee447a2d1e53a5aa666d15a238882` |
| `tests/helpers/closeout-ci-source.mjs` | `00925afa783b67698bb395e25cba5621df54e438d817092ecb9252b181c114dd` |
| `tests/helpers/isolated-current-source.mjs` | `a478d265612a861da4e733ecc7b364c62ac9b5090cc155027bf2e150fcef21dd` |

二进制归档取原始字节 SHA-256，不做 LF 转换：

| 路径 | 原始字节 SHA-256 |
| --- | --- |
| `tests/helpers/closeout-source-epoch.json.gz` | `36aba7fc07f732a191a750d437eefd27e9b9567221811747abf13c97a9ac237a` |
| `tests/helpers/shop-deck-source-epoch.json.gz` | `4b00f911da479f8dae228c9ff8351492db7eb53bfab80c2b68d534768bb0f413` |

### 本轮关键 tests

| 路径 | 完整 LF SHA-256 |
| --- | --- |
| `tests/integration-source-epoch.test.mjs` | `a754fe45568410eba295da3c1ad57776c99f6953be4fd0d895094e62ea6e0188` |
| `tests/defect-final-source-epoch.test.mjs` | `d653c2ce68b31521dfbf70d8dbcebc55bedc09996b56d04e2fb0ea3505d94c0a` |
| `tests/encounter-formation-source-epoch.test.mjs` | `76ee5717182db0459f0b33ddcf86efe2e1f2390476d99f8d7272815657403f47` |
| `tests/official-assets-runtime.test.mjs` | `00bbf307defc216e2ba2ed2a7b64b92ae450fcf4d725241b137c9e7f9acb552a` |
| `tests/official-run-chrome.test.mjs` | `cfc770ddd4ca83a92c2a843fe87ded63bd6f68a0df9f655edfccd75483673c28` |
| `tests/merchant-action-group.test.mjs` | `e555a825b59ebfa66cc5210b2d013c04ecd23865d4597dc904cd83a8d08dc247` |
| `tests/node-ui-layout.test.mjs` | `338a728591f061e8616275f87e49b861155683eb64c1e53e9618edd658549ee3` |
| `tests/lua/merchant_action_group.lua` | `b596c3ddc8cf865d8c3e77133ea4e0bff7f4bb0b393d1bcc66339492470a484c` |
| `tests/lua/merchant_dialogue_lifecycle.lua` | `52c79331982646477d01b27b6503f3eaa126cf93592f06173c9797161f8227fc` |
| `tests/lua/support/node_ui_cases.lua` | `f8f8141f566fbf54df0fb9d3881c7f5ef04ab79966acdd353b94557b35beb027` |

---

## R2 修复复审：pass

**两项初次 P2 均已关闭；本次未发现新增 P1/P2，`unresolved=[]`。** 本结论覆盖下列最终源码清单；上文初次发现、探针输出和旧 hash 保留为历史，不代表当前缺陷仍存在。

```json
{
  "reviewId": "shop-deck-parity-20261112-r2-b38cc1eea838",
  "conclusion": "pass",
  "unresolved": [],
  "reviewedBaseSha": "903bf2a31e91f10fb24763ab4cea23d586d0bb83",
  "reviewedHeadSha": null,
  "coverageSha256": "b38cc1eea8385100fe7d65821cf1f79bedd3ac3c885d69e4aa1e96b754b81e23",
  "bindingStatus": "awaiting-committed-head",
  "finalPngReview": "pending"
}
```

- 快照时间：`2026-11-12T15:38:20.997Z`。当时 HEAD 仍是上述基线加工作树改动，尚无新提交可绑定。提交后用最终文件摘要核对并补 `reviewedHeadSha`；若实际 BASE 变化，需复核新增差异。该 reviewId 可用于后续精确 HEAD/BASE 的 auto-merge review 记录。
- 本次仅修改此报告；没有修改生产、tests、Backlog、归档或构建产物。未重复 Full、完整 engineering、mutation 或 native 合同集。
- 主 agent 报告新增两条测试已有红绿证明、engineering／四 mutation／六 native 合同通过；这些全套执行结果未冒称为本 reviewer 本轮重新运行。下述独立探针与 `--check` 是本轮实际执行证据。

### P2-1 关闭证据：当前状态与输入生命周期共同准入

已复核 `src/lua/abyss_deck_ui.lua:625-653`：

- pointer 和 controller 共用 `available()`，检查 visible、browserShell、choiceToken 和 detailOnly。
- 复用已有 `cursor`，Down 记录 generation/run/touch；Up 只接受对应 touch 且当前 identity 有效的手势。Exit/EndDrag 清理手势；click 消耗 released，拒绝新浏览 generation、详情 generation 和 choice 覆盖后的旧输入。
- optional/multiple 的合法 `back()` 提交语义保留；没有以删除确认能力修复迟到输入。
- 新测试 `tests/official-assets-runtime.test.mjs:715-738` 直接发送 optional/multiple 覆盖和旧 generation 的 listener 事件，并验证新鲜手势可返回；不是仅断言有门禁函数。

独立内存 Fengari 探针仍使用已留存生成数据／模板，所有同名生产 Lua 从当前磁盘覆载。相对初次探针，加入真实 Controller manager、held 与 released 跨关闭重开、排序/详情 generation、Exit/EndDrag、重复 click、新鲜 pointer 和 controller 返回。输出：

```text
R2_BROWSER_RETURN_PASS rejected=11 fresh_pointer=true fresh_controller=true optional_multiple_unchanged=true
```

11 次拒绝包括新 optional/multiple choice 的 pointer 与 controller 路径，未发生回调提交；新鲜 pointer/controller 返回均完成。原 P2-1 的新 token／UID=0 误提交已无法由该接收器触发。

### P2-2 关闭证据：完整 V25 投影及对象身份

已复核 `scripts/v25-layout.mjs:19-23`、`scripts/v25-node-layout.mjs:226-241`：

- V25 使用唯一主题 `merchant.official` 的完整几何／分页投影和 shelfColumns，旧 `v25NodeThemePatch` 商人横条配置已移除。
- bubble 路径由 `merchantControl(theme)` 给出完整 spec，再按名字递归投影到已有控件对象；保留 live text content。没有只替换顶层 position，也没有重新创建 listener 所依赖的旧对象。
- 新测试 `tests/merchant-action-group.test.mjs:45-56` 覆盖最终 V25 装配、line/talk/merchant 对象身份、live 文本和实际 clearance。

独立探针进一步逐一保存并比较整个 merchant 子树的 **30 个对象与路径**，逐属性对照完整生成 spec；然后在真实当前 Merchant Lua 中运行购买、nod、自动收起和重读：

```text
R2_V25_LAYOUT_PASS handles=30 all_paths_retained=true full_spec_match=true live_text_retained=true
R2_V25_RUNTIME_PASS bubble=120x80 line=104x48 text_in_bubble=true head_relative=true fold_reread=true
```

原 56×88 气泡／560 宽正文混装已消失；正文在 nod 后仍位于气泡内，气泡跟随头部，人物在对白收起后保留。

### 后续工程调整与来源接续

- `abyss_merchant.update()` 把空 dismissed 分支改为 `if not current.dismissed`；idle／姿态／计时边界保持原含义。上述 runtime 探针同时覆盖自动收起与重读。
- deck 返回绑定复用了外层 cursor，未重引入 shadow 声明。
- `abyss_game_ui_input.lua` 的 `routeModes={battleRoute='battle',runRoute='node'}` 替代条件分派；mapContext 仍只对这两条 route 及 mapReturn 启用原身份校验。逐条对照原 mode/modal/choice/settlement 准入和一次返回链，未发现语义变化。
- 没有静态 guard、复杂度阈值、mutation 或 native 合同配置的放宽改动。

本轮实际执行只读命令：

```powershell
& 'F:\New folder\build\tools\node-v24.18.0-win-x64\node.exe' tests/helpers/generate-shop-deck-source-epoch.mjs --check
git -c core.safecrlf=false diff --check 903bf2a31
```

两者返回 0。`--check` 认证的最终 archive 为：

```text
51034e9da34cbe0ab153f00ab66a16918db1097ef7173932ab326cc6c2076f2b
```

另一个独立的只读 Node 探针直接使用**落盘最终 projector 与真实磁盘 reader**，没有构建替代的内存 epoch。结果：

```json
{
  "node": "v22.22.1",
  "liveSourceRows": 347,
  "liveArchiveStale": [],
  "historicalTargetsRetained": 49,
  "liveFourSourceProjections": 200,
  "ownerChangedOrMissingRejections": 194,
  "foreignLinkedReads": 0,
  "unlistedCollectorDriftRejected": true
}
```

即四个最终 Lua 文件各自在 50 个 target 上恢复正确完整历史源；97 个 owner 各自的变更／缺失均拒绝，未知输入无 linked I/O。完整 347 行当前生产源与归档逐份一致，初次已知的 input/feedback stale 已清除。原 49 个历史目标和完整 predecessor 表仍保留，没有跳过历史断言来换取通过。

### 最终 PNG 复核：待后续

本次复审沿用初次实际打开的图片作视觉参考；**尚未把重采中的新来源 PNG 计为复核通过**。本次快照时原视觉闭包仍为 `37971ea573daa62412b8d895a88d6e71fdabae520161dba549cd17b1929820f6`，相对当前源有 deck_ui、game_ui_input、merchant 及两个 V25 脚本共 5 份变化。旧图的“当时零漂移”历史结论不延续为最终源证据。

待视觉 agent 完成后，需读回新 source manifest/closure、save/PNG 身份并实际打开最终指定 PNG；这项与提交后 HEAD 绑定单独补记。本次 `pass` 是源码／已修缺陷的独立复审结论；Full 仍由主 agent 交付，官方导入、ready、设备和 GPU 验收级别沿原报告边界。

### R2 完整源码绑定清单

生产范围由初次 10 份扩展为 **12 份**（增加两个 V25 修复文件）。下表机器可读清单同时覆盖 8 份核心 helper／闭包文本、10 份关键 tests 和 2 份二进制归档，共 32 份文件。

`coverageSha256 = SHA256(UTF8(JSON.stringify(manifest)))`；manifest 即下方 JSON 对象，两个摘要表的路径按 JS 默认 `.sort()` 排序。文本仍只做 CRLF→LF，归档取原始字节。

```json
{
  "normalization": "CRLF-to-LF",
  "lfSha256": {
    "data/presentation/ui_theme.json": "b1f821652f923eca88e8d6cad227926343f07237167fc3df01867536ac8c11ae",
    "scripts/cinematic-ui-layout.mjs": "3ca7562e7e17386bd2ea86b5b7855d602ccad646f59b3eb4b8dbe043930aa4ca",
    "scripts/deck-ui-layout.mjs": "544daeb9340393b70d8bdfd81268075c3c7e4d886241ced2a6ab7702b715f578",
    "scripts/official-assets-layout.mjs": "3e7b8352eb03a61b74ccb35e08046b8267ea088da87727726b37b74656255b10",
    "scripts/official-battle-hud.mjs": "2f87ea23c3005ed0fda904f99260b612d96196bedf4ae18acc7cce51363ee917",
    "scripts/official-run-layout.mjs": "cc7f3f913bd156e0148f540f9406f1ce5c4a26563312f08f0a4d1d79c7869d17",
    "scripts/v25-layout.mjs": "99dd65354c5716b9a33b1960bea7abdd6927b0cf4daab199bfafd9475c71d3c2",
    "scripts/v25-node-layout.mjs": "f0fe4917c34ecda9d265fe03c7175a612ef710c2df2d69ca879a678b602db656",
    "src/lua/abyss_deck_ui.lua": "1258c574f10194911ee9305a711651ce3550546f947e061588923ff39da3f720",
    "src/lua/abyss_game_ui_input.lua": "a4524bbfc58416f121d1bf300cbf6a2bda1440431e224d6893c444cf1059082f",
    "src/lua/abyss_merchant.lua": "9af6cffe29736f05c2942f67838cebb148b738a973d7f6bc9a272a859fd37f26",
    "src/lua/abyss_node_ui_feedback.lua": "60c2b35eb9f4056fd0db345dcf13835d0e6b98431b4294712912207d23118aac",
    "tests/defect-final-source-epoch.test.mjs": "d653c2ce68b31521dfbf70d8dbcebc55bedc09996b56d04e2fb0ea3505d94c0a",
    "tests/encounter-formation-source-epoch.test.mjs": "76ee5717182db0459f0b33ddcf86efe2e1f2390476d99f8d7272815657403f47",
    "tests/helpers/closeout-ci-source.mjs": "00925afa783b67698bb395e25cba5621df54e438d817092ecb9252b181c114dd",
    "tests/helpers/closeout-source-closure.json": "e4f72923f6494a65891cbd64f23936355c30de44931a4ae0dae363608064229b",
    "tests/helpers/closeout-source-epoch.mjs": "1f7776a23150d8d84d8d3f84cf399c97aea47d7587a0a04ee0f958170f0ef821",
    "tests/helpers/combined-epoch/source-epoch-runtime.mjs": "5341c965ce41e956f153caf90c2e2097ccaee447a2d1e53a5aa666d15a238882",
    "tests/helpers/combined-epoch/source-epoch.mjs": "d6237003597c687547c2ec2cc0b08995696997194b2d2423e278e34b40a020ac",
    "tests/helpers/copy-integration-source-closure.mjs": "01c2bf74d340a93fdc01c20b3c0c6f9ccaa901554fabc36965e9dfff750667f5",
    "tests/helpers/generate-shop-deck-source-epoch.mjs": "58fb7a53d4142bfbf7f242742291af53c6b45eafa8ed935797956165a9c8757c",
    "tests/helpers/isolated-current-source.mjs": "a478d265612a861da4e733ecc7b364c62ac9b5090cc155027bf2e150fcef21dd",
    "tests/integration-source-epoch.test.mjs": "a754fe45568410eba295da3c1ad57776c99f6953be4fd0d895094e62ea6e0188",
    "tests/lua/merchant_action_group.lua": "b596c3ddc8cf865d8c3e77133ea4e0bff7f4bb0b393d1bcc66339492470a484c",
    "tests/lua/merchant_dialogue_lifecycle.lua": "52c79331982646477d01b27b6503f3eaa126cf93592f06173c9797161f8227fc",
    "tests/lua/support/node_ui_cases.lua": "f8f8141f566fbf54df0fb9d3881c7f5ef04ab79966acdd353b94557b35beb027",
    "tests/merchant-action-group.test.mjs": "76c04d23d93b380fedec4173df3e2486b4685c535c4f05b97201609a185a6ae2",
    "tests/node-ui-layout.test.mjs": "338a728591f061e8616275f87e49b861155683eb64c1e53e9618edd658549ee3",
    "tests/official-assets-runtime.test.mjs": "b61cbca1986ba33fab8e3eee3c859db9821090110f67e80f6941eb3718e67f40",
    "tests/official-run-chrome.test.mjs": "cfc770ddd4ca83a92c2a843fe87ded63bd6f68a0df9f655edfccd75483673c28"
  },
  "binarySha256": {
    "tests/helpers/closeout-source-epoch.json.gz": "36aba7fc07f732a191a750d437eefd27e9b9567221811747abf13c97a9ac237a",
    "tests/helpers/shop-deck-source-epoch.json.gz": "51034e9da34cbe0ab153f00ab66a16918db1097ef7173932ab326cc6c2076f2b"
  }
}
```

---

## 最终补记：当前图已复核，源码 pass／完整 CI 待验证

**维持 R2 源码结论 `pass`、`unresolved=[]`；未发现新增 P1/P2。最终 PNG 的待复核项现已完成，结果仅为本轮限定目标的离线视觉通过。** 本补记替代上文 R2 的 `finalPngReview: pending`，保留其余历史记录。

```json
{
  "reviewId": "shop-deck-parity-20261112-r2-b38cc1eea838",
  "conclusion": "pass",
  "unresolved": [],
  "coverageSha256": "b38cc1eea8385100fe7d65821cf1f79bedd3ac3c885d69e4aa1e96b754b81e23",
  "finalPngReview": "pass-offline-limited-scope",
  "ciStatus": "pending-strict-remote-full",
  "headBinding": "pending-committed-head"
}
```

### 源码身份与新增文档

本轮只读校验时间 `2026-11-12T16:25:37.467Z`：R2 清单中 **32 份文件全部逐份相同**，包含 12 份生产文件、核心 helpers、关键 tests 和两个来源归档；完整绑定摘要仍为 `b38cc1eea8385100fe7d65821cf1f79bedd3ac3c885d69e4aa1e96b754b81e23`。未重新运行大套测试。

- 已查看 `docs/design/UI_DESIGN.md:11` 的新增段落：明确当前 official 五列暗场覆盖 PR19 六列半透明历史规格，保留 `run.deck` 永久语义及商人、离店、地图批准范围，并明确离线图不代替官方设备验收。与已审实现及用户授权一致。
- 已完整查看 `validation.md`：明确本地 `npm run check` 在 1200 秒外层截止前出现 Act1 差分和 boundaries2/3 失败、没有完整汇总，后续 Lua/Python 阶段未执行；没有将部分通过写成 Full 通过。
- 该记录明确区分后续精确 `act1_event_content.lua` 双边定向通过与原失败的归因：基线和修复树所报 131 检查点图摘要相同，**仅代表未复现原失败，不足以证明它是既存失败**；boundaries2/3 未另重跑。该表述与本次交接事实一致，本 reviewer 未重新执行这些测试或裁定失败根因。
- 主线报告最终直接受影响官方 6/6、V25 完整 6/6、engineering／四 mutation／六 native 合同通过；本轮独审只读核对记录及已有工程报告，不重复执行或把这些结果扩大为完整 CI。

新增文档和最终收据的完整 LF SHA-256：

| 路径 | SHA-256 |
| --- | --- |
| `docs/design/UI_DESIGN.md` | `4a02873b808a929f79d8d2847b0fbc0b76152a73774905b4c45c02887c777fcd` |
| `docs/evidence/shop-deck-parity-20261112/validation.md` | `c5df1ebde24608c8447c28c8dc4e4e9df602c54422fa3e1cc022e21b95de0e01` |
| `docs/evidence/shop-deck-parity-20261112/README.md` | `464b2b566989bd63e0f84e7d5055663a8e72e0b84084ba0d32830d3af8a32445` |
| `docs/evidence/shop-deck-parity-20261112/source-manifest.json` | `4fedbc7cfbfac72dfdedf64461ded996946ec96a58225a3b6d6411026ca05bba` |
| `docs/evidence/shop-deck-parity-20261112/verification.json` | `d0b1f5aac8d8dfdbcf477c19ef59db4f43187eeb7e504fdec892ce87da6fc2a9` |
| `docs/evidence/shop-deck-parity-20261112/visual-current/render-receipt.json` | `8fe27abbf3b03fcf3a2e053dad98fd70bad7919406f1751ad736c98c88bbee94` |

### 当前图片及来源读回

最终图片统一位于 `docs/evidence/shop-deck-parity-20261112/visual-current/`。本 reviewer 本轮已逐张实际打开 **01—10 全部 PNG**，并独立只读核对其 SHA-256、1280×720 尺寸、对应 SDK 状态／ready／Lua 错误日志、source manifest/closure 和 save 身份。

- 新 source closure：`fe9c9210795a618770ff119fa20e447cf9b6b3b6de40ab94145f422d22232e80`；**652 份输入当前磁盘零漂移**，本地压缩 closure 内容逐份匹配清单。
- 当前 save 原始字节 SHA-256：`9ce663ebd8e5ce95cceebbf2114a18e8d7317be926a31fb2fc2b308210e29fdd`；压缩 save 解压读回一致。
- 同时读回 `verification.json` 登记的工具文件身份。没有重新运行会写入 verification 的脚本；以上是独立的只读摘要／状态检查。

| 当前图片相对 `visual-current/` 路径 | 本轮实际看图结论 | PNG SHA-256 |
| --- | --- | --- |
| `01-shop-bubble.png` | 独立左侧人物、头顶浅色带尾气泡，未遮商品／价格；无旧底部黑条；地图与深底浅字离店可见 | `ea96634ca03613852a1cec340b451a511dc0f377ad75c5ba2499cd6698584909` |
| `02-leave-hover.png` | 离店 hover 仍为浅字 | `c955dab7bc5a9f085f7a8ec67a0d035482db79a52ecac7e4021dd93e2b8dabf7` |
| `03-leave-pressed.png` | 离店 pressed 底色变深，正文仍清楚 | `b11f1a72c9be0f823c2aed8e4cec9e18771dcd22179467cbfe0c9e70b1c2d38b` |
| `04-map-preview.png` | 只读路线预览、当前商店节点及返回入口 | `8af5606aeeb93207ba45e3429f8ba307fbf8ba94a40a6c21f62a0836be30b21a` |
| `05-shop-map-return.png` | 返回原商店，货架／价格与人物恢复 | `343b18d4e18ec132d21de5d43cdae896503b01067ea0352338b2193545b520bf` |
| `06-deck17-top.png` | 卡组 17 张、五列、暗场、排序条、左下返回 | `ab7a3084491bbaeb54d9f4bdc3d411087777ecdf85db1dbc47e3fa7abf9bbac4` |
| `07-deck17-bottom.png` | 原生网格底部最后一行两张，符合 17 张列表 | `53668e808001a64352010b72012fe03623aefa9e9bbb17912e930e5acafb9144` |
| `08-deck-card-detail.png` | 破防斩+ 当前详情，明确永久牌组与来源说明 | `c205f2efddec9f00d676b786a0a54a17fe603e2a9f3a6871c46b7688ff0f7846` |
| `09-deck-return-list.png` | 合法详情返回恢复五列列表，摘要与 06 一致 | `ab7a3084491bbaeb54d9f4bdc3d411087777ecdf85db1dbc47e3fa7abf9bbac4` |
| `10-shop-deck-return.png` | 再返回原商店，人物、气泡、商品与价格恢复 | `b23daac8325990eefe80b20535532ce1e789097d9b7b12740dd866ae900a5502` |

**证据级别：当前源码生成布局＋真实项目 Lua 的 headless Simulator，SwiftShader 软件 WebGL。** 保存状态中的 ready 是 SDK 夹具 ready。当前源码、图片和往返记录均已对应起来，但官方导入／GIL 读回／官方 ready／PC 与实体手机／设备 GPU、正式容量仍未验；离店禁用态也没有新增像素取证。收据继续保留 1 条 `/editor/api/play` HTTP 400，没有改写成零错误。

上文旧 `visual-final/`、旧 closure/save 等路径为初次历史证据，已由视觉 owner 完整迁入 `.artifacts/shop-deck-parity-20261112/history-before-final-refresh/`；本次交付以 `visual-current/` 和新清单为准。

### 正常 auto-merge 的评审授权边界

**可以使用本源码评审 `pass`，在提交后绑定精确 HEAD/BASE，再按项目既有严格入口授权／挂起正常 auto-merge。** 本地完整 check 没有通过结论；Act1 原失败原因和 boundaries2/3 的最终结果仍由当前精确 SHA 的远端完整 CI／原生队列 Full 验证。任何 required check 失败或缺失仍须阻断，不能借该评审豁免、放宽门槛或复用旧 SHA 绿灯。

本轮只追加此报告。提交后的精确 SHA 绑定 JSON 按交接保存到 `build/delivery/`，届时重新比对已审文件与提交内容；本轮没有创建该 JSON、执行授权命令、提交或宣称已实际合并。这样可固定报告正文，避免通过再次提交报告制造 HEAD 循环。

# 完整准备后统一揭幕

## 已证实的问题

旧 shared-run-hud `current-reviewed` 战斗 SDK fixture（save SHA256 `e1678a4a2968bf281883b59ada05fe4f4729273de063b8a7fb293991d916ba1c`）在 step 0 已显示战斗页并打印 `ABYSS_UI ready`，当时可见 image 921 个；到 step 180，主角 `hero/officialFigure/.../AbyssReadyCardImage` 才整体出现，可见 image 增至8211。人物局部原子加载没有保证整页完整。

完整基线模型观察保存在 `battle-before-sdk.json.gz`；它使用原 SDK SHA256 `8d10975a...` 的诊断副本，仅重定向已失效依赖路径，派生 SHA256 `27491465...`。本轮没有 renderer、官方导入或设备取证；step 为 SDK 调度次数，不能换算设备加载秒数。该 generated fixture 含受控启动注入，也不是实际GIL读回。

目录里名为 blessing 的旧 fixture 与 shop 字节完全相同（SHA256 `75cebce4...`），已排除祝福场景覆盖，不能因文件名冒充已复现。

TASK104 冻结旧/新 v3 回放分别按其登记 SHA 验证，摘要见 `diagnosis-summary.json`。旧候选菜单脚本ready早于完整结构17次step；新组件候选初检结构完整。两者均不证明当前官方设备像素完成，也不代表默认official模式已经启用组件scheduler。

## 本次修改

复用现有 GameUI 生命周期、组件scheduler及人物/卡面/纹理owner，新增一个公共 `abyss_page_reveal` 发布边界。菜单、选角、地图、祝福等节点、战斗、奖励、卡组等统一产生页面意图；准备期间页面在不透明公共cover后继续工作，禁止其交互，资源真实ready后再于下一次调度复核同epoch并揭幕。

没有固定sleep，没有扫描原生整棵控件树，没有假设native `parent` 属性。卡面/纹理在创建或复用lease时登记当前page，ready只查自有lease表；缺owner明确UNAVAILABLE。人物复用其owner提供的 `readyForPage`，战斗不等待隐藏选角资源。原Grid首屏pending/calibrating保留准备状态。

新意图使旧输入身份失效。同一个 nodeFlow 内的事件stage、picker身份和页面也参与意图，Neow从祝福切到卡牌选择不会沿用旧揭幕；choice使用稳定context/page，不使用选择输入generation。choice首次绘制直接注册choicePanel，背后战斗绘制单独注册battlePanel，避免首批lease沿用错误页面。

cover提供可点击、可手柄导航的“打开菜单”，进入原暂停/退出流程；modal在cover上层。cover期间继续人物/纹理、node/deck/map准备，暂停combat推进及本局时长计数。节点只运行专责prepare卡面准备，不推进Match规则时钟、长按输入和房间/商人时间线。异常保留cover与恢复入口，旧回调不能揭开新epoch。纹理allocation失败即使retire清空records仍保留故障；缺owner的故障明确UNAVAILABLE。

日志分 `ABYSS_PAGE_REVEAL preparing / failed / visible`。`ABYSS_UI ready` 只代表bootstrap启动，不代表页面已揭幕。原 `inspectPage` 若只看背后页面visible仍会误判；最终录制应检查cover消失、同epoch visible日志和所需资源owner。

## 验证与边界

- `node --test --test-concurrency=1 tests/sts-page-reveal.test.mjs`：四个实质回归包含pending/ready/epoch/同步重入/故障、同房间stage/picker切换、真实生成Host输入阻断、PC鼠标与手柄恢复菜单、combat和时长暂停，以及menu/deck各20个idle、choice10个idle及选择动作不反复盖幕。实际Art/Texture API验证首批choice与战斗owner分离、未知owner失败retire后不遗漏；不依赖原生parent。
- 第四项用真实Nodes/NodeUI的Match匹配对复现自动结算：覆盖6秒完整run快照不变，规则/战斗update均未执行；揭幕后0及0.05秒不提交，2秒恢复奖励一次，再2秒无重复。没有将dt设0冒充规则暂停。
- 同轮原 `tests/v25-texture-runtime.test.mjs` 28项通过。原 `tests/match-event.test.mjs` 8项通过；首次有1项因系统TEMP写入EPERM未运行，改用workspace TEMP后8/8通过。未修改原断言、预算或mock合同。最终有效定向结果为4+28+8，共40项通过。
- 本次源码/模拟器模型回归不等于官方像素原子呈现。官方图集/GPU资源回调尚无证据，必须用最终同候选日志与PC/手机逐帧录像验证；不提前勾设备AC。

本轮完整诊断、探针及本机原始日志位于独立树 `.artifacts/page-reveal-audit-20261113/`。后续最终组合截图/候选身份由主线程追加，不将基线fixture误称最终新候选。

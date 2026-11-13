# 选角与共享初始卡组独立审查

审查者 `/root/neow_reference_audit`，未实现本切片。生产只读；限定选角布局、同源肖像、主题消费及共享starter浏览器。NPC是审查者自有实现，明确不在本独审scope；共享卡牌最终轮廓也不在本结论内。

结论：**本限定切片pass，无遗留发现；隐藏menuScene补充已修复并定向复核。** 来源绑定见independent-review-hashes.json；工作树未提交，未来差异仍须核对，不能当官方导入/设备验收。

新增复核曾发现合法candidate默认menuBackground=true时隐藏menuScene阻塞：entry把hidden character映射成旧3参readyForPage('menu',false,'ironclad')会请求已暂停menuScene。旧负控保留于`.artifacts/character-independent-review-20261113/hidden-menu-scene-probe.mjs`。作者现以第4个显式page限定portrait roles，character/battle/menu分别有集合，deck等无portrait页不等待隐藏owner/busy；原3参兼容行为保留。最终第3项已改真实OnStart+真实lowpolyLand+menuBackground=true，先确认旧3参仍被暂停menuScene挡住，再确认deck实际OnUpdate能揭幕、selection仍未ready。最终独立browser3/3（13.98秒）+portrait5/5（4.50秒）通过。

已读源确认：

- 选角保留实际角色hit/confirm处理器与白名单；隐藏项目旧标题/首字头像/假锁槽。角色槽统一取同一个battleApprovedIdle literal与已有portrait controller，独立显示实例只做受限source crop，没有第二份头像资产。crop与布局使用同一主题profile，非法/出界crop拒绝。
- 选角几何、字号和材料从layout.stsCharacter读取；返回/启程复用原flagButton，颜色/反馈/字体改读同一officialAssets.flagButton token。场景背景仍为明确替换槽，未把原作截图用于生产。
- previewContext深拷贝definitions与display、按数量投影真实实例，使用局部确定性starter UID；没有Run.new、地图或RNG。DeckUI.openPreview调用同一个open/browserShell，不另造卡牌writer、详情、排序或返回控件。
- 关闭preview恢复原presentation及masterSort；切换loadout identity或离开选角使旧preview关闭并清flag。确认开局在deckOpen时被拒绝，不能因浏览进入Run。
- Host的closeStaleDeck对合法menu preview单独校验owner；controller scope与PageReveal当前页都让deck优先，首次fill前显式登记deckPanel。characterPanel在共享deck显示时隐藏，返回后恢复；deck pending/calibration仍走原准备链。
- 删除CharacterView.fillFace/renderDeck；官方旧deckView的12卡槽被清空，保留兼容宿主，没有隐藏第二套实际卡面。

本轮独立实跑：

1. `node tests/sts-character-browser.test.mjs`：最终复核3/3，13.98秒。36牌纯投影/副本隔离、坏数据拒绝；真实generated Host核对无Run、首次租约deck归属、cover/输入、menu不误关闭、共享五列/详情/排序/controller返回、正式开局后原presentation恢复及替换owner清理。另以无PageReveal旧Host证明confirm Down→打开preview→两种关闭→迟到Up/click不能建Run；源码openStarterDeck显式递增原owner世代，未依赖遮幕间接失效。第3项真实入口覆盖见上。
2. `node tests/sts-character-reference.test.mjs`：5/5，4.50秒。旧hit身份、单源literal和来源拒绝、半身裁剪/原生创建预算/cache、真实portrait ready正负例、角色白名单与确认禁用。
3. `git diff --check`通过。此前PageReveal四项复核见独立RECHECK；这次新增overlay优先已由真实Host的starter用例覆盖。

没有重复SDK/整屏截图。现有软件渲染证据保留其原source closure；最终整合冻结后由主线程重新取证。旗面边缘、字体、背景与原生渐变的公开差异仍未提升为逐像素成品一致，官方PC/手机与正式容量仍未验证。

最后工程CC修正仅把characterPanel显示/register/render/raise原段提为同作用域characterForeground，在battleUtilities后原位置调用；逐行核对参数、闭包与执行顺序未变，未放宽门槛。本报告hash已包含该最终view和entry。

## a730增量职责提取补审

独立逐读ba03607abd72e421e9497e66b031e501ad5b2997→a73043a738cd5c6d11b3f6a66ef7383cbd463c01的character_select_view、traveler_portraits、abyss_ui三文件薄diff，结论pass。角色按钮循环仍在原位置；crop断言仍在构造资源前；selectionController接收的ownerEpoch仍是读取活epoch的闭包；requiredPortrait保留原括号/结果owner限制，失败/未active/outcome门槛不变；idle pose仍在busy内且先于paint；entry仍先检查艺术失败账本，再component，再portrait。没有新API、规则或门槛变化。作者本轮17项及SDK结果不冒充本审查重跑；该补审只针对同义职责提取。精确commit和三文件raw/LF摘要见independent-review-a730-hashes.json，补充前述测试绑定，不把旧hash默认为新代码身份。

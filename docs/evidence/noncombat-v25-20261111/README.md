# 主菜单、选角与 Neow：原生切片评审

**当前交付见[发版首字占位与批准稿按钮](PIXEL_AVATAR.md)：选中角色使用“荧／雷”等首字，用户已授权正常Merge Queue，不发布。试玩入口为 http://127.0.0.1:55877/ 。以下保留第一轮R2历史数据；[R7低图元](LOW_PIXEL.md)、[R6复查](REAUDIT.md)不作为当前视觉验收。**

R2历史状态（已被顶部最新交付说明取代）：本轮独立 PR [#623](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/623)，TASK-103.3 保持 In Progress。**不合并、不发布。** 主菜单高图元背景按用户追加要求留技术评审；本轮未替换原图元数据/资产或开启全局背景开关。未提交的有限塔景试验已撤回，从未进入候选。

本机试玩：<http://127.0.0.1:55875/>。自然主菜单开局，点击开始游戏、开始挑战、继续、恩赐2、继续、地图可达节点即可进入首战。入口是 Simulator，不是官方客户端，服务停止后按 [复现入口](../../../experiments/noncombat-review/README.md) 重建。

## 采用与差异

复用已有 V25 菜单/选角布局与原输入对象；选角每态一张官方按钮材质，保留原肖像控制器及牌组入口。菜单不再逐帧更新隐藏的旧徽章。主菜单与胜败共用页面的装饰、标题、按钮和结算边框完整复位，独审发现的串样已通过真实 Lua 往返及旧实现负控验证。

Neow 使用原事件事务、选项和奖励逻辑；装饰层复用战斗既有多边形→原生三角形转换器，以及有限砖墙、柔光和浅色气泡。不引入 PNG 图元化或新页面架构。原生单容器60子项上限由原检查器验证，砖墙按固定容器分组。

对照冻结 V25 `7e40d2d` 的 menu/character/blessing 三屏后，**不宣称完整原稿还原**：菜单仍是当前官方候选底图/原生标题文字，高塔及金属标题位图未接入；选角保留当前像素肖像和官方岩徽记，命座原图未还原；祝福向导与砖墙是有限几何，缺原稿人物、曲线与地板细节。主菜单背景不能仅开启 `menuBackground` 就当恢复：仓库相同命名的4500/13201图元源目前指向另一幅肖像背景，尚须定位用户所指原高塔拟合收据及其所有者后技术评审，未据此修改实现。

## 最终候选与实拍

R2 build `10a39d5c-6156-4545-bcff-0aeed03a8aae`；生产源码 `cbfeffc0`，收据实际 **sourceDirty:true**（同期预览工具/任务记录变动），不改称干净 HEAD 构建。实际模块摘要全部读回核对，工具无启动或游戏状态注入。

- GIL SHA256 `3d866b0f8f1d1a8ea0e65b4b54a0edfea9f9fa6d0e7e0ab68a30ecc533613e2a`。
- save SHA256 `b1dd3d30379813bc3a454d3f275ffbf44d25a66fa9c56ead75bd36722bdc652b`。
- 实际读回13855控件、360 Lua，逆转换0差异；完整收据见 `adapter-receipt.json`。原GIL和25MB save保存在该工作树 build/noncombat-review-r2b 与 .artifacts/noncombat/r2-preview。

真实原画布截图：[主菜单](visual/01-menu.png)、[选角ready](visual/02-character.png)、[祝福开场](visual/03-neow.png)、[自然两项祝福](visual/04-neow-offers.png)、[祝福结果](visual/05-neow-result.png)、[地图](visual/06-map.png)、[首战](visual/07-first-battle.png)。没有用效果图替代实拍。

R1实际实拍曾发现选错图库背景（面板被拉满屏、遮挡HUD）与暗气泡黑字，本轮拒收并修正；原始失败画面及报告留在 .artifacts/noncombat/r1-visual。R2亲审确认顶栏完整、气泡文字清晰、选项可读；原稿差异如上保留。

## 黑盒与性能

同一实际候选自然点击菜单→选角→Neow→地图→首战；选择最大生命祝福后80→88，真实地图节点进入 combat。20次选角返回控件数始终18352，首战18446，各runtime根销毁0，Lua faults0，源码/save/SDK摘要前后稳定。包含三页各120帧idle。原始SDK报告 `sdk.json.gz`，画面/输入报告 `visual.json.gz`。

SDK CPU step 682次：P50 **8.50ms**、P95 **17.29ms**、P99 **20.78ms**、最大 **30.68ms**。历史R12和拒收R1报告分别保留；它们不是同源码单因素A/B，不据此宣称提速。

独立浏览器计时与截图、SDK分开执行，Intel Iris Xe / ANGLE D3D11，0 pageerror、510 draw。归档加载 **12.10s**，导航→观测正帧 **7.59s**。六段点击→页面变化后实际 renderer.render 返回：菜单→选角 **295ms**；确认→祝福 **1214ms**；开场→选项 **210ms**；领取祝福 **163ms**；结果→地图 **251ms**；地图→首战 **687ms**。原始报告 `browser.json.gz`。这组比R1单次浏览器采样更慢，**不宣称浏览器提速或完全流畅**，首次加载与确认后的等待仍是未完成体验项。

沿原战斗SDK、私有typed snapshot、leading16和原Pixi ticker。这些是Simulator兼容/加速，未移植为游戏本体优化；未采用NO-GO差分/Tween实验。CPU/renderer时间不是显示扫描延迟、GPU FPS或原神性能。

## 验证与待办

27项官方flow/runtime等、22项visual/lifecycle、15项新布局/可读性合同通过；真实Lua菜单四态、退出和两种结果往返通过。工程345模块、1953依赖、5919测量，无新增Luacheck；M1–M4负控和6项原生合同通过。独审发现的历史源码身份/测试inventory遗漏已追加完整来源前驱证明和明确unmeasured登记，CI合同51/51复验通过；原gzip、计数、预算与断言保持。首次79项的失败及76项通过日志、最终51项报告均保留；最终独审和Hosted Full以PR状态为准。

基线 develop `3a061a76`，#607已合；#621仍在既有自动合并队列，未重复移植。本候选尚未纳入#621净增量，需其合入后更新基线再验证最新战斗全流程。当前PR为Draft且无Auto-merge。官方导入、新ready、PC/手机实测、官方容量及发布验收全部未执行，不勾相应AC。

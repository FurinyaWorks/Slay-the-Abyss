# 选角与战斗共享57图元：控制变量候选

按用户2026-11-11追加决定，非战斗选角先直接复用战斗的同一份 `Asset.battlePixel`（57图元），固定角色资源这个变量，优先排查页面、加载与交互。不是重画一个近似角色，也不是把原画像调低清晰度。原4315图元画像、V25和legacy路线仍保留；主菜单原高图元背景未动。

既有controller、按需准备、缓存和页面生命周期继续使用。单角色隐藏的旧头像不创建，选角和战斗各自持有原有host，不引入新UI架构或规则。缺共享像素资源时明确失败，不偷偷切回原画像。

生成物将显式标记选角使用battlePixel。新版工具不能仅凭模块内存在战斗像素资源就把旧R6的4315选角误报为57；旧无标记official生成物要求使用其固定producer读取。普通legacy/V25仍保留原合同。

## 同源候选

R7 build `91df6805-3e0f-4fe8-ac02-125ac6687d3b`，构建提交 `9cfeb96ba10d4da0d4f0d0802756ab59a50e07c5`，生产修改固定于 `d67163bcec017ec1073659e4138cd48438d35e6c`，收据实际 **sourceDirty:false**。

本机试玩：<http://127.0.0.1:55877/>。自然菜单开始，选角确认后按祝福流程进入地图、首战。最终仅留干净R7服务PID29756、HTTP200，测试与计时实例已停止，原战斗52608入口未动；[最终绑定](low-pixel/FINAL_BINDING.json)固定同候选与各报告摘要。入口为Simulator，不是官方客户端；本地重启脚本 `.artifacts/noncombat-low-pixel/start.ps1` 固定本轮GIL/save摘要，通用复现方法见[已有工具入口](../../../experiments/noncombat-review/README.md)。

GIL SHA256 `fb137624a6cc92cf0f17b35ce724a5994e584e2eb7bf82b7d5a510cb045d1878`；实际save SHA256 `89b2ea01f8b5206ce7c157df9e8790aaf23a9b8489f0a9b71dbce8463a9d9734`。[实际读回收据](low-pixel/adapter-receipt.json)：13855静态控件、360 Lua，逆转换零差异。

[生成资源清单](low-pixel/portrait-build-inventory.json)明确 `selectionUses=battlePixel`；选角和战斗均57图元，来源SHA256同为 `b396f1af9e5c259fab4b63f973f184ffee3612404a8abc993d65fe698e8a65e0`。静态清单仍包含457图元头像作为可见多角色路线资源，不代表本候选实际创建；实际隐藏头像owned=0。

## 实际SDK与画面

同候选[SDK报告](low-pixel/sdk-lifecycle.json.gz)28项通过：冷菜单120帧保持13497控件/角色owned=0，首次选角57图元/owned59，快速退出重进及20次暖态均13556，隐藏头像始终0；HP80→88、Neow到地图首战、正常结束回合直到真实败北、原结果样式、再启程到新Neow均通过，最终根0、faults0、源码摘要稳定。相比原画像R6，暖选角总控件17886→13556；这是用户授权的临时角色替换，不是原画像等画质提速。

57图元在初始两tick内可完成，快速取消前可能已经ready；不把这次实际SDK观察冒称原画像半途构建取消。分帧暂停/恢复边界另由既有运行时测试验证。

同候选[浏览器黑盒](low-pixel/browser-blackbox.json.gz)HP分支21项、Lament分支9项通过，0error：菜单四态/拖出取消、退出遮挡和取消、初始牌组10卡/遮挡确认/关闭返回、双击开始、自然双祝福、地图首战与真实Defend。Defend实际令手牌5→4、能量3→2、格挡5；Lament首战敌人生命1。没有修改游戏状态来跳过这些路径。

亲审实拍：[菜单](low-pixel/visual/hp-01-menu.png)、[退出确认](low-pixel/visual/hp-04-exit-confirm.png)、[57图元选角](low-pixel/visual/hp-05-selection-ready.png)、[初始牌组](low-pixel/visual/hp-06-starter-deck.png)、[自然祝福](low-pixel/visual/hp-08-neow-offers.png)、[地图](low-pixel/visual/hp-10-map.png)、[真实防御出牌](low-pixel/visual/hp-12-defend-played.png)、[Lament首战](low-pixel/visual/lament-11-first-battle.png)。大块像素角色符合本轮控制变量决定；不把它称作原V25立绘还原或原图同画质优化。新图片已逐份登记现有许可清单的准确SHA，原检查器未改。

## 首次显示和性能

最终[独立浏览器计时](low-pixel/browser-perf.json.gz)在新服务、单会话、无截图/SDK压测并发下执行，沿原renderer/SDK；Iris Xe / ANGLE D3D11、391次draw、0pageerror。

| 本次观测 | R7 |
| --- | ---: |
| 首次归档加载 | 11.469s |
| 导航→观测正帧 | 7.641s |
| 点击菜单→选角页面首变 | 242ms |
| 同次点击→57图元角色完整显示 | 305ms |
| 确认选角→Neow | 998ms |
| Neow开场→选项 / 领取 / 结果→地图 | 168 / 158 / 240ms |
| 地图→首战 | 523ms |

角色计时以main host有效可见后的实际 `renderer.render` 返回为界，检查器确认60完整节点（57图片+分组/页面/host），不是页面切换先出现就算ready，也不等于显示器扫描/GPU帧率。原画像R6曾为3743ms，本轮临时角色减少了首次角色等待，但两版美术内容不同；不称同画质优化、总启动改善或已经完全流畅。归档和确认到Neow仍有等待，未为Simulator时间改动卡池、文案、地图生成或规则。

[实际GIL差异绑定](low-pixel/r6-r7-binding.json)确认R6→R7完整interface对象完全相同，360模块中357摘要不变；改动为角色资源、角色controller，及仅打印build UUID的一行 `abyss_ui`。因此R6宽屏与四行压力夹具只为不变布局/命中/间距/裁边提供继承证据；新角色画面和计时采用本页R7新数据，不继承R6画像质量。

## 源码与检查

共享绘制及缺失源失败用例先复现后转绿；标记用例同时证明旧无标记官方模块不能被误判为57。原始[失败日志](low-pixel/schema-red.log.gz)、[最终42项通过日志](low-pixel/schema-green.log.gz)及[旧R6拒读](low-pixel/historical-reader-rejected.log.gz)保留。早期shared-red中的一次Python EPERM属于执行权限失败，不作为功能缺陷证据。

来源接续保留原归档、断言、测试库存和预算：CI合同51/51，fresh/drift来源负控2/2，12份完整输入负控108项通过。归档前后绑定 `bd9fc7ee` → `d67163bc`，见[完整源清单](low-pixel/source-generation.json)与[输入负控](low-pixel/source-input-negative.json)。没有用增加文件数或跳过历史测试解决失败。

最终工程345模块/5919测量，Lua无新增诊断，14项显式历史警告、2122项责任指标保持。可选relic-query初始化被停止仍记未完成；Hosted Full以PR实际作业为准，不借用旧绿灯。

## 范围与未验项

[R6完整复查](REAUDIT.md)和旧图片仅作历史基线；原画像的3743ms首次ready不能用于此低图元候选。菜单底图、命座和Neow人物细节仍有已记录的V25差异，本轮不宣称完整原稿还原。四项祝福组件压力图是标注的独立历史夹具，非自然首局证明。

最新核对 `develop@3a061a76b5eb917ac0f4213c01a9cbafd28d1824`，#621仍OPEN，未重复移植其增量。合入后仍需更新基线再验证最新战斗集成。本轮不合并、不发布。官方导入、新ready、官方容量、PC及实体手机未验，TASK-103.3保持In Progress；Simulator计时不代表游戏设备FPS。

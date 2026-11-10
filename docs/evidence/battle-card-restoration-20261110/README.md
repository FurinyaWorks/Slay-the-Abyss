# PR #588 卡面还原续轮

用户再次指出卡牌整体美术未还原。本轮继续只改战斗卡，不制作主角/怪物，不打开原神，不合并发布。结论：卡壳结构及费用/标题明显差异已修正并实际试玩，仍有字体、纸面纹理、软边和加载/长帧差异，**不声称还原一致或流畅验收通过**。

本记录保留先完成的 `2ef2c895` 视觉/时钟诊断轮。推送前又接续远端 `4278561b` 主题保护，最终交付身份与同候选结果以末尾“最终主题保护接续”节为准，不将旧轮结果冒充新候选实测。

## 参照和纠错

沿用批准源 `7e40d2d361fff6b9c89d9f409db29a9d8ac44352`、冻结截图及私有原稿运行页。本轮重新打开原稿，实际读取最终 computed style/offset：卡150×210；技能窗126×86.09375；标题159×37.7969、13.5px；费用40.9844×41、25px；正文12px、类型8.5005px。`project-card-theme.css` 覆盖早段 `sts-battle-restore.css`。中途只读早段CSS、误判120×77.7及手牌落位的实验已明确撤回，最终保留原窗口、图标、手牌tokens。未把错误判断写成已查明根因。

原型使用自带字体及私人卡框纹理；本候选继续用官方原生图元、有限几何、原SDK。项目原有字号最低14不放宽，因此标题取14、正文/类型仍与原稿存在大小/字形差异；不以预览专属贴图伪造GIL效果。

## 实现与本轮身份

- 战斗卡恢复圆角金属壳、浅金包边和暗色正文底；隐藏旧方形 flat/纸底，保留原控件句柄。卡壳18片；费用6个原生圆；弧形标题8组背衬/面层+2折角。每张新增约51个含容器控件，总增510，未恢复PNG数千图元。
- 标题带先画全部背衬再画面层，修复第一轮实拍中的深色分段细缝；稀有度面色缓存为弱键，仅变化时写8面层。费用球41px，跟随真实无费用卡隐藏；原数字/红绿费用/方向和输入owner保持。
- 修复实际预览适配错误：GIL文本506字段只在显式关闭描边时存在，读回缺省代表开启。旧转换 `outline===true` 错把缺省当关闭；现为 `outline!==false`，增加双向outline校验。实际最终五张费用paint均为 `enableOutline:true`。
- 生产代码提交 `dd13a97ab659e77e3659756074019ede9ceccffb`。最终候选在该提交前构建，收据真实为HEAD `20a23f00`、`sourceDirty:true`，不冒充提交后重建。
- buildId `2ef2c895-95ee-41de-8014-f16e6e19e72f`；GIL `build/pr588-card-match/2ef2c895-95ee-41de-8014-f16e6e19e72f/candidate.gil`。
- GIL SHA256 `58e656c617ad755040f4dac09caa5e020d92a25f7b0f539235479c3e0d8e86b7`，14095987字节（不是官方容量）。实际读回12914节点、359 Lua、inverse faults=0。
- 本机最终证据 `.artifacts/card-shell-20261110/match-final/`；actual.save SHA256 `41ec33c67e2e8fd2f9fbc574145e28039acf49c62a779d0a4aad20eb049183bb`。五/十牌派生夹具沿用显式GameUI入口注入收据，Core与数值未改；不宣称夹具GameUI与GIL逐字相同。

## 实际画面与操作

最终同候选真实截图：`whole-five.png`、`card-hover.png`、`manual-whole-five.png`、`whole-ten.png`。前几轮截图在 iteration-one/final/reference-final/ribbon-final/reviewable，明确是迭代记录，不能替代最终候选。

最终普通五牌实际拖出防御，能量3→2、护甲5，点击弃牌堆文字后显示防御1张，见 `discard-open.png`、`manual-discard.png`。十牌连续成功打出3张：两防御一攻击，能量0、格挡10、敌方32→26、弃牌3、剩7手牌，见 `ten-three-plays.png`；之后实际结束回合，进入第2回合/弱化显示，见 `ten-next-turn.png`。没有把鼠标尝试次数当成功命令数。

## 预览启动缺陷及可玩入口

旧4174与隔离服务曾发生默认worker8秒/client15秒启动超时，失败原样保留，不能报加载通过。整工程索引与空闲内存约2GB的环境也影响冷启动；尚不能将这些因素认定为唯一原因。独立SDK和HTTP启动路径成本分别报告。

为继续实际检查/试玩，独立副本 `.artifacts/card-shell-20261110/preview-web/` 保留原LICENSE、package、NATIVE-PROJECTION及原依赖junction；实际GIL/save未改。使用SDK已有 manual clock，view读取时以夹在0.001–0.25秒内的墙钟dt推进一次UI更新，避免实时追赶积压；仅该离线浏览器桥接改变。worker观察窗口30秒、浏览器60秒，**不是提高游戏或验收预算，也不是加载性能达标的修复**。收据为 `preview-host-receipt.json`。

实际手动模式五牌启动请求22.07秒；后续十牌请求7.15秒、页面到可见约8.14秒（到截图含2.5秒等待共10.64秒），变化很大，不能承诺固定启动时间。十牌137次异步 applyScene完成计时，12.26秒窗口，P50 4.5ms、P95 10.2ms、最大25.3ms，见 `browser-manual-timing.json`；这是离线投影绘制成本，不是GPU FPS、官方帧率或原始realtime模式性能。

该计时不含取图、worker stepping、网络及呈现间隔；慢请求超过0.25秒的墙钟会被丢弃，不能证明正常realtime模式平稳。独审发现的暂停轮询仍推进问题已修：暂停时普通get保持get，只有显式单步才step，start/resume重置墙钟。未修改原worker/renderer。

专用服务4177已验证无需浏览器拦截即可加载和实际出牌；旧4174用户会话未被重置：

- <http://127.0.0.1:4177/editor/play#card-battle-five>
- <http://127.0.0.1:4177/editor/play#card-battle-ten>

刷新重开；首次加载需等待。服务使用仅含两个save的 `play-workspace`。本机重启命令（保留上述私有预览副本）为：

```powershell
$env:QXQY_PLAY_TIMEOUT_MS='30000'
node .artifacts/card-shell-20261110/preview-web/dist/server.js --workspace .artifacts/card-shell-20261110/play-workspace --file battle-five.save.json --port 4177
```

十牌会话需按原工具 `load-archive` 预载 `battle-ten.save.json`；默认文件为五牌。私有原稿纹理、SDK及二进制不提交仓库。

## 验证边界

最终独立SDK报告为 `.artifacts/card-shell-20261110/final-five-perf.json` / `final-ten-perf.json`，两者来源前后哈希稳定、faults=0。预览页在采样时关闭；此类Node/Fengari update仍不是设备FPS。

| 同候选SDK测量 | 五牌 | 十牌 |
|---|---:|---:|
| 冷初始化 | 2000 ms | 3515 ms |
| 稳态120 updates P95 | 12.26 ms | 14.54 ms |
| 真实连续出牌 | 3张 | 3张 |
| 连续出牌update P95 | 19.99 ms | 46.88 ms |
| 连续出牌update最大 | 57.37 ms | 115.33 ms |
| 20次牌库开关后活控件 | 12890，稳定 | 12890，稳定 |
| 20次地图预览往返后活控件 | 12890，稳定 | 12890，稳定 |
| 根销毁后句柄 | 0 | 0 |

`match-ten-perf.json` 为与隔离服务冷初始化重叠的诊断轮（最大274.89ms），保留但不拿来作独立基准。最终报告也有长耗时，不能宣称完全不卡顿。牌库/地图往返不等于20个新战斗；句柄清零不等于GPU或系统内存完全释放；控件总数包含隐藏页。

最终素材配置/可读性/真实Host共15项通过；现有配置合同覆盖旧纸底隐藏、18片标题叠层、费用球尺寸及原窗口。工程检查344模块、5880完整测量，无新增诊断，4变异被捕获、生命周期6/6。guide/backlog/diff检查通过。不是完整npm run check或当前远端Full。

历史源码原档均不改，另增 shell完整两文件凭据，绑定 `94327916→dd13a97a`；压缩SHA `83be6994fc2fbdbec7e296b09cd0b90c132c0d00b0dea9a33c67c53a1eef0a53`、内容SHA `16e1ff008162f9b22fef9cc4063d46bcc13ad8f84d3f99cd03165d3d8a89a3cd`。旧漂移、删除、未知输入负控和LF/CRLF身份继续执行，18项通过。独审生产8文件摘要 `aabc2a0ab65e2dab5cef3913053379872ea21d794b40281b02f29ed513267e14`，历史接续3文件摘要 `7af4556fa7b1a08d9f152ebf60412d536c04190096faee7a1b47d3f7d1012d85`，无未解决P1/P2。

官方导入、新ready、PC/手机FPS、官方容量及GPU/系统资源释放均未实测；未打开原神、无有效录像、未发布。TASK-103保持In Progress、PR保持Draft，不勾完整还原或设备验收项。

私有时钟桥接经独立复核，暂停P2已修；worker、renderer、LICENSE、package与原副本逐hash一致。修后私有play.js SHA256 `c23e51046854a3518408de0a470eedb45a042274db90f1f71c78e9a9712dd557`。浏览器实际暂停、单步、恢复证据为本机 `pause-evidence.json`，不计入游戏候选原生性能通过。

## 最终主题保护接续（交付身份）

推送前接续远端 `4278561b`，保留其装饰主题保护和严格lookup测试。本轮标题查询只在官方profile执行，费用球查询同时限定官方profile与battle scope，官方必要组件缺失明确失败。旧主题、官方牌库/其他卡宿主不探测新增节点。生产提交为 `95fab6acf45c5292d6a48dbe7c9cf12d5e6e03b2`，来源接续提交 `39cd335e9356042a3c602fe44ae22cf40a664928`，均已正常推回原PR。

最终buildId `7b2cd15d-720a-44d8-9746-5be701ac724e`；GIL `build/pr588-card-integrated/7b2cd15d-720a-44d8-9746-5be701ac724e/candidate.gil`，SHA256 `8539f388d9d22661a7cc365071bd9d93fb03802188425cc11516573e0caeb2b9`、14096392字节。实际读回仍12914节点、359Lua、0faults；actual save SHA256 `943dee08bb0ac15d5691e06244ac5a9dbc66e2e2ca9ffd4890fb1e8aab6433d6`。最终读回控件树与先前实拍2ef2c895的控件树逐字JSON比较完全一致；该比较仅证明视觉树相同，不替代最终候选运行证据。

最终产物位于本机 `.artifacts/card-shell-20261110/integrated-final/`。SDK独立五/十牌报告 `integrated-five-perf.json`、`integrated-ten-perf.json`：输入前后稳定，faults=0；各成功打出3张，20次牌库及20次地图预览往返后活控件12890稳定，根销毁0。首次十牌采样被系统终端错误中断且未生成报告，未计成功，重跑另有真实结果。

恢复服务后还实际打开最终五牌/十牌，保存本目录 `whole-five.png`、`whole-ten.png`；实际五牌拖出防御并打开弃牌堆，保存 `discard-open.png`。这些为7b2cd15d本候选浏览器画面，不依赖前轮视觉树等价推断。系统中断后的Node会话曾缺少旧绑定，直接spawn受限，已通过独立无头CDP恢复；未操作桌面或打开原神。

| 最终同候选SDK测量 | 五牌 | 十牌 |
|---|---:|---:|
| 冷初始化 | 1767ms | 2330ms |
| 稳态120 updates P95 | 11.02ms | 13.92ms |
| 连续出牌update P95 | 32.02ms | 45.32ms |
| 连续出牌update最大 | 93.14ms | 131.47ms |

上述为SDK CPU update，仍有长耗时，不能声明流畅达标。相关素材/运行时17项、精确来源18项通过；最终工程5880测量、4变异、生命周期6/6通过。新增两文件shell档案尚未提交时按最终生产提交生成，实际绑定 `4278561b→95fab6ac`：压缩SHA `6184f4e377056b5e9c8a25ab4282556c152f1228a1436fa2cfa67196697dde22`、内容SHA `f8095e7288e4e8556922500089f64c1a5adade0b61b37e750e319cbe38d34342`。此前所有已提交原档不变；最终投影为shell→banner→alignment→原档。早期未提交dd13档案已被该最终凭据取代，不用于当前验收。

独立复核生产/历史6文件摘要 `080aad9f993293f3a20c7f89b81553552cc810c142831986fbea98c532401baf`，无剩余P1/P2；本节覆盖上文旧接续轮的hash及提交身份。

最终独立入口预载 `battle-integrated-five.save.json`、`battle-integrated-ten.save.json`：

- <http://127.0.0.1:4177/editor/play#card-battle-final>
- <http://127.0.0.1:4177/editor/play#card-battle-ten-final>

若重启服务，默认文件使用 `battle-integrated-five.save.json`，十牌按load-archive预载。系统会话曾中断本轮服务，已恢复；长加载与此前失败均保留。仍保持Draft/In Progress，未合并发布。

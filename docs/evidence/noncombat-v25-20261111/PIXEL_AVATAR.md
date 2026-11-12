# 发版选角占位与批准稿按钮

R7的岩徽及棕色按钮已被用户明确拒收，旧黑盒通过不构成视觉验收。用户最终为赶发版明确采用最小占位：选中卡只显示对应角色首字，“荧”“雷”，不再制作/查找头像或命之座素材。保留之前有效的按钮、流程和加载修复，其他细节以后优化。文件名沿用历史入口，不代表当前仍用像素头像。

## 当前实现

- 选中卡仅有一个居中的原生文字控件，保留原选中框及高亮。旅行者显示“荧”，其他角色取名字的首个完整UTF-8字符，例如雷电将军显示“雷”；不改变角色开放或玩法规则，不创建头像/图标、不增加运行时架构。
- 返回/开始挑战恢复原稿红/青旗帜、曲线轮廓、金字和四态亮度。disabled与normal画面相同，既有接收器继续负责禁用；hover为1.18、pressed为0.92。使用有限原生扫描带与曲线采样，尚有台阶、字体、渐变与阴影差异，不称SVG/CSS像素精确还原。
- 恢复灰色钱袋、生命/金币前缀，去掉原稿没有的默认辅助行，保留真实notice错误提示。原立绘资源、完整源码其他角色及规则保持，主角色仍为用户指定57图元；背景留技术评审。

生产源固定于 `6702ed26d779eec4d237aa991471b0344c3c3f92`。三份既有选角/官方素材测试共18项通过；真实Lua覆盖荧/雷、资源文案及notice。原命之座1777图元方案、17图元头像及相关采样管线均不属于当前占位方案；历史记录保留，不把旧截图或成本套用于新候选。

## 验证状态

最终干净候选 `e13bdaa2-3c7f-4e3c-97fb-af9ca02f0d88`，构建来源 `8c882428d18d48bf555a3cadbfab6688215fcf7d`、`sourceDirty:false`；[构建收据](pixel-avatar/actual/candidate.json.gz)、[实际GIL读回](pixel-avatar/actual/readback-receipt.json)、[转换边界](pixel-avatar/actual/adapter-receipt.json)留存。GIL SHA-256 `20762a798d701359a9aada33829928cfa39a8d3a6165bf79cc80caaffc5ced37`；实际save `1c3d671d3d96168f3b7852ca1ec008289cd90d8931ad41ec77e9d5aa289367ea`。

实际Simulator [选角整屏](pixel-avatar/visual/hp-05-selection-ready.png)与[单字近照](pixel-avatar/visual/selectedInitial.png)已亲看，“荧”居中、无头像/命座；[祝福](pixel-avatar/visual/hp-08-neow-offers.png)、[地图](pixel-avatar/visual/hp-10-map.png)、[首战实际出牌](pixel-avatar/visual/lament-12-defend-played.png)保留同候选证据。原生字体、旗帜扫描带的画面差异继续如实保留，不宣称完整原稿还原。

[SDK31项](pixel-avatar/actual/sdk-lifecycle.json.gz)通过：实际首字visible、坐标0/0、font54；冷控件14128，20次暖选角14187完全稳定、无fault、销毁根0；自然败北与重开得到新Neow。实际浏览器走通主菜单→选角→两条祝福→地图→首战，生命80→88和Lament敌生命1成立，Lament正常打出防御。HP末尾旧脚本假定随机起手必有防御，当前自然手牌均攻击导致脚本失败；保留[原始报告](pixel-avatar/actual/browser-report-original.json.gz)，不改种子/牌序、不把其末尾断言记绿。

本轮[质量检查](pixel-avatar/actual/quality.log.gz)345模块/5919测量；[Lua静态检查](pixel-avatar/actual/lua-static.log.gz)无新增诊断、14个明确历史警告。SDK计数属于生命周期/分配证据；最终单字版本尚无新的浏览器冷时或设备FPS结论，旧R7的305ms、命座或17头像实测均不套用。

Full失败按原日志分为Windows字节换行、历史reader漏接来源层、历史拖牌回放超时三类。真实Windows checkout负控转绿；6项历史读取及79-owner来源负控通过。拖牌文件同次9/9通过，全部原15个Lua用例按7+8执行，首片冷导入、准备、构建及VM均在原30秒可终止硬截止内，实测26.219s/22.707s；逐次完整鲜读、漂移/删除/foreign负控、完整失败输出和临时根清理保留。这是测试准备成本修复，不是游戏或Simulator性能收益，详见[独审](pixel-avatar/ci/ci-c-independent-review.json)。

单字方案最终来源校准[同次51/51](pixel-avatar/ci/ci-final-calibration-a0e21755.log.gz)通过，[225项纯输入负控](pixel-avatar/ci/ci-final-pure-input-negatives-a0e21755.json)通过；[25份完整来源和4份新输入](pixel-avatar/ci/ci-final-provenance-generation-a0e21755.json)固定到来源提交a0e21755、生产6702。[独立54条完整Git来源及4新增字节核验](pixel-avatar/ci/independent-initial-provenance-8c882428.json)通过。原归档、SHA/计数断言、库存和预算保持。Hosted Full仍须以最终PR实际作业为准，不以本地校准冒充全量CI。

## 集成边界

独立复核已确认本切片自身构建/runtime闭包完整，不依赖#621未合入代码，PR使用 `Depends-on: none`。#621战斗增量未重复移植；其后续合流和最新战斗联合验收仍需另行完成。用户最新授权在修复、验证、独审通过后按 `merge:auto` 进入原生队列，不发布。

官方导入、新ready、官方容量、官方PC及实体手机未验证。任务保持In Progress；Simulator的截图和时间不冒充设备帧率。

## 试玩

本机入口：<http://127.0.0.1:55877/>。启动脚本：`.artifacts/noncombat-initial-final/start.ps1`；实际GIL：`build/noncombat-initial-final/e13bdaa2-3c7f-4e3c-97fb-af9ca02f0d88/candidate.gil`。此为私有Simulator实际读回，不是官方客户端。

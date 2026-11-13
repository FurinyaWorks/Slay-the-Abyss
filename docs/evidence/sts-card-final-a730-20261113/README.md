# 冻结共享卡面：最终 SDK 组件与成本证据

生产冻结点：`a73043a738cd5c6d11b3f6a66ef7383cbd463c01`。这轮没有修改生产源码或强开美术 flag。总体数据见 [summary.json](summary.json)，生产文件、采样器封存与兼容输入身份见 [sampling-identity.json](sampling-identity.json)。兼容采样器没有启动时封存的旧 hash，没有事后补造；其冻结模块/完整输入字节、原生状态与 PNG 可独立核验。**这是 SDK 软件组件证据，不是官方导入、GPU、手机或全材质完成证明。**

## 两个验证边界

1. **正式入口组件**：真实 `buildUI({officialAssets:true})` 生成卡面和 Lua，实际 flags 为 `cards=false, menuBackground=false, selectionAvatar=true, battlePortrait=true, monsters=false`。抽出其共享卡面作 1/5/10 同画布静态夹具；CardSkin/Display 真实首写，不是矩形代替图。正式截图见 [单卡](cost-r6/candidate-1.png)、[五卡](cost-r6/candidate-5.png)、[十卡](cost-r6/candidate-10.png)。
2. **独立 readyArt 兼容回归**：按真实顺序 `gameLayout→attachReadyCardHosts→applyOfficialAssets`，投影原生 image/group 模板，显式配置原 NativeArtRuntime。用原 precise+converted 资产，`compact:false`，平台参数沿 `abyss_ui`，没有采样降档。该受控注入没有冒称正式 `cards` 已启用。截图/状态/日志见 [compatibility-r5](compatibility-r5/report.json)。

## 同口径成本

Windows x64、Node 24.18.0、SDK 0.5.2、1600×900、manual clock。同一文字、卡位、背景；每组 3 次预热、5 次记录，顺序交替。主线程协调无其他重任务的短 CPU 窗口，一轮结束即释放，没有扩样追结果。原始数组、SDK 返回版本、PNG 与状态见 [cost-r6/report.json](cost-r6/report.json)。

| 卡数 | 旧软件 PNG+RPC 中位 ms | 新软件 PNG+RPC 中位 ms | 本轮变化 |
| --- | ---: | ---: | ---: |
| 1 | 66.56 | 57.68 | -13.35% |
| 5 | 117.56 | 100.45 | -14.55% |
| 10 | 129.64 | 133.14 | +2.70% |

样本有波动，这张表不证明普遍加速或 GPU 无损；十卡增加如实保留。计数来自实际 SDK 控件树，包含祖先可见性与透明度。每卡基线/候选均移除交互 `hit`，其余原语义句柄保留；画布根与背景另计。

| 每卡，含隐藏态 | 旧 | 新 |
| --- | ---: | ---: |
| 总控件 | 243 | 352 |
| 总 image | 192 | 304 |
| 总 text | 6 | 6 |
| 可见控件 | 105 | 167 |
| 可见 image | 83 | 144 |
| 可见非空 text | 4 | 4 |

因此静态控件 **+44.9%**，总 image **+58.3%**，可见 image **+73.5%**；没有把“固定池没有创建/销毁”说成与旧版同成本，也没有把绘制项称作 GPU draw call。完整正式源卡仍含 `hit`，比这里各多一个输入控件。三牌型共用 142 槽，实际攻击/技能/能力分别显示 48/68/142 框槽，能力并非攻击卡的绘制成本；本配对测的是相同攻击卡内容。

旧基线使用此前已校验的原始静态夹具字节重放，没有用新布局套旧 snapshot。三份 save SHA 已在 [preflight-r6](preflight-r6.json) 重新核验；不是当前完整旧版 GameUI 性能回归。

## 实际复用与原生插画

同一个真实 face 经九阶段：`bash attack→armaments skill→inflame power→bash→offering rare→burn→regret→bash→perfected_strike 升级`，每阶段各抓 pending 与 ready，共 18 张。1834 槽的 precise Armaments 与 converted 图均由原 runtime 分帧分配，日志真实出现 `ABYSS_NATIVE_ART ready`，每更新最多 64 次创建。换牌后旧 art 子树从当前树移除，pending 回到 353 控件，不把这项推成 heap/引擎内存验收。

- [攻击真实插画](compatibility-r5/phase-1-bash-ready.png)
- [技能 precise 插画](compatibility-r5/phase-2-armaments-ready.png)
- [能力插画及蓝色稀有度](compatibility-r5/phase-3-inflame-ready.png)
- [稀有金色](compatibility-r5/phase-5-offering-ready.png)
- [最长样本升级全文](compatibility-r5/phase-9-perfected_strike-ready.png)

实际断言包括：142 框池余槽隐藏与变换复位；银灰→蓝→金→银灰 frame/banner RGBA；状态 `#646464`→诅咒 `#1D1D1D`→Geo `#5B472A` 恢复；holder 144×64 源坐标、位置 `[0,37.5]`、两轴等比 `5/6`；pending fallback 与 ready pool 切换；完整文字属性、正文/标题最低 14、升级标记保留。最长样本实际 `fits=true`，不据此声称所有原版长文或手机均可读。

18 份真实 SDK **paint 队列**独立证明：back 所有绘制项在 art/fallback 之前，frame/banner/front 所有项在 art 之后；不是只比较静态数组顺序。见 [paint-layer-analysis.json](compatibility-r5/paint-layer-analysis.json)。

## 可核验输入与失败记录

[inputs/manifest.json](inputs/manifest.json) 保存 7 份 gzip 输入的压缩/解压 SHA：三份旧基线、三份正式候选、一个兼容夹具。它们是 source-generated SDK 工程，绝不是 GIL 读回；没有原版 StS raster。所有截图与这些输入 archive 的 hash 已在收口时读回核对。

准备器先修正了 SDK 无 `package.preload`、需 `EnableUpdate(true)`、precise 需真实 `imageTypes` 等夹具边界；初次成本 host 的 `for 0,0do` 拼接也曾失败。失败没有算通过，相关输入/错误报告保留私有 `.artifacts/sts-final-a730-failed-attempts/`。最后四份输入的全部 Lua、eager registry closure、模板 GUID、挂载、142 池、正式 flag 与冻结生产 SHA 均离线预检通过后，才跑这轮有效成本。optional originalV4/prebuilt-surface 函数分支不属于这个受控入口，未伪装完整 GameUI require 覆盖。

采集脚本在 `../sts-card-reference-20261113/{prepare-final-sdk,preflight-final-sdk,capture-final-sdk}.mjs`，成本目录另封存当轮采集器源码 gzip。生产 geometry/behavior gate 与三型原轮廓 residual 沿此前 [结构记录](../sts-card-reference-20261113/README.md)，没有用最终软件耗时掩盖几何或静态控件增长。

**仍未完成**：原版费用火焰、纸面/银框手绘材质；其他职业和中性卡形状逐像素认证；本候选官方导入、GPU/手机、完整游戏设备体验。项目插画与文字保持项目内容；参照原图与对照板仅存私有 artifact。

# 共享卡牌源码与运行时独立审查

审查者 `/root/neow_reference_audit`，未实现卡牌切片，生产只读。范围：profile/installer、CardSkin/CardDisplay、官方root准入、node/choice/Match薄适配、层序、缓存、文本与主题消费。NPC是审查者自有实现，不在本独审scope。

结论：**本次源码/运行时接线限定pass，无遗留代码发现；最终整合视觉/设备验收尚未取得。** 精确源码与主题范围绑定见independent-review-hashes.json，不沿用旧单root或旧低成本轮廓的通过记录。

线性整合后部分新文件由Git转为CRLF，第一次raw checkpoint校验因此拒绝出具摘要。已逐项核对七个作者checkpoint：均与当前raw或LF规范化之一精确相同，没有未解释的语义漂移；报告同时保存raw/LF与匹配方式，不静默覆盖旧摘要。

已核对的边界：

- 所有官方card host走同一installer；语义顶层文字、输入、artSamples对象保留，旧卡壳子payload清空后，CardSkin/reference与Node早返避免再访问旧skin/band/ribbon后代。普通非reference路径保留。
- stsReferenceBack在art/art_*及artSamples之前，stsReferenceChrome的frame/banner/cost在其后，文字再在front之后。artSamples保持直接父和原图元坐标，仅holder统一5/6缩放，无横纵独立拉伸。既有NativeArtRuntime不必换句柄。
- 官方共用合同覆盖back/front两层；deck/pile分别变异两层位置都必须失败。Match faceFields同时隐藏/恢复back/front、artSamples与原文字，未留牌背漏壳入口。
- 三型frame使用实测profile与同一固定142槽池。首次收集覆盖隐藏槽/material句柄，之后同type/rarity不重新递归。切type只改池几何，power→attack多余槽隐藏并归零位置/旋转、恢复scale；idle与仅rarity变化不重写几何。
- 主题使用resolved官方边界：uncommon/rare从既有rarity/banner材料派生，实际生成Lua有蓝/金frame及banner RGBA断言，common往返也恢复。status/curse body及well独立于rarity，换rarity不回染Geo，回attack恢复Geo。没有仅凭raw JSON缺键认定正式丢色。
- 费用改变halo/方向/数字颜色与-2无费用仍走原机制。标题、正文和插图共用同一geometry；长文保持原字符串、最低14，不缩小插图补文本。标题首次/复用均读同一resolved typography.title，14与token改18的正例覆盖，不能被旧cardName16覆写。完整阅读继续依赖已有手牌/奖励检视及共享浏览器分页；本通过不等于所有长文在卡内都fits。
- 最后CC职责提取逐段读过：portrait验证/尺寸/位置、titleMetrics、bodyLayout/Position/placeBody、referenceKind/Ink/applyReference只分拆原责任；调用顺序、普通fallback、后缀全文与规则接口未变，未调整门槛或删原断言。

本轮最终独立实跑：geometry/installer 10/10（1.65秒）、真实Lua runtime 1/1（1.25秒）、官方root/共用合同9/9（3.42秒），合计20项；另只重跑真实Match适配/遮幕暂停1/1（4.50秒）。Match旧原生替身补的是已存在的SetLocalRotation三轴记录，保留原规则断言，未把替身缺API误报成平台故障。git diff --check通过。作者工程门禁/其余全套结果由主线程持有，本审查未重复整套。

几何证据只能按实际scope解读：三个ROI来源mask IoU约94.97%/96.02%/96.37%，最大边界0.50/0.50/0.559逻辑像素，比较有明确alpha/遮挡阈值；它不是整卡材质等效。当前静态每卡353控件/304image/6text，包含隐藏池；费用仍简化亮面、纸面平涂、未逐一量测其它职业，字体受原生最低字号限制。最终集成SDK/成本证据、官方导入/ready与PC/手机仍待主线程冻结后取得，不能把本代码通过描述为成品完全一致或GPU性能通过。

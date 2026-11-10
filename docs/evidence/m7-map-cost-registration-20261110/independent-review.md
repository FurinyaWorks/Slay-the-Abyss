# PR 591 成本登记独立复审

结论：**本地成本登记与历史合同接线范围复审通过；overall admission 仍为 BLOCKED。** 可将本包作为范围明确的登记及诊断证据交给父任务作提交/公开决定，不代表 Hosted Full、目标达成、准入、入队、合并或合后通过。

## 已核实范围

- 对照本地父 `b7edb8ef36654a920652b2c1065f3ab6753baf2f`，只增加七个 floor。全部原 33 项 floor、Hosted 成本及其他 timing 字段不变。原压缩 timing 解压后逐字等于父提交。
- 七份修改测试的 804 行 assert 方法断言及另外两行裸 assert 调用逐字保留。旧合同使用明确认证的原 Emerald33 输入；新增三项合同读取未经投影的当前40输入。完整 planner、Lua runner、worker、安全分类、超时策略、17/15形状和工作流均未改。
- 四项初审问题全部修复：runtime33/live40接线、Windows LF字节绑定、旧forecast的current标签、snapshot未实际打开。三个新合同独立执行通过；模拟缺失snapshot现会失败，完整LF/CRLF接收与漂移拒绝通过。
- 公开归档中的日志和前后snapshot压缩/解压摘要全部核实。七个不同完整文件共 **82/82** 用例，零fail/skip/cancel；初轮runtime **12/13失败** 独立保留，修复后 **13/13**。复验不叠计为新增用例。

## 最终校准与源码身份

最终完整calibration为 **48/48**，wall **14,894.074337 ms**，Node总时长 **14,790.467021 ms**，native summary **4,600.96816 ms**。完整命令无name/skip selector。最终前后snapshot相同，共 **8,296** 条，其中 **8,121** 条有摘要、**175** 条稀疏缺项为null。

最终snapshot中全部执行语义源码、七个测试、新helper、fixture、timing和属性规则与本次复审字节一致。记录范围内仅Backlog说明在运行后变动；随后新增的说明和证据不冒称已参与该轮执行。六份其他完整文件的成功保留其明确记录的较早登记候选输入，不声称其整个snapshot等于最终候选。

较慢的初轮成功calibration wall **17,543.864644 ms** 仍决定 **17,544 ms** floor；原 **13,573 ms** 保存在独立历史字段。新增观测绑定其自己的旧候选snapshot，不被升级为最终源码证明，也不因最终复验较快而降权。

- 最终timing SHA256：`46e69e006ce623f0a66197db9f03859894b27152b4e90ee24fbe24cc42ab4289`。
- 固定原timing SHA256：`2cd79700b9abe2385265a2846e4f5339a46e6da88b327b80690785371bc5b146`。
- 最终校准receipt SHA256：`939da5732e038070d0201f5257e97bfb6a749306425521657a7b58fa1600c929`。
- 最终snapshot压缩SHA256：`018f001de2566c15f402d65bef409a4da140069c8586acf1f6d55b7f4f1c40c0`，解压SHA256：`95197bbc686cff2fa9908cffd3dc1b6413b6db3517c0e66d163c77800db8a30c`。

完整逐文件源码身份、验证记录和归档摘要见 `independent-review.json`。本次是未提交工作树字节的范围复审，不伪称已有最终HEAD。

## 保留阻断

当前Windows预测 **1,801,345 ms**，超过原目标 **1,345 ms**；POSIX **1,137,425 ms**。完整800JS/1410Lua、17/15形状与60秒预留保持。Windows规范化工作量 **29,591,320 ms**，原容量 **29,580,000 ms**，差 **11,320 ms**；理想下界 **1,800,665.882 ms**，仅改调度不能清除此缺口。

没有发现剩余的登记实现阻断项。原成本目标、精确HEAD/BASE Hosted与独立准入要求继续阻断整体交付。本review只运行廉价审计及三个独立新合同，没有执行任何完整测试文件、Full、远端操作或GUI。

## 包装与工具边界

README已读回，旧独立capacity报告保留原时间点数字，不混作新forecast。doctor最初不支持 `--plain` 的失败保存在独立日志；正确只读doctor保留原五组重复ID、93个旧归档位置问题，不修复、不称通过。此次review只写本目录的 `independent-review.md` 和 `independent-review.json`。

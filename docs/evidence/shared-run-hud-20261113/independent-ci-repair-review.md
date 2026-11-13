# PR639 Full业务失败纠偏独立审查

审查者：`/root/neow_reference_audit`，非本片作者。只读生产；当前未提交工作树，精确输入绑定见independent-ci-repair-review-hashes.json，不能当committed基线或远端绿灯。

结论：**本轮纠偏限定scope pass，无遗留发现。** 业务修复、职责拆分、测试授权与历史归档均已读源，不仅依据测试绿。

- `official-run-layout`改调原styleMerchant完整投影，原merchant与既有semantic对象保留。styleMerchant按名字原地递归映射，既有文本content保留；没有用重新建树绕过原事件句柄。
- merchant的paintSpeech/advanceSpeech显式捕获同一个merchant.queue，方法仍读取self.current，begin/queue替换及随后idle判断顺序与原一致。未引入self作用域丢失、复制queue或延迟规则变化。
- deck两个helper分别承担shell布局和官方绑定，调用点保持原初始化顺序，grid仍为同一词法变量；choice/pile/permanent snapshot与回调没有更换。
- potion helper原样保留potionTint优先、fire/normal回退和alpha；测试改读真正RGBA合同，并用仅strength的旧generic tint变异证明该回归能失败。
- official-assets仍先strictEqual检查semantic对象。merchant改变字段进一步精确对比同merchantControl生成器的完整spec，并保留原动态文本；没有扩大忽略集合。potion母层scale仅在四个精确路径要求[1,1]，实际slot状态自身仍拥有scale，没有粗略豁免子树。
- 两个新before-ci-repair gzip独立与git HEAD中原gzip逐字节相等，SHA分别fa385b20797f37ca5a8c0a406d6ecdad6b4c0539c27a825e751b7eadeb4f5408、94d6f85a83a1593bbbaf34ae13986ddfbca97312e183b4e7f6b08ca58b8d911b。loader保留明确prior目标；当前源继续按完整原文/哈希授权，foreign bytes原样回退，未回写历史receipt。
- 未修改工程阈值、复杂度测量配置或原有效断言。工程346/6021、完整32行为/139epoch及CI71由作者/主线程持有对应日志，本审查没有重复整套或冒充本轮独立执行。

本轮独立执行：Node24限定6项，全部通过，17.13秒。覆盖真实药水容量/稀疏库存、错误tint负控、V25商人完整投影+旧句柄、鼠标触摸购买、迟到tap/交易生命周期、official-assets全semantic identity及精确字段授权。`git diff --check`通过。

后续提交/远端CI与精确SHA准入由主线程执行；本记录不授予发布许可、不代表官方客户端验收。

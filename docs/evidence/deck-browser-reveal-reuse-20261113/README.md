# 卡堆排序与同页揭幕复用

问题来自两个互相放大的边界：PageReveal把DeckUI保护旧输入回调的generation用作整页身份；每次排序同时丢弃已知Grid索引基值，清空全部插画，先刷1项校准再刷完整列表。即使官方cards=false、没有等待资源，同一张页面也重新等待揭幕。空列表还会卡在calibrating=true，因为RefreshItems(0)没有校准回调。旧源码独立Host的原始失败记录见host-probe.log.gz，不是SDK或设备计时结论。

修复范围是PageReveal、DeckUI、GameUIView、GameUI、UI五个Lua；没有创建新renderer或资源源。Deck会话openSession、同页内容contentRevision、旧输入generation各自承担原有职责。每个真实Grid分别记住其0/1索引基值；空列表立即完成，首次非空仍探测；之后排序仅刷新完整投影一次，保留可复用的NativeArt记录。fill显式登记deckPanel owner，避免首次打开或回调在其他ambient page下产生错误lease。

整页快发布只有明确白名单：同Deck会话唯一overlayContent变化，其它每个intent键必须完全相等；同Neow稳定房间身份的intro、blessing、result纯文案变更。该身份使用同run/act/floor、roomGeneration、flow.id/floor/mapSeed/mapSignature及event.id，允许真实事务复制flow/event子表，不把表地址当房间身份。新房间、重开overlay、不同picker、card reward、choice与其他阶段仍保留原严格准备流程。快路径在实际绘制、portrait同步、CardSkin.endFrame之后检查当前lease readiness；新资源或延迟Grid可见槽尚未就绪则继续遮挡。pendingGrid覆盖本轮此前实际可见槽的回调，不要求offscreen全部创建；EMPTY和close明确清零。未依据原生能力宣称跨face搬运同UID插画。

测试与证据：

- `node --test tests/deck-browser-reveal-reuse.test.mjs tests/sts-page-reveal.test.mjs` 最终6/6 PASS，原始全文final-regressions-2.log.gz。原四项严格request、过期epoch/reentry、未知owner失败、恢复入口、Match规则时钟暂停合同未删改。
- 真实生成Host验证官方cards=false混合卡实际显示顺序正反向变化而真实pile不变；100次排序每次仅一次完整RefreshItems、不重复校准、不新增同face/metadata NativeArt Instantiate或Destroy，也没有在同一个Lua回调中闪现cover=true。
- EMPTY→N→EMPTY、browser/pile各自1/0基值、关闭重开、新session严格准备、旧Down/Up失效均覆盖。原生API计数场景使用明确的一槽合成source绑定在真实Host faces，验证实际NativeArtRuntime复用与新lease就绪逻辑；它不是SDK渲染或GPU性能实验。
- 延迟回调负控中，三个此前可见槽仅返回一个时仍pending；全部回调后才允许就绪。已有页面绑定真正不同的NativeArt元数据时，真实lease先登记deckPanel再进入readiness，保持遮挡直到资源完成；该负控捕获并推动修复了旧ambient owner漏洞。
- 独审发现Deck快路径范围过宽后，新增picker变化及content同时其他intent变化负控先RED，再收紧为全键仅排除overlayContent。重跑对应新单位合同和原strict gate共2/2 PASS；日志exact-content-red/green.log.gz。没有为这一纯谓词收紧机械重复100次Host。
- 后续SDK诊断ff6的Neow实际操作仍产生preparing epoch3→4→5，揭示最初纯owner改stage单位探针遗漏真实事务子表替换，前一轮6/6因此不代表Neow产品验收。新增真实GameUI+Nodes.chooseEvent Host回归先在intro→offers处RED；改用上述稳定房间字段后，两次真实continue/maxHP祝福事务均证明run根不变、flow/event确实换表、cover=true调用为零。不同nodeID和真实UPGRADE_CARD→neow_card picker仍严格准备。新真实Host、快路径单位及原strict gate共3/3 PASS，全文neow-transaction-red/final.log.gz；未重复无关100次排序。原card reward strict单位负控保持。SDK最终捕获须从新源码重取，ff6保留诊断身份。
- 原Luacheck度量及原函数ratchet policy对五个owner相对冻结d359源码实跑0违规；Deck.update复杂度26→22、presentationReady15→12、新Gate.finish为12。function-ratchet.json明确只报告函数范围，完整committed架构/SCC由主线程准入验证。

production-freeze.json绑定最终五源码与新增测试的实际SHA。Gate最终收紧后其它四Lua原字节不变。证据不将Host或源码合同冒充本轮SDK、官方导入、GPU原子呈现或手机验收；自然首次战斗空弃牌、连续排序、Neow展开与结果的当前候选SDK检查由主线程独立执行。旧用户试玩服务56706未被本切片停止或修改。

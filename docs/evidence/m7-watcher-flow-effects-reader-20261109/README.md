# #586 Effects48 历史读取补全

## 真实发现及审查范围修正

已公开 HEAD `3f633f3123d41e0a0d19955c91e7b9e226722b7a` 的自然 Quality 42580941614 在 POSIX9 job129040955277 和 Windows10 job129040955054 中报告同一真实失败：Effects历史测试原109行把冻结48-owner栈中的WatcherFlow完整字节直接与新版磁盘源码比较。

此前41文件审查覆盖了原始reader循环，却漏了直接多owner等值，范围不足。本轮扩大审计实际导入13个epoch逐owner核对磁盘，逐项追踪13个临时闭包消费者、7个当前源码复制消费者、8个原始链材料化及动态导入，新增失配仅此处。完整分类及限制保存在scope-audit.json；这份范围审计不等于全部测试或Hosted通过。

仅在Effects三路径等值的磁盘输入应用既有精确preparation prior投影，保留原48-owner证明、全部三条等值与防漂移断言。其它历史用例继续使用proof-backed reader，不整体切换为当前epoch。新增LF/CRLF、追加/截断及未知路径控制，不改生产源码和任何已公开档案。

## 完整测试与成本

- Effects完整11/11，0失败/取消/跳过，22,617.633935ms。该文件此前只有unknown10000ms，没有本地floor；本次明确新增第35项floor22618，原34项完整保留。
- 最终calibration48/runtime13共61/61，18,958.78921ms。目录名称调整前的61/61日志另保留，不能视为最终输入或叠加计数。
- 间接合同三个文件9/9，19,396.198855ms。没有重跑Full或其它完整源矩阵。

实际依赖检查确认没有旧receipt/源码档案绑定Effects测试文件，故新精确历史桥接只覆盖timings一文件，不增加无必要的历史源码层。移除新增Effects项后，timings全对象与前驱完全一致。新完整测量收据绑定当前Effects源码；文本CRLF仅规范化为LF，gzip仍按原始字节认证。

802JS/1410Lua、35floors、18Windows/15POSIX完整同成本复算：

- Windows18：1,705,020ms，原1,800,000ms预算余94,980ms。
- POSIX15：1,137,392ms，原1,200,000ms预算余62,608ms。
- 同成本Windows17：1,801,639ms，仍超1,639ms。先前1,800,264ms/264ms反例另按其原冻结timings保留，不混为当前模型。

不更改预算、并发、worker、超时、unknown或预留，不降低样本值。预测余量不是Hosted实测性能或准入证明。

## 仍未完成的Hosted验证

hosted-before-fix.json.gz保留2026-11-09T08:30:29.292Z时点的部分逐作业快照及13份已获取不利原始日志：上述两份Effects失败、十份固定Luacheck下载HTTP504，以及一份POSIX1取消。该快照不是整轮最终结果。

POSIX1 job129040954716从07:48:40到08:18:57，JavaScript于08:18:53被取消，与既有30分钟job上限时间接近，但可得日志没有明确取消原因。最后完成文件是smoke-victory-healing-hud.test.mjs，不能据此推断下一文件实际执行、宣称其失败或拿部分作业时间作为完整成功floor。未获得engineering/platform结果，不当作通过。HTTP504发生在运行测试前，亦非业务成功。

Quick与Licenses绿色不能代替Quality。最终精确HEAD Hosted、正常原生队列及合后验收保持PENDING；没有手动rerun/dispatch、没有重复Full、没有使用用户电脑。

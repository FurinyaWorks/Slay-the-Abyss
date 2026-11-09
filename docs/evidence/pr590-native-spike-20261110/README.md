# PR590 原生地图回归：恢复覆盖与超时诊断

接续既有 PR590 `408342139863c449fd58b7441a6d10e5acbb93ed`，基线 `1eb288472d7b33b7450eec97a624ca2ffa526f39`。本轮只修测试执行与取证，不改 TreasureSource 或其他生产代码。

## 已确定的问题

[Hosted Full 42620426648](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42620426648) 完整37作业为34成功、1正常Fast跳过、2失败。原始失败是 [Windows5/17，129171129224](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42620426648/job/129171129224)；check为下游失败。不是安装504。第四个子进程在原30秒处超时，它串行执行curve、presentation、scene三个Lua文件。旧wrapper先断言error，丢失捕获的阶段输出。

本地复现同一超时后，新增诊断另发现嵌套JS CLI继承 `NODE_TEST_CONTEXT=child-v8`，Node直接警告跳过所有文件并返回0。修复前本地16项JS回归没有实际执行；仅凭过去绿色退出不能证明这些用例通过。沿用仓库既有ci-shards环境隔离方式，删除子环境中的该字段，不改父环境、进程隔离或执行并发。加入非空及零失败/取消/跳过/todo的TAP检查。

## 实际改动和验证

- 现有wrapper新增3项合同测试，验证child-v8/空字符串环境、超时/信号/非零退出的阶段及双流信息、空/缺失/跳过报告拒绝。
- 最终完整文件4/4；原嵌套JS16/16实际执行，零跳过。实际Lua仍同一进程同一顺序，全部原始断言、状态快照、动态读取、帧数及30秒期限保持。scene只加12行诊断；剥离这些行后与原Git文件逐字相同。
- `prove-nested-failure.mjs` 在临时副本注入真实嵌套断言失败：旧环境返回0且未执行，当前完整wrapper在JS阶段返回失败，未进入Lua。原生产断言不改。
- build:data/build:ui、verify:backlog、check:guidance、语法及diff检查通过。doctor保留原5组重复ID/93个旧归档位置警告，没有自动修复。owner、状态和AC保持。

## 仍未解决的30秒风险

本轮不是超时修复或性能达标声明。阶段观测包括原始本地超时、诊断版26.516秒通过、两项试验超时，以及撤回试验后最终Lua28.307秒通过。最终整个文件30.475秒，区别于Lua单子进程时间。Node的阶段毫秒是单调墙钟，Lua标记是 `os.clock()` 的进程CPU秒，不混用。

曾试验保留ember控件引用和字符串键排序专门路径，未证明稳定余量，全部撤回；原失败和慢样本一并保留。当前仅明确耗时发生于scene，真实准备、滚动/完整快照和交互各阶段均占用时间，不能把超时归罪于TreasureSource或宣称与其无关。下一次自然Hosted日志将保留精确阶段及捕获输出，不再只剩ETIMEDOUT。

原timings/floor、工作流、矩阵、预算、并发、worker及所有合并门禁均不变。本地完整文件时间不是Hosted观测，也不证明原规划余量安全。保持Draft，当前新HEAD的正常Hosted Full、精确独审准入、原生队列和合后验证待完成；不重复本地Full、不手动rerun/dispatch、不直接合并或操作用户GUI。无官方导入/ready/设备验收声明。

`evidence.json`列出逐文件原始与压缩摘要、当前执行输入、原run/job和验证边界；所有日志为本轮原样记录。最早一次稀疏工作树缺失实验目录而失败，补齐Git已跟踪实验及生成前置后才开始上述有效复现，未将那次缺文件认作产品失败。

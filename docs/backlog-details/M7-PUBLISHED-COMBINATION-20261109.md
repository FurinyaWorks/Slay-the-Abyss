# M7 三片已发布源码组合

## 范围与来源

本轮在独立云端工作树上，以 #564 当前 f256316c 为基线实际组合 #567 WatcherFlow、#568 Silent tactics、#569 Effects targetGroup。原分支与进行中工作的树均不修改，不引入未公开 Parasite 源码。生产先远端保全为 0df91e5e5b95a4859d6b54f70ce3bcb3ba9d0397，tree dba755e0a0acffbeb606759c024f502ea6ff3263，单父 f256。

- #567：cb0b804c23e31280fab8e69a964e7ea2319134e2。
- #568：dae93d7108afcf9fb6fb4ed937133ac69346f8f2，tree 0f9ee1403a6241a6bbf9daf87c0ee8c516d241c4，与本地417ef189相同。
- #569：a6efc662704c214b7a4ce4b0cac960bc01cc2477，tree b018bf3d3f20522ccdc38003bd2d51399ed0bcc5，与本地d998dbcc相同。

三份生产源码及完整冻结档案逐字保留。所有历史证据、#564 Battle/Scry/GameUI修复保留，不沿用单片的绿灯冒充组合通过。

## 共享合同

以 Seven → WatcherFlow → Silent tactics → Effects 组成真实48-owner公开来源链，每次授权鲜读全部48原始owner。保留45-owner原Seven、各46-owner独立分片的可执行测试。新组合测试验证所有目标的LF/CRLF、暖调用后逐owner漂移/删除、未知target拒绝、foreign输入无读、配置token/layout与raw reader不混用、隔离完整helper闭包。来源元数据采用各片命名字段，不冒称合成树已有单片commit身份。

CI只合并三项真实floor：Flow55668（旧51776记录原样保留）、Silent21636、Effects7662。完整原22项floor、托管记录、raw Lua安全权重、unknown10000、17/14分片、双worker、并发与执行预算不变。对最终timings及静态gate使用精确完整hash投影，重建每个独立分片的原始字节；任意漂移不授权删除floor。全部788 JS/1410 Lua含60秒预留预测Windows1779486ms、POSIX1187400ms，分别只余20514/12600ms目标空间。预测不是托管时延证明。

## 实际组合度量

本轮一次完整工程采集338模块、5570/5570测量：CC>30从40降至37，CC>15从216降至213，最大61。三入口为WatcherFlow12、Silent15、Effects7。SCC仍68/11/2，内部引用513/44/2；全库1929引用、1558依赖对，14旧告警保持。不宣称降环。原基线338模块摘要逐一与f256真实Git blob核对，本轮报告摘要与组合源码逐一核对。

## 验证与失败记录

机器证据入口：[index.json](../evidence/m7-published-combination-20261109/index.json)，[metrics.json](../evidence/m7-published-combination-20261109/metrics.json)，[planning.json](../evidence/m7-published-combination-20261109/planning.json)，[独立复审](../evidence/m7-published-combination-20261109/review-independent.json)。

原单片26个来源合同通过；合成来源首轮68项中67通过，失败是新用例把不需投影的CRLF输入误期待LF，遵守原透传语义修正后3个新用例通过，非生产缺陷。CI首轮36中33通过，修复完整库存预测及历史gate身份组合后39/39通过；原失败日志保留。最终组合定向测试数以index记录为准。

本轮重新执行Watcher/Silent独立旧新VM完整图及原Combat夹具四个具名行为用例，另执行Effects原始/当前VM完整图一个具名用例。第一命令的Node汇总额外计入一个未命中名称过滤的Effects文件壳，不将该壳算行为证明。原单片全部真实语义变异证据按原身份保留，未重复昂贵未改变异或全库Full。

独立复审另执行来源3/3、CI桥3/3、门禁19/19，以及136个LF/CRLF目标投影、192个暖调用owner漂移负控、39个历史timings/gate断言，无未解决项。审查绑定文件摘要，发布时另绑定最终tree。Backlog与guidance通过；doctor仍有5组既有重复ID，明确不是全绿。

## 准入边界

当前只是接续#564的独立集成实验分支与Draft交付。#564精确f256的Full虽绿，正常队列管理员身份授权仍待；不绕过、不直接合并。组合未触发新的Hosted Full、未ready、入队、合并、发布游戏或操作用户设备。待前置实际合入并复核最新develop后，再按最终精确head完成原独审/Full/原生准入及合后验证。TASK-74.20负责人Furinya、In Progress与未验AC保持。

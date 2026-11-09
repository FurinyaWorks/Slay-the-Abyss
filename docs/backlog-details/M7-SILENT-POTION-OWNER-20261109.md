# Silent Potion 的 Shiv 动作所有权

TASK-74.19 本轮从 develop `1eb288472d7b33b7450eec97a624ca2ffa526f39` 独立接续。避开在途 #579、#581、#582、#583、#584 和 WindingHalls。本片只修改两份生产 Lua 与必要依赖边界，不新增玩法或启用正式职业。

## 实际边界

原 SilentPotions.shivs 为创建 Cunning Potion 的升级小刀，直接回导 Combat 和 CardActions。药水定义/策略因此与战斗生命周期处于同一 SCC。现在由既有 SilentFinal.potionShivs 动作 owner 提供惰性工厂，只暴露 fresh、canUpgrade、upgrade、created、toHand 五个调用能力。

工厂按原顺序加载 Combat、CardActions，一次调用绑定一对模块对象，每个步骤仍现场读取其方法。保留 require SilentPotions、读取 shivs、读取 effect.value、进入 shivs、加载两个执行模块的顺序；零/负次数也先加载。每张牌仍依次 fresh、canUpgrade/assert、upgrade、两次 created、toHand，不提前验证、加补偿或改变返回数量。单次调用中的模块替换不影响已绑定对象；方法替换立即生效，后续动作重新绑定。传入 SilentFinal 的 combat 参数没有冒充旧 require 得到的 owner。

shivs 的第三个 host 参数是同步迁移的内部接口。没有默认反向 require 回退，没有可变全局服务，也未改变公共 Run 用药事务。旧历史 SilentFinal 的精确双参数版本只在其独立历史 VM 内配对相同提交的旧 Potion，不让历史代码误调新接口。

## 同源度量

两次均使用原完整 Lua AST、Luacheck 和依赖算法；完整原始报告及逐源码 SHA 位于[证据目录](../evidence/m7-silent-potion-owner-20261109/README.md)。

- 模块仍为338，测量5604/5604→5610/5610；增加六个惰性工厂/闭包测量。
- 最大 SCC 68→67，内部引用513→511，内部唯一对324→322。SilentPotions 实际退出 SCC，完整图引用总数1929不变。
- 其余 SCC 11/2 保持。CC>30 为33、CC>15 为209、最大61，14个历史告警均未变。本片不宣称CC下降或全部架构完成。
- 原 SilentFinal 全部动作入口及匿名嵌套CC15门禁保持，原 choose CC18仍明确保留。

## 本轮验证

- 新行为7/7：独立旧新 VM 的266个完整故障前缀/动态方法图，加原真实Run用药12图，逐字一致；共13,708,001字节/侧。
- 四个可解析真实语义变异被具名行为断言检出：少一次created、漏upgrade、错误卡ID、过早缓存created方法。首次后两项测试断言不充分/定位错误的失败日志保留，修正后完整文件通过。
- 原Lua三个完整文件通过：Silent potion、71卡来源、Sacred Bark高级路径；原SilentFinal完整旧新行为和变异16/16，原复杂度3/3。
- 独立54个额外配对探针通过，四个回导边界负控通过；生产、来源和行为语义独审未发现阻断项。最终精确提交仍须另外绑定。
- 新52-owner来源13/13，完整旧来源24+20与公开消费者44项通过。旧archive/hash/断言保留，当前现场读取、LF/CRLF、暖调用漂移、缺失和错误reader、损坏archive/前驱缺失均有负控。
- 静态架构、Luacheck、guidance、verify:backlog通过。当前 Backlog CLI doctor 报告基线已存在的5组archive/task重复ID，本片只追加TASK-74.19计划/记录，未自动改号或宣称doctor通过。

- CI历史/当前完整合同58/58，六个直接消费者30/30通过，未重复Full。独立复核原Git输入、所有旧成本与预算，以及两收据766项保留输入hash均一致；最终生产/来源/行为/CI增量无未解决代码项，提交身份另核。

## 成本与限制

两个完整单文件实测28,375.196147ms和25,227.153439ms，以28,376/25,228ms新增保守规划floor。全部原预算、成本、unknown=10,000、worker、并发、分片和工作流不变。旧800JS/1410Lua合同冻结原输入，新802JS/1410Lua真实完整库存另验。

现有双worker算法的Windows17预测1,797,269ms、POSIX15预测1,132,381ms，含60秒预留；Windows距原1,800,000ms仅2,731ms，不能据此宣称Hosted预算安全。早期手算1,796,641ms未模拟短夹具实际双worker序列，已由正式入口结果替代，不作为通过证据。

原始收据glob曾误抓两项未被行为/source执行的CI-only helper，导致receipt/floor/CI档案循环。已依据真实导入范围排除这两项，原收据完整保留，修正记录说明原hash；没有回填新hash冒充旧运行。source闭包负控初稿重复导入巨大历史证明曾触及默认heap，保留失败并改为精准损坏/缺失负控，未放宽内存阈值。

不重复本地Full，不占用设备、不做官方导入或发布。PR保持Draft，精确HEAD/base独审、Hosted Full、正常merge:auto/原生队列和合后验收仍由原门禁执行；未验AC不勾。

## PR #585 Quick 来源入口修复

精确初始HEAD `f36ba763a23fed8b09a6671398de721f300ff5e7` 的 [Quick 42573763876](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42573763876) 在原12个JS文件中113/114通过。失败来自Seven旧11-owner合同直接读取当前architecture配置，却与冻结前驱逐字比较；该入口遗漏本片精确前驱适配，不是可忽略的失败。原运行不追认为通过。

仅将这个历史测试入口接入既有`readSilentPotionPrior`：实时认证当前三个owner后投影精确旧配置，保留旧11/45-owner断言与全部archive/hash。原case内增加LF/CRLF × 三owner的暖调用漂移/缺失负控；固定合法输入后污染linked reader，保持foreign输入不读owner的既有语义。不改生产、成本、预算、选集或测试文件/用例数量。

本地原失败8/9可复现，最终单文件9/9、全部10个source-epoch文件121/121通过；独立复核11项旧owner等式和12个新增暖调用负控。原Quick选择器仍选同一12JS/87Lua，完整12JS复验114/114通过；初次因未准备LFS图片出现的8项失败与原入口成功下载6份图片的日志均保留，未改图片或以跳过素材测试替代通过。所有新旧失败与通过日志另存`seven-fix-*`补充证据，不改写初始收据。没有重复Full或87项Quick Lua；修复后须由新HEAD的正常Hosted CI重新准入。

## Hosted Watcher/Potion reader 组合修复

`f3534b4193019856140a3850e889fce36574bf6d` 的Quick和Licenses已成功，但[Quality 42576626252](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42576626252)在POSIX/Windows分别暴露Watcher/Potion历史来源的三项失败。前次只检查独立source-epoch文件，没有覆盖这个历史集成reader，不能以此前通过掩盖本次失败。

根因不只在测试：`preM7FinalSource` 的capability前置分支直接用旧Seven读取当前树。五个未变Lua owner先匹配历史六源身份，但新architecture配置未经过当前外层投影，形成混合epoch并被严格校验拒绝。现在公共helper与测试共享两段精确组合：当前52-owner认证→silentPotionPrior完整前驱→冻结Seven的localSeven。默认/显式当前reader和历史六源reader均验证，foreign输入仍不读取owner，没有放宽原身份校验。

同步更新独立副本的helper精确hash。新增不可变双文件repair原件，只保存f353时的m7/copy helper完整源码、SHA256和Git blob；严格匹配当前完整bytes后才能读回旧原件。已有CI档案、原运行收据、旧测量成本全部不变，不把旧收据输入伪称为本次执行的当前文件。该桥不包含自身、receipt或cost，避免循环。

Watcher/Potion原2/5失败已本地复现；修复完整5/5通过，包含全部52-owner逐项暖漂移/缺失、默认/显式LF/CRLF reader和foreign零读取。CI完整合同58/58、来源复制/集成/Seven完整60/60、四个直接消费者22/22通过。独审另核18条reader路径、104个暖漂移/缺失负控及24个foreign零读取输入。Watcher/Potion完整单文件本地实测10,723.073743ms，记录真实耗时，不宣称Hosted性能。未改生产、预算、工作流或测试文件/用例数量；新HEAD仍需原托管CI及独审/合并门禁。

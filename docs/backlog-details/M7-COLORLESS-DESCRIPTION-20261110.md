# Colorless 描述职责重构（待集成）

基线 develop：ab65ed3b5b4240eb653af4651a13c1b8c72b2e04。
旧源码 Git blob：e0e26d913cdee29aea6d522dc7cd15373fc7e34d。
候选源码 SHA256：f5b2d94fa5a8ddfe748f68782d9210b24d8552540ff296d7d03b27fafc005b00。

## 改动与测量

仅重构 abyss_colorless_cards.lua 的描述生成，按卡牌强化、移动选择、生成发现、战斗效果分组。保留原字段读取顺序、动态值、错误和文案、关键词顺序，不改玩法、公开接口或 require 边。

固定 Luacheck 1.2.0 测得 M.describe CC 56→7。新增职责函数 CC 分别为6、11、9、10、5、18；该文件 CC>30 函数减少1。不得将入口减少49理解为全库总CC减少49。SCC依赖边不变，没有SCC下降成果。

## 已验证

隔离候选完成3232项旧新描述差分（含读取轨迹和错误）、5个语义变异负控，独立复审另执行76项异常拼接和字段读取顺序探针。原有 colorless_cards、colorless_powers、colorless_catalog_contract 三个生产夹具通过；语义 lint 0 warnings / 0 errors。

独立复审绑定上述候选源码：PASS。初稿职责分组过于遵循原分支排列，已改为上述真实职责并复审。该本地源码复审不等于精确公开HEAD的合并准入记录。

## 尚未完成

本PR保持 Draft：隔离差分/变异证据尚未接入仓库可重跑测试入口，公共epoch/组合来源合同尚未集成，不声称完整CI通过，也不声称架构优化完成。正式Ready前需补齐仓库测试与来源集成、精确HEAD/BASE独立准入及必要Full CI。未改共享配置、原断言或他人PR。

Backlog CLI当前不可用，未伪称已认领或变更任务状态；此切片按用户明确授权的独立M7架构工作提交。发布前检查13个开放PR全部文件页，无此源码重叠。

## 本地公共接线续交（尚未更新远端）

本地已接入正式 sourceEpoch、公共 helper 复制闭包及两个自动发现的测试文件。保留原51 owners、339 bindings、全部21个历史target；新增 colorlessDescriptionPrior 后22个target。前代完整proof先序列化认证一次，再只消费其plain-data快照；toJSON与二次getter不能偷换后续身份。Formation历史合同仍读取冻结前代入口，唯一直接读取当前磁盘的测试使用当前公共入口，原51-owner暖读、缺失和污染拒绝断言全部保留。

sourceOnlyTree 是兼容元数据字段，指已公开3a09dfb源码阶段的完整tree5872f4b8（包含源码和本说明的旧版），不是本轮公共接线tree。candidateCommit与collectedBaseCommit分别记录已公开源码提交和ab65基线，不把本地接线冒充已公开。

新source合同完整5/5、复杂度完整1/1通过；复杂度合同真实采集锁定Luacheck，并逐个提取函数及匿名嵌套注入超30分支拒绝。已有Formation完整11/11与四个CI校准完整64/64通过。原3232描述行为矩阵、76独立探针、5语义变异和3生产fixture的源码身份完全未变，本轮未重复执行它们。

成本仅使用完整文件进程实测：source16109.85ms登记16110下界；runtime8047.30ms登记8048下界，不能误用unknown10000替代其更低的hosted成本。Formation12507.14ms由原17342下界覆盖；其他成本保持原值。原库存、历史收据hash、预算、并行及worker设置不变。最终预测和本轮精确测试输入见对应CI证据目录；预测不等于Hosted或Full通过。

此续交仍仅本地准备。尚需最终独审、公开披露许可、精确公开HEAD/BASE准入及正常Full CI，不自动Ready或合并。

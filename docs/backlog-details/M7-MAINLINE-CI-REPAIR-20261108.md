# b7ed1830 合后 CI 的部分修复

基线为 `b7ed18307e0be318ccd112aaa142e5ca4c191696`，原始 [Quality 42437108038](https://github.com/FurinyaWorks/Slay-the-Abyss/actions/runs/42437108038) 的 Windows/POSIX 失败均保留。当前连接器只返回第一页 30 个作业，其中 22 个失败；[原始失败摘要](../evidence/mainline-ci-failures-20261108.json) 不冒充全作业盘点。

## 实际修复

- 5 个隔离 source 测试原来只复制 facade 入口，漏掉 `epochs/`、manifest 和冻结证明依赖，因 `ERR_MODULE_NOT_FOUND` 根本没有运行漂移/删除负控。复用既有哈希认证闭包复制器，同时复制本轮真实 Lua/config 依赖；所有 owner 从临时目录读取。保留 Actor/Potion/Reward 原有盘上漂移、删除与证明破坏断言，Act1/Watcher CRLF 用例补上真实隔离 owner 的漂移与删除，不能回借 live 文件。
- Reward VM 原先把完整当前模块数写死为 333，338 模块时在执行前中止。保持原切片 A/B：两个独立 VM 使用完整当前依赖，仅 old 侧的三个 reward owner 换为已 SHA/blob 认证的 before 源。新验证逐文件核对完整清单、hash/字节数，双方差异必须恰好三个 owner；四组完整图仍逐字节相等，三个具名语义变异仍须命中指定断言。Buffer 比较用 `equals`，避免失败时展示巨大 diff 耗尽内存，比较内容不变。Run SCC 允许实际缩小，但保留原 15 成员/56 require 位置/38 模块对上限，并验证查询能力不能进入事务环。
- 7 份预算合同精确承接已公开独审的 `c29a4cff`；当前文件与起点 `cc4cce70` 逐字相同，#560 漏掉后续合同修复。[原交接](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/541#issuecomment-6703864925)。当前 runner 先经既有完整 SHA 和每次鲜读 policy SHA 认证，再逆投影执行原 30/60/120 分类断言；历史 oracle、显式 timeout 和原场景保留，增加分类漂移、覆盖显式 timeout、漏 wrapper 负控。未改执行阈值。

## 验证与边界

- Node 24.22.1 云隔离树；托管 CI 使用 24.18.0，未宣称等同 Windows 实测。
- 5 个隔离用例：原先 0/5，修复后 5/5；叠加 #562 已审源码树也 5/5。
- 预算原失败 7/7；修复后 25/25 定向通过，含实际 runLua/mock spawn 预算传递和错误路径。未重复昂贵历史回放；一次扩大历史合同选择无输出而取消，不计通过。
- Reward 全文件 9/9 通过：四组图、三个具名变异及两项架构合同。独审建议保留原 SCC 上限后，受影响两项架构合同再次 2/2 通过，未重复图回放。
- JavaScript syntax、diff、Backlog 范围、指引检查通过。指引首次因稀疏工作树遗漏 `.codebuddy`/`.cursor` 失败，补齐同一提交文件后通过，未改指引。
- 三个 source 合同文件整体仍为 12/27，通过的隔离用例不掩盖 15 个既存失败；#562 叠加也存在。包括旧 owner 次数/配置身份合同与 retirement 错误标签，以及 shared facade 对 unknown+invalid-reader 和输入 JSON token 布局的真实兼容性缺口。共享 facade 属于 #562 的协调者，本切片不并行修改。
- 预算政策实际为 90/120/180，#541 已明确该迁移。本轮不是再次扩预算，也不证明历史 Sapphire 超时根治。本次已见 Lua 耗时基本仍在旧额度内，但失败 JS 之后的 raw Lua 未完整执行，不推断恢复旧预算安全。
- 未运行本地 Full，未改生产 Lua、质量脚本、执行预算或 workflow；Hosted Full、当前精确 HEAD 的准入、合并及官方/设备验收均待。TASK-88 保持 In Progress，不勾未证明的 AC。

## 新基线接续

发布前 #563 六个 2D 说明文件与 #562 七项重构已合入 develop `7821a7f44b518c09f6b565860e04e4823bc95153`。本切片 19 个路径与该基线增量无交集，无冲突线性接续，15 份测试代码字节不变。最终组合重新定向验证：隔离 5/5（10.166s）、预算 25/25（6.075s）、Reward 全文件 9/9（50.332s）均通过，日志见 [本轮证据](../evidence/mainline-ci-validation-20261108.json)。没有重跑 Full，原残余与验收边界不变。

## 精确来源 facade 兼容补丁

将已独审 `f90dd1ece53bccb1db5684d00c73e5ab65552a4c` 的 22 路径无冲突增量合入本 PR，不另开 PR。先完整保持该片代码字节，再修复发布前发现的输入语法缺口：未知输入保留原 helper 对无效 reader 的透明语义；仅输入配置允许严格 token 相同的空白布局变化，45 个 linked raw owner 仍每次完整哈希认证。Windows 新增 helper/冻结 Lua witness 精确 LF，gzip 保持 -text，不更改任何 proof 字节；core lifecycle 隔离用例改为明确的临时目录 reader。

组合定向：原补丁新来源回归 6/6、五个隔离用例加 core lifecycle 6/6 通过；原三个来源合同全文件从 12/27 改善为 16/27，**仍有 11 项失败**，包括历史 owner 数量/epoch fixture 与 retirement 错误标签，明确留待后续切片。前一轮 39 项证据保持原版本，未重复不受影响的 Reward/预算回放，也未运行 Full。

发布前合成有效 proof 发现通用 projector 会把 `1 2` / `tr ue` 等非法 token 删除空白后误认当前来源，已保留红灯证据。补正仅在配置布局匹配前用 JSON.parse 验语法，仍以原 token 文本比较身份，不重序列化、不放宽重复 key、escape、顺序或 linked owner hash。新增数字、负数、指数、boolean、null 五类负控，原字节透传且零 linked 读取（包含 null reader）。完整新回归 7/7、隔离加 core 6/6 再次通过；原补丁其余 19 文件与先前 15 份测试代码字节不变，原残余 11 项与 Full 边界不变。

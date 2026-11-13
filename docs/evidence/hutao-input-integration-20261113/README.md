# 胡桃试玩输入修复联合候选

基线为 PR #640 的 `99cc1e0537dd611c0167584458a82ba5545694f7`。本分支只将已独立交接的复制反馈、快捷键保护和弹窗焦点三项合到同一打包 HTML，不覆盖原 owner 分支，也不改命名、数值、HOLD 或正式 Lua。

## 本轮发现及修复

三份候选单独通过，不代表可直接合用。首次合并后 22 例只有 15 例通过：快捷键测试按“第一个 keydown 注册”提取函数，新增捕获阶段弹窗监听器后误取 `handleModalKeys,true`，7 例全部在夹具初始化失败。本轮改为明确匹配战斗的箭头函数监听器，并加入捕获/冒泡两个监听器一起执行的回归。

最终 `node --test tests/hutao-{report-copy,keyboard-controls,modal-focus}.test.mjs`：24/24，无跳过；原始输出见 `node-tests.log`。新增联测验证搜索框 Escape 被弹窗消费且不结束回合、关闭后普通空白处快捷键仅执行一次、按住键不重复、Tab 限制焦点且弹窗内 Space 不改变战斗。HTML 内联脚本 `node --check` 和 `git diff --check` 通过。

基线 HTML 从起始到 `function openModal(name)` 前 86219 字节完全一致，涵盖样式、75卡数据及引擎；其它差异限于三项交互修复。SHA256 为 `57ce9650d6d7563a8596c89777b1d48d010139fac88c035280f74916d8fb9a00`；命名 manifest 未改。

## 边界与接续

这是 Node VM 合同验证，不是浏览器原生焦点/剪贴板、390px实体手机或千星验收。没有重跑 Full，没有合并或发布。模块化维护源码 ZIP 尚不可用，必须由 #640 owner 将三项修复及联测同步维护源，再重打包并在真实浏览器复验。仅保留一个集成候选分支供原 owner 取用，不另造 Draft PR 或完成任务验收。

## 独立复审

独立 reviewer `review_integrated_hutao` 复查相对 `99cc1e0` 全部差异，亲自重跑 24/24、两段内联脚本语法与 diff 检查，结论 PASS、无阻断缺陷；核实 overlay 位于 inert shell 外、卡牌数据/引擎/manifest 未变。复审只证明源码及 mock 合同，不扩张浏览器/设备验收。

# 胡桃试玩弹窗键盘焦点候选

基线：#640 `99cc1e0537dd611c0167584458a82ba5545694f7`，仅独立 HTML 试玩 UI，不改名称、数值或结算。原 PR owner 保留集成所有权；命名 HOLD 与既有依赖不变。

## 源码缺陷与候选

原 openModal/renderDialog 只插入 aria-modal 标记，没有转移焦点、禁用背景或 Tab 环绕。标记不等于浏览器输入隔离，键盘仍可访问背景战斗控件。候选将背景 shell 设 inert，初始聚焦关闭按钮，Tab/Shift+Tab 在可见可用控件内环绕，关闭时恢复原 opener。详情替换弹窗保留第一次打开的目标；玩法动作重绘使原 opener 失效时使用同 id 新节点，或稳定玩法说明按钮。

Escape 在搜索框中也关闭弹窗并消费事件。本候选不替代此前战斗快捷键修复；组合输入等旧 bubble handler 行为不在此次通过声明内。

## 实际验证

- `node --test tests/hutao-modal-focus.test.mjs`：9/9 通过，Node VM DOM 替身。覆盖初始/返回焦点、嵌套详情、双向 Tab、禁用/隐藏项、搜索 Escape、重绘替身与无 id opener、原 inert 值和重复开关。
- 内联脚本 `node --check`、`git diff --check` 通过。
- 独立复审发现升级 opener 销毁且无 id 时无焦点归宿，已补 fallback 与回归；组合输入测试名称已收窄。
- `npm run test:related -- --base 99cc1e0 --plan` 判定 HTML 为 unmodelled，需要最终 Full；本轮没有重复启动 Full，未称准入通过。
- Chromium 启动因 `socket() failed: Operation not permitted` 失败，正常及升级权限启动结果一致。没有浏览器级复现/验收、设备操作、官方导入或手机实测；DOM 替身不证明 inert/Tab 在真实浏览器的端到端效果。需由原 owner 的可运行浏览器环境复验。

## 集成注意

只提供候选分支，不改 #640 原分支、不开自动合并。原 owner 需同步另交付的模块化源码，否则重新打包会覆盖此 HTML 修改；与既有复制反馈和战斗快捷键候选一起做最终组合回归。

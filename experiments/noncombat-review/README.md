# 非战斗自然流程预览

复用已验证的战斗页 Simulator 0.5.2、完整图事务快照扩展与原渲染器，不改候选启动源码。只监听本机，无桌面输入，不启动原神。SDK 的 GPL 许可及素材许可分别保留；本工具不再分发 SDK 或图库。

先用项目既有 `build-native-candidate.mjs` 构建同源候选副本，再执行：

```powershell
node experiments/noncombat-review/prepare.mjs <candidate.json> <新转换目录> <已有验证的readback-adapter.mjs>
node experiments/noncombat-review/serve.mjs --candidate <candidate.json> --scenario-dir <转换目录> --web-dir <已有snapshot-private-web-v2> --output <新服务目录> --port 0
```

`prepare` 读取实际 GIL 中的 UI、Lua GUID/源码及所有引用模板，核对候选摘要；复用原战斗转换器及已经验证的 Basic、描边、Pixel 默认值校准。转换收据记录逐节点逆变换差异；有差异即失败，不改写 GIL。此工具依赖现有本机 adapter、工具链和 Simulator 安装，不能只克隆分支就运行。

`serve` 核对 server/worker/bridge/hook/play/renderer 摘要，并要求自然入口归档与实际读回逐对象相同。唯一入口为主菜单，不注入战斗、历史、生命或牌组。实际 URL 和 PID 在服务目录 `service.json`；进程保持运行供本机试玩。只按本轮 PID 与命令行核对后停止本服务。

本轮验证入口（复用本机已有 Playwright/SDK，不另安装）：

```powershell
node experiments/noncombat-review/capture.mjs <service.json> <新截图目录>
node experiments/noncombat-review/measure.mjs <实际读回.save.json> <已有SDK export.mjs> <新报告.json>
node experiments/noncombat-review/browser-perf.mjs <service.json> <新计时目录>
```

截图与浏览器计时分开运行。`capture` 通过实际控件矩阵换算指针，等待角色 ready，再自然点击首局两项祝福中的最大生命选项（80→88）、返回地图并进入可达的首场战斗。`measure` 使用相同 native pointer 路线，额外跑20次选角返回并检查控件数稳定及根销毁归零；Lua 状态查询只读，不注入 gameplay 状态。`browser-perf` 沿用战斗 QA 的 `applyScene` / `renderer.render` 观察钩子，记录页面可见性/正文变化后的 draw 返回时间，不修改渲染器源码、SDK step 或游戏时钟。启动和计时目录包含候选与 renderer 身份，失败样本保留。

使用私有 typed snapshot、leading16 和正常 Pixi ticker 的边界沿用原战斗验证。这些属于 Simulator 工具适配，不能作为游戏本体提速、官方帧率、手机体验、官方容量或发布许可的证据。实际候选身份、黑盒截图和计时以本轮 evidence 报告为准。

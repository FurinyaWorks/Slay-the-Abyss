# 主菜单原生2D场景复现

本目录是 Simulator 适配与取证工具，游戏事务仍由候选内完整的原 Lua 实现。最终证据见 [实际截图与计时](../../docs/evidence/menu-native-2d-20261112/README.md)。

背景源是 `scripts/menu-ruins-scene.mjs`。复用 production-25d 的静态分层组织和 V25 原生多边形转换；150 图片图元、17 容器，只有原生形状、颜色、透明和软边，无外部位图拟合。`project.mjs` 仅供早期美术迭代，最终截图来自真实GIL读回，不能把投影稿当作新GIL证据。

1. 用仓库 `build-native-candidate.mjs` 从既有存档副本构建，参数 `--official-assets --native-page-lifecycle --work-key=menu-2d-scene`。保留全部现有角色与页面，不开启原高图元菜单底图。
2. 按 `experiments/noncombat-review/README.md` 使用 `prepare.mjs` 和既有已验证适配器读回GIL，检查逆转换0差异。
3. 复用本机已有0.5.2 Simulator与 SDK export；不重新安装或分发SDK。设置 `MENU_REVIEW_SDK=<已验证 actual-session.mjs>` 后运行：

```powershell
node experiments/menu-ruins-review/serve.mjs <已有snapshot-private-web-v2目录> <实际读回.save.json> <新服务目录>
```

服务只监听127.0.0.1。URL和原始 SDK、渲染器及归档摘要写在 `service.json`。打开 `<URL>/editor/play#menu-play` 可直接运行完整游戏。`MENU_REVIEW_SDK` 常驻模式调用原 SDK 的初始化、步进、快照与指针，省去编辑器归档快照和工作线程之间搬运27MB数据；不修改Lua或注入Run状态。这是Simulator适配成本的优化，不能称为原神客户端加载提速。省略该环境变量仍可复现早期编辑器worker路径。

Windows交付试玩使用独立隐藏后台进程，避免启动命令结束后服务随之退出：

```powershell
./experiments/menu-ruins-review/start.ps1
```

启动器读取本轮原始 `service.json`，核对归档及SDK摘要，恢复同一端口；通过 `/menu-health` 核对服务身份后才返回链接。重复运行不会重启已健康的同候选服务。日志和新PID在 `.artifacts/menu-preview-service/`。若换用其他收据，可传 `-ReceiptPath`；不会抢占其他端口或终止已有进程。

4. 串行取证，避免同时运行CPU基准和浏览器计时：

```powershell
$env:MENU_REVIEW_FULL='1'
node experiments/menu-ruins-review/capture.mjs <service.json> <新截图目录>
node experiments/noncombat-review/browser-perf.mjs <service.json> <新绘制计时目录>
node experiments/noncombat-review/measure.mjs <实际读回.save.json> <既有SDK export> <新报告.json>
node experiments/menu-ruins-review/compare.mjs <实际读回.save.json> <既有SDK export> <新AB报告.json>
node experiments/menu-ruins-review/verify.mjs docs/evidence/menu-native-2d-20261112
```

`capture` 的完整inspect返回时间含约15MB控件树读取，不能当点击呈现时间。实际点击呈现采用已有 `browser-perf` 的 renderer 观测。`verify` 拒收错候选、失配截图、错误/泄漏，以及超出本轮机器的首屏、切页和稳态预算；不接入通用CI的硬件性能门禁，不取代人工看图或官方设备验收。

首次失败、修正前场景、并行争用导致的慢样本保留在本工作树 `.artifacts/menu-r*` 与 `build/menu-ruins-final/*/failure.json`，不覆盖为成功结果。最终交付和这些试验采用不同目录和摘要。

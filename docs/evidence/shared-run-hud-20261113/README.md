# 共享顶部栏本轮离线视觉证据

任务：TASK-4.23。生产源码由主线程维护，本目录只保存离线取证脚本、收据和图像。

`prepare-visual.mjs` 复用既有生成布局→SDK 存档投影路径，从本轮工作树重新构建 365 个 Lua 模块，未知适配属性为 0。三份存档使用同一源码闭包，分别启动祝福、地图和首场战斗。仅内存启动包装注入 seed42、17 张永久卡组及槽 1/3 的稀疏药水；游戏规则及生产源码未修改。祝福选项、卡组与抽弃牌窗口通过隐藏 headless 浏览器的真实指针操作打开。

运行依赖复用本机既有 `preview-tools.mjs`、SDK 和 Chromium，不复制 SDK、不操作桌面。示例（根目录）：

```powershell
node --import 'file:///F:/New%20folder/.artifacts/simulator-runtime/preview-tools.mjs' docs/evidence/shared-run-hud-20261113/prepare-visual.mjs .artifacts/shared-run-hud-20261113/current-reviewed
node --import 'file:///F:/New%20folder/.artifacts/simulator-runtime/preview-tools.mjs' docs/evidence/shared-run-hud-20261113/capture-visual.mjs .artifacts/shared-run-hud-20261113/current-reviewed docs/evidence/shared-run-hud-20261113/visual-final-current
node docs/evidence/shared-run-hud-20261113/verify-visual.mjs
```

每次使用新目录，避免覆盖旧证据。`source-manifest.json` 记录源码/生成输出/存档散列；原始源码闭包和存档留在 `.artifacts`。截图目录中的 `render-receipt.json` 绑定本轮源码闭包和各 PNG 的 SHA-256。`.state.json.gz` 是相同 session 的 SDK 检查快照。

## 发现与运行记录

非最终的四轮目录已原样移至本机 `.artifacts/shared-run-hud-20261113/visual-history/`，保留失败和诊断证据；本目录只交付 `visual-final-current/` 的最终截图与快照。

- `visual-current-1`：未产图；机器没有系统 Chrome，脚本改为复用已安装的 Playwright Chromium。
- `visual-current-2`：3 张图后退出；返回点击后即时读取仍是前一 SDK 状态，随后失败快照已确认窗口实际关闭。增加有期限的状态轮询后重跑。
- `visual-current-3`：8 张新图，真实祝福选项、地图/战斗顶部栏、地图/战斗的17张卡组、12张抽牌堆及0张弃牌堆均实际打开。正常完成8张捕获，Lua无错误。结束session后尚未关闭的页面轮询产生每场一次HTTP400，已调整脚本先关闭页面再停session。
- 该组图发现普通药水 tint 在战斗/战外不一致：同一图片111046，地图颜色4287415522，战斗4294967295。已向主线程反馈，不能据此组声称所有药水外观通过。
- `visual-final`：颜色修正后的两行源码版本，8图和原始PNG/RGBA/前端pass校验通过；随后生产为保留静态检查基线行号做等价单行折叠，因此仍保留此轮，但不用其源码闭包冒充最终字节。
- `visual-final-current`：最终单行源码版本，对应 `current-reviewed`。源码闭包 `8e8ab557d4f4935e88c543ffc04fd5f650cdd55f5115f9e5bf97c7ad32cd1dec`，生成后已逐文件与生产工作树读回一致；本轮最终结果以此目录的收据和校验为准。
- 纠正观察：首次通过图像工具查看时误以为抽弃牌缺少返回。复查原始 PNG，永久卡组、抽牌和弃牌返回区域（x=0,y=570,w=180,h=55）RGBA 完全相同，SHA-256 均为 `bfdd114a8677792d37281cc8c8a2a45661756ccd30ec47b5374a818a8615c35e`，每张该区域都有1732个棕金像素；SDK图文与实际点击亦正常。因此撤回按钮遗漏结论，图像工具呈现/缩图观察不能代替原始图像验证。没有因此修改生产代码。

此处是 headless Chromium SwiftShader 软件 WebGL + 实际 SDK 的离线证据。不是官方导入、官方 ready、GIL读回、GPU性能或手机/PC实机验收。

## 最终本轮结果

`visual-final-current/verification.json`：PASS。8张1280×720 PNG散列与收据一致，所有session有本轮fixture及SDK ready，无Lua错误、无浏览器console错误、无失败HTTP；每张截图前额外等待至少3次前端renderer生命周期pass。祝福/地图与战斗的槽1火药水、槽3普通药水，图片ID和最终RGBA逐项一致。空槽保留在槽2。三牌堆浏览器的原始PNG返回区域逐字节一致。

视觉复查：身份/生命/金币/药水/卡组/菜单在同一栏的相同位置和材质；页面只替换层数标题和可用地图上下文。永久卡组17张、抽牌12张、弃牌0张实际打开，共用五列卡面、排序行、暗幕、标题与返回外观；空弃牌堆显示明确空态。真实指针点击返回均关闭窗口。生命80→88是地图/战斗fixture在开局选取增加生命恩赐的真实规则结果，不是顶部栏数值漂移。

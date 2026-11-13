# 岩荧原生背景实验（TASK-94）

当前集成分支 `feat/lumine-native-fit-admission`，原实验起始基线 `903bf2a31`（含 #634）。不改变正式构建入口；Owner允许工具及实验代码通过准入后合入develop，不发布、不写入玩家存档。目标是画质、完整显示延迟与资源成本同时可用；图元数不是单独的验收标准。

[PR #648](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/648) 接续已关闭的[历史PR #647](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/647)，原分支与记录全部保留。实际候选源码/证据提交 `fd5e161b84cee02e02d112cd917b99ea40febc2e`，GIL/25冷50热仍冻结于原实验基线供复现。2026-11-14 Owner认可1600画质并授权实验PR走正常自动合并；已以最新develop `e805a87d` 为唯一父建立线性继任分支，保留双方素材清单，当前源码组合另走独审/CI准入。合并仅纳入隔离工具和实验记录，不自动启用正式背景；旧GIL数据不冒充新组合的官方或设备实测。

## 输入与画质选择

- `input/source.png`：用户第一张附件；保留眼睛、眉毛、鼻、嘴的来源。SHA256 `84cc7161fe5312e0f72223d50e8ac6aaa65c4be7d45d558b810a2443db5c1faa`。
- `input/structure-reference.png`：用户第二张附件；头发、花饰、衣服与背景的结构来源。SHA256 `29c47e50581951d1f3cf509eb39b1a73bf8d6ae4934a5b0606a3c76f9857c050`。
- 两图均为 1672×941。原图只供离线拟合，没有作为运行时纹理。实际背景只使用官方原生图片 ID `100001` 矩形与 `100003` 三角形。
- `fit-hybrid-final/` 包含四档真实几何与参数：400 / 798 / 1600 / 3200 个图片图元。单轴三角形一个控件；无法单轴表达的三角面，回退既有 V25 两个半幅三角形，按两个计数。蒙版、容器另外记录。
- 400、800 档眼睛与轮廓破碎，淘汰。Owner于2026-11-14查看后明确认可当前1600图元画质，1600固定为主候选；3200仅保留对照，不再追加美术拟合或强压图元。确认只绑定本轮版本，见[Owner画质确认](owner-acceptance.json)，不代表加载/切换性能或官方设备通过。

分割使用 OpenCV mean-shift、Pillow median-cut、连通色块原像素均色、CCOMP 轮廓、Shapely 轮廓简化及约束三角化。不是随机椭圆叠加。复用 #390 的单轴放置及当前 `scripts/v25-battle-scene.mjs` 的原生半三角映射；独立重建顶点测试覆盖 Simulator 的单轴投影，官方轴序仍未验证。

## 运行隔离与缓存

`build.mjs` 在实验 GIL 副本中覆盖 `abyss_ui`、`abyss_game_ui_view` 两个入口，其他 359 个原模块逐字节保留，增加六个实验 Lua 模块。正式流程不加载这些模块，不改战斗系统。

实验公开整数参数 `lumineFitBudget`：`0` 原背景；`400/800/1600/3200` 实验背景。实验 GIL 默认 1600。仅选中岩荧时显示，其他角色、头像、按钮和锁定规则保留。数据读取与图元创建均在首次实际选中时发生；主菜单不预热。60/10/1 个图片的共享原生预制精确分解尾批，无隐藏填充控件。离开选角隐藏并保留有界缓存，重入复用；根 UI 销毁释放；可选美术创建/清理失败会恢复原背景与正常交互。

当前比赛版本其他角色锁定。热测是合法的退出/重入选角页，不是多个已解锁角色/多张大背景间的实测；其他角色的美术边界只用实际Lua合同的测试局部状态验证，没有解锁角色或改账号。不能据单张缓存推断多角色秒切或多背景常驻内存。

## 复现

以下从仓库根运行。使用已有本机工具，不联网安装依赖。Python 需要 Pillow、NumPy、OpenCV、Shapely（本轮版本在 fit-receipt 中）。Simulator SDK、原始 GIL、官方图片缓存属于本机设施，不随源码重新分发。

```powershell
$py = 'C:/Users/Administrator/AppData/Local/Programs/Python/Python312/python.exe'
& $py scripts/art/segment-lowpoly.py experiments/lumine-native-fit/input/structure-reference.png experiments/lumine-native-fit/fit-new --features-source experiments/lumine-native-fit/input/source.png --colors 16 --spatial 16 --range 32 --minimum-area 24 --face-fraction .30 --triangle-mode single-axis
& $py experiments/lumine-native-fit/test-placement.py
```

复用协议 `docs/plans/2026-11-06-sts-art-render-feasibility-protocol.md`、TASK-94 与 #345/#361/#390/#634 的设施。基线完整源码构建配置为 `--v25-battle-chrome --native-page-lifecycle --art-menu-background=false --art-cards=false --art-selection-avatar=true --art-battle-portrait=true --art-monsters=false`；这是本轮实验对照配置，不声称等于已发布 RC。用同一基线收据路径替换 `<B0>`，所有输出目录必须全新：

```powershell
node experiments/lumine-native-fit/build.mjs <B0/candidate.json> experiments/lumine-native-fit/fit-hybrid-final <candidate-out> batch experiments/lumine-native-fit/input/structure-reference.png 1600
node experiments/lumine-native-fit/finalize-identity.mjs <candidate-out/candidate.json>
node scripts/native-candidate-preview.mjs <candidate-out/candidate.json> <preview-out>
node experiments/lumine-native-fit/verify.mjs <candidate-out/candidate.json> <preview-out/adapter-receipt.json>
```

`finalize-identity` 在写入前拒绝构建后发生变化的图像、fit、builder、runtime 与 fitter；overlay 收据保留 B0 身份。它是实验身份格式，不冒充正式交付/容量门禁。实际 GIL 模块均反向读回。

```powershell
$hook = 'file:///F:/New%20folder/.artifacts/simulator-runtime/preview-tools.mjs'
$sdk = 'F:/New folder/.artifacts/simulator-runtime/sdk/actual-session.mjs'
$renderer = 'F:/New folder/.artifacts/simulator-runtime/sdk/actual-renderer.mjs'
node --import $hook experiments/lumine-native-fit/contracts.mjs <preview-out/pr588.actual.save.json> $sdk <contracts.json>
node --import $hook experiments/lumine-native-fit/measure.mjs <preview-out/pr588.actual.save.json> $sdk $renderer <performance-out> 5 all
node --import $hook experiments/lumine-native-fit/serve.mjs <candidate-out/candidate.json> <preview-out/adapter-receipt.json> $sdk 'F:/New folder/.artifacts/simulator-runtime/web' <service-out>
$env:LUMINE_BROWSER = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'
node experiments/lumine-native-fit/browser-probe.mjs <service-out/service.json> <browser-out>
```

服务只绑定本机 127.0.0.1，入口提供五档同构建试玩链接及实验 GIL 下载。浏览器探针使用无头 Chromium 与 HTTP Simulator 事件，不占用桌面键鼠。官方导入需要当轮用户明确让出输入窗口；本轮没有该授权。

## 性能证据边界

最终数据、构建身份、各档截图与结论见 [evidence/RESULTS.md](evidence/RESULTS.md)。每档 5 个新 Simulator/Fengari 会话、10 次缓存重入，同一个 GIL/场景，仅挂载参数不同；轮次交错。冷端点包含 JSON 读取、关卡初始化、真实开始按钮、完整软件 PNG 及返回按钮生效。共享 Node/OS 文件缓存，因此不是进程/磁盘冷启动。热完整显示包含输入驱动、模型快照与软件 PNG；另报触发到模型、Lua os.clock 读取/创建/显示数据。不得把创建完成当作实际显示。

Node RSS/heap 是模拟器进程代理，SDK step 是 CPU 工作；Lua dt 只是推进量。Chromium CPU draw、实际 draw 间隔、RAF 与 WebGL disjoint elapsed query 分别记录。官方客户端启动、真实手机 GPU、官方容量均为 UNVERIFIED。没有把选角等待移到主菜单。

## 已否决的路径与保留失败

v4 半幅三角方案完成 25 冷/50 热，但 3200 单档预制增量约 2.70 MB，完整软件热显示 P95 3809 ms。单轴和共享预制降低了载荷，未因此宣布秒切。

v7（旧图）浏览器数据与 v9（双参考图）身份不同，不能挪用。Edge 90 探针因 `Object.hasOwn` 不支持失败，改用已安装 Chromium，没有下载。既有可选 mask 测试的历史 bundle pin 与本机当前 bundle 不一致，保留失败，不更改白名单。

v9 实际原生截图暴露半三角裁切未生效：调用 SetFillHorizontal 只设 type/amount，Simulator 的序列化 enableFill 未启用。这也影响早期 v6/v7 共享批版本，其计时不能当作正确画面的加速证据。v9 的20个已采集冷样本与50热样本保留为 `stopped-known-display-defect`，不授予画质或最终性能通过。修复为原生预制显式启用 fill、全幅图元 SetFillUnused；新增真实模板与运行时填充状态检查后，使用新身份重新测量。v10 的静态校验 Node 子进程因沙箱 EPERM 未完成，不作为候选。v11 首次矩阵因探针把 SDK EnumItem 当字符串比较而中止；只修探针归一化 `.Name` 后，使用同一GIL重新采齐最终25冷/50热，早期失败文件仍保留。

## 素材与许可

两张参考图由用户本轮提供，涉及原神角色及场景 IP；不推定用户授予第三方商业权利。生成几何和截图仅用于本项目千星奇域实验；无 IP 再许可。代码沿用项目 LICENSE；复用代码保留来源说明。截图中的平台纹理与游戏身份仍归各权利人。NumPy/Pillow/OpenCV/Shapely、Simulator 与既有编辑器依赖沿用各自许可，不把它们的许可附会到角色素材。参见 `docs/legal/assets.json` 与项目 THIRD_PARTY_NOTICES。

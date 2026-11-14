# 红白黑主菜单原生拟合

当前采用本轮原附件重做的 **1600 个绘图图元、1732 个背景控件**，符合Owner确认的约1500–1600绘图图元、上限1800预算。只保留开始游戏/退出游戏；原图不作为运行时纹理导入，没有新生成图。

实际原入口：<http://127.0.0.1:56706/editor/play#style-d359015e>。本轮画面、原生写入/读回和资源证据见 [质量与资源重做](../../docs/evidence/menu-red-quality-20261114/README.md)。Owner审美、整游无感冷加载及官方PC/手机验收仍独立保留；本机进程重启后须重启临时服务。

## 离线拟合

原图 [input/source.png](input/source.png)，SHA256 16bdf7b614f0fb6fdbc2414271682446c0012a9e8ff8da70abad3b7a0374480d。运行图元只用原生100001矩形、100002圆形/椭圆、100003三角。

stack-fit.py 使用固定版 [VTracer 0.6.15](https://pypi.org/project/vtracer/0.6.15/)（MIT，仅开发时使用），分层轮廓追踪、区域精度分配、完全遮挡三角裁除及可见面的颜色拟合。面部单独精细处理；source-details.json 保留阈值以下的瞳孔、嘴线、发饰窗口和宝石。SVG/PNG诊断图不进入运行时，输出为普通数值几何。

复用工具链已有Python3.12/Pillow/OpenCV/NumPy/Shapely，新增依赖仅安装到隔离目录，不改系统Python。自仓库根执行：

    python -m pip install --target .artifacts/menu-quality-tools/python -r experiments/menu-red-fit/requirements-fit.txt
    $env:PYTHONPATH=(Resolve-Path .artifacts/menu-quality-tools/python).Path
    python experiments/menu-red-fit/stack-fit.py experiments/menu-red-fit/input/source.png <新目录> --budgets 1600 --difference 24 --speckle 8 --features --prune --refit

解释器实际位置以 [工具链](../../docs/TOOLCHAIN.md) 为准。选中数据存 data/presentation/native-menu-red.json；原图、生成器与包身份独立保留。

## 原生放置与候选

多数三角通过项目既有单轴投影解法成为一张图片，不能精确放置的保留原2D SVD回退。所有回退容器都算入1732总数，每组最多60子项，无逐三角遮罩、软蒙版或运行时拟合。

native-ui-encoder 仅在隔离模块URL补齐原生矩形XYZ编解码，原标量Z保持相同字节；native-simulator-importer 补齐独立读取器原来遗漏的X/Y。固定字段锚点改变时拒绝，安装文件不写。生成的XYZ控件须经本仓库编码器进入GIL，不能交给只支持Z的旧高层JSON入口后声称等价。

    node experiments/menu-red-fit/build.mjs <同基线candidate.json> <新候选目录>
    node scripts/native-candidate-preview.mjs <新candidate.json> <新实际读回目录>
    node experiments/menu-red-fit/compose-native.mjs <冻结当前样式save.json> <实际读回目录> <candidate.json> <新组合目录>

构建器保留已有图、模板ID和Lua，使用独立 menu-native-fit-experiment 收据。组合器只换实际GIL读回背景及构建标记，保留当前样式其余365Lua、其他UI、模板及服务逻辑。**背景来自新GIL读回，不代表整份组合预览是新编译的最新整游GIL。**

## 试用与验证

    node experiments/menu-red-fit/serve.mjs <已有Simulator web> <组合scene.save.json> <新服务目录>
    node experiments/menu-red-fit/verify-entry.mjs <service.json> <新证据目录>
    node experiments/menu-red-fit/browser-proof.mjs <service.json> <新浏览器证据目录>
    node experiments/menu-red-fit/hover.mjs <scene.save.json> <已有SDK export> <新hover.json>
    node experiments/menu-red-fit/cache-proof.mjs <scene.save.json> <已有SDK export> <新cache.json>
    node --expose-gc experiments/menu-red-fit/measure.mjs <scene.save.json> <已有SDK export> <新样本.json> full

Windows依赖重定位沿用现有 preview-tools.mjs 预加载，--import 使用file URL。服务设置 MENU_REVIEW_SDK；MENU_REVIEW_PORT / MENU_REVIEW_SESSION 指定入口，MENU_REVIEW_IMAGE_CACHE 指向工作树内原生素材缓存。隐藏后台启动，不抢桌面。

归档只解析一次。默认预建一份入口；entry活跃时不再预建，归档/设备/语言不匹配时释放未用副本。MENU_REVIEW_PRELOAD=0 用于公平冷建测量，不把预载开页称为无感冷加载。probe-reload.mjs 用独立进程复现旧/新重载及GC堆采样；cache-proof 等实际揭幕后操作，20轮检查背景同对象/ID，并保留血量、首战与销毁断言。

原 fit.py 与 [20261113证据](../../docs/evidence/menu-red-20261113/README.md) 仅作旧版基线；其3195半三角预算、1598图片及旧性能数不能用于本轮验收。旧投影合同不支持当前SDK的失败也保留，不能用旧日志或PC结果补官方/手机证据。

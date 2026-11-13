# 红白黑主菜单试用

用户明确要求把附件通过原生素材拼接/拟合接入，主菜单只留开始游戏、退出游戏。原图保存在 [input/source.png](input/source.png)，SHA256 `16bdf7b614f0fb6fdbc2414271682446c0012a9e8ff8da70abad3b7a0374480d`。没有直接纹理导入或新生成图。

实现与当前结论见 [证据](../../docs/evidence/menu-red-20261113/README.md)。**这是可试玩实验，首屏无感加载尚未达标；不是发布候选验收。**

## 美术与运行时

- `fit.py` 复用 TASK-94 轮廓分区适配器，原始实现 SHA256 `17317259a9be17782c645ae6466e2611447d5379cffb37a31e24db6316124cb5`，本分支只改本附件的头部/眼睛预算。未修改并行选角实验。
- 选中数据记录生成时的生成器摘要 `c700a4e9…56bf`；交付时仅规范脚本末尾空行，原字节可由当前LF脚本再附加一个CRLF恢复，已独立核对摘要。几何和预算未变化。
- 环境为已安装 Python/Pillow/OpenCV/Shapely/NumPy。颜色32、宽836；对比800/1600/3200预算，选3200轮廓档。`data/presentation/native-menu-red.json` 保存选中轮廓和来源身份。
- 数据中 `nativeImages=3195` 是旧转换器的**遮罩半三角预算**。实际 `menu-red-scene.mjs` 用有符号奇异值分解，将每个完整三角放成“一容器+一原生100003图片”，连同底色实际1598图片；不再使用三角fill/stencil。仅使用原生100001/100003和2D旋转/缩放，背景不接输入、不逐帧重建。
- 标题和占位选项移除；使用无描边的原生28号字。hover进160ms、出100ms，按当前值反向，固定280×56命中区域；稳定后停止属性写入，结算文字与传统菜单退出入口保留。

在本目录离线拟合复现（输出新目录）：

```powershell
python fit.py input/source.png fit-rN --budgets 800 1600 3200 --colors 32 --width 836
python diagnostic.py fit-rN
```

诊断图只用于挑预算；运行截图必须来自候选读回。

## 候选与预览

从仓库根目录运行，解释器/本机工具位置沿用 [工具链](../../docs/TOOLCHAIN.md)：

```powershell
node experiments/menu-red-fit/build.mjs <同develop基线的candidate.json> <新输出目录>
node experiments/noncombat-review/prepare.mjs <新candidate.json> <新读回目录> <已验证readback-adapter.mjs>
node experiments/menu-red-fit/serve.mjs <已有Simulator web> <实际save.json> <新服务目录>
node experiments/menu-red-fit/hover.mjs <实际save.json> <已有SDK export> <新报告.json>
```

候选构建器保留已有编译图和模板ID，使用当前标准UI与生成的肖像绑定，逐Lua读回；收据是独立 `menu-native-fit-experiment`，不继承旧生产收据的payload/时间/产物。`--reuse-layout` 只接收本实验候选且核对五项布局输入完全相同，供纯Lua纠正使用。它不能冒充标准生产构建/官方导入。

服务复用已安装SDK和渲染器，保持编辑器工作目录为空，避免启动时反复索引巨型归档；游戏仍运行实际GIL Lua。Windows的SDK依赖如已重定位，沿用既有 `preview-tools.mjs` 预加载；Node的 `--import` 使用file URL。隐藏后台启动，不抢桌面焦点。正式客户端操作仍需本轮窗口授权。

旧版编辑器投影的 inactive `minFontSize` 会被官方导入器略去；保留逆转换原始差异，不删除断言或称零差异。当前SDK身份也不受旧 `replay:outcome` 投影合同支持，其失败尝试和未验收状态均保留在证据中。

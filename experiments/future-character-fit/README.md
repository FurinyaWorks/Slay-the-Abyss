# 钟离、刻晴、甘雨：未来选角图元储备（TASK-106）

用户于 2026-11-14 提供四份源图，明确作为未来版本储备；查看手部/肩鸟修订后确认“可以……没什么问题”。**三张主候选已获本轮离线画质认可**，准确产物身份见 [owner-acceptance.json](owner-acceptance.json)。当前选角、职业开放和正式构建没有引用本目录。

## 交审入口

| 角色 | 原图/拟合/同区域3倍面部 | 绘图图片数 | 离线原生背景树总控件 |
| --- | --- | ---: | ---: |
| 甘雨 | [对照](assets-1600/ganyu/comparison.png) | 1600 | 1747 |
| 刻晴·手部修订 | [对照](corrections/keqing/comparison.png) | 1574 | 1725 |
| 钟离·简化源，肩鸟修订/推荐主候选 | [对照](corrections/zhongli-simplified/comparison.png) | 1572 | 1732 |
| 钟离·精细源，肩鸟修订/仅对照 | [对照](corrections/zhongli-detailed/comparison.png) | 1589 | 1772 |

每个目录保留 `source.png` 原字节、`native-art.json` 可编辑数值几何、`native-scene.json` 原生控件树、`preview.png` 几何重绘，以及参数/来源 `receipt.json`。`comparison.png` 左原图、右拟合；下方使用相同区域与3倍最近邻放大，便于检查五官。PNG不作为运行时纹理；原生树只用平台 `100001` 矩形和 `100003` 三角形。

总控件数来自真实调用 PR650 的 `menuRedBackground(pack,true)` 后遍历数值树，包括绘图、2D回退容器、每组至多60项的批容器和根容器；不是绘图图片数，也不是官方容量读数。每份原生树只适合后续独立装配，未自动挂入游戏。JSON字节不换算官方资源占用。

## 工具与复现

复用 [PR650](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/650) 的 VTracer 0.6.15 分层色块轮廓、遮挡裁除、约束三角化与单轴/2D回退放置；本目录适配器仅按实际角色位置设置脸/嘴区域的精度预算。未复制或改写另一工作树的工具。原生放置思路承接 PR390 / TASK-94，技术边界见[可行性协议](../../docs/plans/2026-11-06-sts-art-render-feasibility-protocol.md)。

上游 `experiments/menu-red-fit/stack-fit.py` 固定 SHA256：
`f662fc272ecd4c7d30190b01bda8f7785f54c25e7ea2e6e3c75f6e2de7ebe4fe`。
适配器会拒绝不同上游身份；上游来源追溯 PR650，当前工作可由其集中集成PR接续，须使用对应文件，不能仅凭相同路径认为版本一致。其余工具身份与实际 Python/Pillow/NumPy/OpenCV/Shapely/VTracer 版本均在收据。复用已有安装，不触发联网安装。

从仓库根运行，使用已保存源图可摆脱 Downloads 路径；输出必须全新：

```powershell
$py = 'C:/Users/Administrator/AppData/Local/Programs/Python/Python312/python.exe'
# 以下两项按本机已有PR650工作树/安装位置设置
$fitter = '<PR650工作树>/experiments/menu-red-fit/stack-fit.py'
$env:PYTHONPATH = '<已有隔离安装>/python'
& $py experiments/future-character-fit/fit.py --fitter $fitter --character ganyu --source experiments/future-character-fit/assets-1600/ganyu/source.png --output experiments/future-character-fit/reproduction/ganyu
```

其余 `--character` 值为 `keqing`、`zhongli-simplified`、`zhongli-detailed`，对应相同目录名。保存四份输出后：

```powershell
& $py experiments/future-character-fit/fit.py --compare --output experiments/future-character-fit/assets-1600
node experiments/future-character-fit/verify.mjs '<PR650工作树>/scripts/menu-red-scene.mjs'
```

以上验证命令默认核对已交审的 `assets-1600`。若要验证另行生成的四份复现输出，先对 `reproduction` 运行 `--compare`，再给 `verify.mjs` 第二个参数 `experiments/future-character-fit/reproduction`；报告写入复现目录，原交审报告不覆盖。JSON生成显式固定LF，保持Git入库前后的收据SHA一致。

重绘预览不需要上游拟合器；拟合重新生成需要上述依赖。对照标签使用本机微软雅黑；未分发字体文件，其他系统字体替代会改变标签像素，不改变角色几何。PNG按本目录 `.gitattributes` 使用 LFS，拟合/画质检查须读取真实PNG，不能把LFS指针当图像。

## 本轮核验与取舍

### 用户反馈后的手部/肩鸟修订

用户实际否决了初稿的断裂手部和无辨识肩鸟。最新入口为 [review.html](review.html)，优先展示[手部前后](corrections/keqing/region-comparison.png)及[肩鸟前后](corrections/zhongli-simplified/region-comparison.png)。冻结的 `assets-1600` 保留作来源和失败对照；当前手/鸟采用 `corrections`。

`refine-local.py` 复用固定上游，在完全遮挡且栅格不可见的图元上回收预算；手部按源图单独追踪，鸟依据 `bird-details.json` 少量可编辑轮廓、眼、喙、翼尾及脚明确重建。鸟只清除旧鸟足迹，保留原背景分区及衣肩，避免整框铺底。总绘图不超过1600，背景总控件也不得超过各自初稿。初稿164/118/103项完全隐藏图元可回收，局部新覆盖再剔除冗余。

收据绑定基础几何/基础收据/局部生成器/鸟轮廓SHA；同时声明源图ROI、连续几何ROI、实际像素rasterROI。像素范围按Pillow的向下取整及右/下边缘包含规则确定，严格核对该范围之外零改变，不隐式扩掩码。真实放置与成本核验见 [corrections/verification.json](corrections/verification.json)：

```powershell
& $py experiments/future-character-fit/refine-local.py --fitter $fitter --character keqing --output '<全新输出根>/keqing'
# 钟离两个key同上；保留全新输出目录，不覆盖本轮冻结图
node experiments/future-character-fit/verify.mjs '<PR650工作树>/scripts/menu-red-scene.mjs' experiments/future-character-fit/corrections 'keqing,zhongli-simplified,zhongli-detailed'
```

独立复核 `ses_e27eec338ffea2O8KDfIqm8ksW` 已实际看整图及放大图，并重新渲染核对三份rasterROI外改变像素均为0；前轮的矩形贴片及不准确的边缘掩码已修正。Owner随后认可本批修订。已展示的取舍仍保留：手腕和指间转折偏硬，鸟的描边/脚偏块状，清除轮廓附近有轻微色块接痕。后续修改仍须同时检查实际展示比例及同区域放大中的掌指腕连续关系、鸟的眼喙/翼尾/落脚点，不以总控件下降代替造型验收。

- [verification.json](verification.json) 绑定实际几何、对照图、原生树和放置器身份；源图/产物SHA、预算、边界、有限数值及逐三角逆投影通过。最大顶点误差约 `3.5e-13` 设计单位，说明本轮离线放置保持几何，不是官方显示证据。
- 最终重新生成的四份几何与独立视觉复核选中的 `selected` 轮逐项一致，修复了早期候选只有旧适配器SHA、无法独立重放的问题。早期草稿留在本地忽略目录，未覆盖源图。
- 独立看图复核会话 `ses_e27eec338ffea2O8KDfIqm8ksW`：后续16/8色眼片覆盖会降低虹膜颜色和神态，并挤占衣饰预算，因此回到选中轮。精细钟离源在同预算下花叶、衣纹碎面更多，简化源更完整。
- **保真限制仍存在**：甘雨嘴鼻较淡，刻晴发梢及手饰简化，钟离肩鸟和金边细节损失；脸部、下颌和服装轮廓仍比源图硬。SVG解析器对部分复合内环的语义仍有限，袖口小饰件保真未验。这些属于交审取舍，不能以“技术通过”代替用户画质认可。
- 冻结生成收据中的 `ownerAcceptance: PENDING` 是生成当时状态，后续认可单独绑定在 `owner-acceptance.json`，不改写历史收据。`officialImport: NOT_RUN`、`devicePerformance: UNVERIFIED` 保持不变；没有本批GIL写入/读回、官方ready、PC/手机实测。

## 素材来源与许可

四份素材均由用户本轮提供；文件名与原始SHA见逐图收据。涉及原神角色及场景IP，生成来源未额外推定；保留第三方权利，不授予角色IP或商业再许可。仅用于本项目千星奇域储备素材审阅。代码遵循项目 LICENSE，VTracer及已有依赖沿用各自许可；不以工具许可替代图像权利。

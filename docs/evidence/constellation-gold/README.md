# 选角页金色命之座与统一排版

本轮从 develop `9f2f44e4` 建立 `feat/constellation-gold`。Owner追加要求：生命、金币、介绍、初始遗物与牌组的排版对照《杀戮尖塔》选角页；按钮允许简化；选角背景启用已批准的1600图元旅行者版本。仅调整选角页表现，游戏规则、角色锁定和其他页面不变。

## 来源与图形

唯一命之座来源为 `docs/design/reference-ui-lab/constellation-exact.png`，通过 Git LFS 取得真实512×512 PNG，SHA-256：`5780bc541d322b369b61f656908da59bdeee7f3ad83988edca8be23776720ecd`。只使用Alpha；金色沿用原CSS `#FFE0A2`，保留源Alpha最高167/255。没有新增星星、连线或花纹。

`comparison.png` 左侧为原Alpha金色着色，右侧为简化参考，底部均按118px实际显示尺寸。`simplified.png` 为离线参考，不能当作游戏截图。首稿222线段已因Owner指出多角色累计成本而淘汰；只用99直线的方案会明显折直曲线，也未采用。

当前为 **93图元：44条原生矩形线段 + 49段原生圆环弧线**。复用既有100001/100006图片、旋转、缩放及横向裁切；静态布局包含3个容器，共96节点。原图Alpha骨架拟合容差0.7显示像素，不按放大细节追加图元。图形在页面生命周期内复用，角色刷新不生成节点，不再写首字占位。

复现：Python3.12（Pillow/NumPy/OpenCV既有安装）运行 `scripts/art/fit-constellation.py --arcs --tolerance .7`。

背景复用 `experiments/lumine-native-fit/fit-hybrid-final/budget-1600.json`，1600图片+28动态容器，沿现有画像控制器首次创建、离开隐藏、重入复用、根销毁释放。归一化后的全部1600行与原实验 `lumine-native-v11/rows-1600.json` 完全一致，独立冻结SHA-256为 `8feed38c818cfa0abda50d1955cfaa99f360ec60bf501544a7245aa4c779eee5`。224个半三角使用独立启用填充的预制，不修改其他共用图片预制。

## 验证与限制

- 最终正式GIL候选72a73a22绑定干净源码 `736e36a1`，已写入、独立读回：361模块、22865个转换节点、逆向核对0差异。实际身份见 `candidate-identity.json`，全部断言/计时见 `simulator-verification.json`。
- 最终实际Lua/Simulator：首次选角模型ready 872.19ms；20次返回重入模型响应P50 52.55ms/P95 128.79ms/最大220.69ms；节点不增长；角色锁定保持，测试局部切换隐藏/恢复不重建；根销毁后0节点。各轮有并行负载差异，不据此比较提速，也不称完全不卡顿。不是GPU帧时、实机流畅度或手机结果。
- 初版径向填充在软件PNG渲染器中错误显示完整圆环，已淘汰；改用环形笔画的横向弦裁切并旋转，实际Simulator能正常显示弧线。新增运行时遮罩断言会拒绝旧候选的径向/未开启遮罩（实际负控已失败），不再将未通过页面预览的中间候选交给Owner反复导入。
- `comparison.png` 是拟合参考，不代表正式平台笔画：8段圆弧受900单位尺寸上限影响而加粗并降低Alpha，填充百分比还会量化。实际线宽、连接和留白仍须以页面截图评审，原参考合成图不替代游戏画面。
- `selection-simulator.png` 和 `starter-deck-simulator.png` 来自最终GIL独立读回，实际执行完整Lua；前者SHA为 `7a7f09cc91b0b798505d557cf9b3e048ac2a4c73144132a4c3bde896970d6fd6`，与先前已量化的快速页面预览逐字相同。独立复审 `selection-native-readback-736e-r5` 对源码及同候选Simulator静态视觉判PASS：实际尺寸下主体、曲线、主要留白与细线可辨，无遮挡或新增装饰。计算上的约2.06px弧线量化端点风险已包含在此图中，仍保留官方设备复核。
- 画像来源及生命周期33项、正式页面与共用卡面23项、Lua选角刷新41断言和工程门禁已通过；后续补强另有运行记录。新增half绑定缺失/同ID拒绝及完整批准背景行哈希已覆盖。
- 源码历史测试增加完整文件前后来源外层，旧压缩归档不改写；当前Full仍读取真实源码，保留未知漂移与linked-owner拒绝。

**当前未完成：本轮官方导入身份核对、新ready、游戏截图、首次/重复进入与角色切换实机验证、设备性能、精确HEAD完整CI及合并。** PR #662保持Draft。Owner明确先看Simulator截图，未授权本轮键鼠控制，不自动操作客户端或发布；不再要求Owner反复导入中间候选。

2026-11-14 名称调整：菜单、角色选择、四种旅行者元素配置的显示名、节点/战斗 HUD 及叙事统一使用“旅行者”；内部角色与元素 ID、准入、属性和其他角色名保持不变。`build:data`、`build:theme`、`build:ui` 通过；`game_ui_classes` 12组、`noncombat_v25_menu` 41项、`competition_character_admission` 通过，精确源码/原生遮罩合同3通过、1可选浏览器集成跳过。独立复审 `traveler-name-working-8915cfb-r1` PASS。上方候选与截图仍绑定此前源码，不作为本次名称调整或后续按钮精修的候选证据。

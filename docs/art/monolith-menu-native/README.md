# 断层石碑：原生 3D 主菜单候选

> **实现型实验 / DRAFT / 非发版。** 目标是把已选的“断裂石碑与悬空石阶”视觉方向，用千星现成的原生 3D 模型摆进实际游戏场景，避免 4,500–13,201 个 UI 图元还原 PNG 的旧性能失败。当前包含真正可供 `scene_build_blocks` 消费的 JSON 和菜单叠层构建接线，**不是 GIL 或官方实机截图**。

## 已落实

| 交付 | 实现 | 验证级别 |
| --- | --- | --- |
| [原生场景布局](scene-monolith-menu.json) | 30 个静态模型实例、9 种已有官方 ID，石碑/裂隙/阶梯/远山/遗迹分层；`install:false`、`solid:false`、`ARTMENU_` 前缀 | JSON 已静态自检 |
| [相机/环境候选](camera-contract.json) | 固定方向 yaw=0/pitch=13°、距离 19/FOV 43°；18 时有云 | 参数未经游戏校准 |
| [校验器](verify-monolith-scene.mjs) | 编号白名单、预算、非碰撞、几何及防自动安装 | Node 本地可复验 |
| [原生 UI 透视适配](../../../scripts/art/monolith-menu-overlay.mjs) | 对已有 `menuPanel.backdrop` 只调整贴图与透明度，隐藏旧遮挡层，保留标题、按钮和结算输入事务 | 纯结构测试 2 项 |
| [构建入口](../../../scripts/art/prepare-monolith-menu.ps1) | 隔离目录内构建场景 GIA 资产和 `game-ui.json`（不会改用户原始存档） | 本环境没有本机 MCP / 原神，未执行构建 |
| [可选 UI 参数](../../../scripts/build-ui.mjs) | `--monolith-menu`，默认关闭且禁止 release candidate 和旧 menuBackground 混用 | 需当前源码 CI 核验 |

两张已选设计概念图只提供**空间关系与氛围基准**，不以它们的像素作图元输入。首稿 SHA-256 `7dd9f7c12d5458cc5531f3b615cc3baf3b526b25812df60ec9c6150569a59044`；备稿 `ad753f22836a9ec11daa197ffa1c56b8ddca0c512cef4ee4eb31601e53e14dc6`。此前已经拒收的红色人物封面不在参考范围。

场景模型编号来自本仓库 [7 件遗迹样板](../scene-spike/README.md) 和 [32 件景片](../production-scene-3d.md)。特别是 `20001874` 的蓝色透明块有公开社区实测描述，**但作为细竖缝的拉伸与外观仍须当前客户端验证**。不直接复制其他游戏的场景模型或界面。

## 直接执行

在 Windows 的仓库根目录：

```powershell
node docs/art/monolith-menu-native/verify-monolith-scene.mjs
node --test docs/art/monolith-menu-native/test-monolith-overlay.mjs
./scripts/art/prepare-monolith-menu.ps1
```

本机默认工具路径：`D:\MiliastraTools\genshin-miliastra-mcp\scripts\dev\mcp_cli.mjs`，若不同用 `-McpCli` 指定。产物在 `build/monolith-menu-native/{scene,ui}`。构建脚本只设置 `MILIASTRA_ALLOW_LIVE_WRITE=0`；**不会**直接把场景装进关卡，防止污染正式存档。

后续先在**独立测试存档**：导入新 GIA、固定镜头、读回实体与材质，使用同一构建的 UI 效果检查主菜单。场景必须做到仅在菜单可见；如果不能在进入选角/战斗时隐藏/隔离 3D 模型，不能合入正式候选。不能把预览图当作千星的官方截图。

## 真正的门槛

1. 官方原生截图：与已选构图并排确认巨型石碑、裂隙、悬空石阶、左侧文字可读；检查实际纹理、远山、朝向、默认天空草坪和镜头裁切。当前 **UNVERIFIED**。
2. 运行时：菜单进入/离开与结果页、20 次切换、显隐与回收、游戏真实输入无回退；**防止 3D 模型留在战斗世界中**。当前 **UNVERIFIED**。
3. 设备成本：GIL 容量、冷/暖完整可操作时间、同候选 PC/手机帧时间，不能以图元减少直接宣称帧率。当前 **UNVERIFIED**。

本 PR 是实际场景实现候选，供后续 Codex 在具备千星客户端的工作区完成构建、真实截图和修正。它不包含新的发布许可，默认游戏视觉不变；在技术和视觉两方面被证明前不能进入 Merge Queue。

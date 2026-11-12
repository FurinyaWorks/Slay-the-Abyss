# 岩荧战斗待机 · 人工批准母版（2026-11-10）

**状态**：Owner 2026-11-10 表示待机 GIF 的视觉效果达到可用审美水准，本目录冻结那一版真实素材及确定性生成方法。不代表千星 GIL/57 图元或 PC/手机性能已经验收。攻击、受击继续使用已有整角色平移和特效，未做新角色动画。

## 文件和版本身份

| 文件 | SHA-256 | 用途 |
|---|---|---|
| [lumine_static_approved.png](lumine_static_approved.png) | `32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de` | Owner 认准的静态构图，原字节冻结，不可由程序重新绘制或擅改构图 |
| [lumine_idle_approved.gif](lumine_idle_approved.gif) | `0449a8b3094f0a628f493b27157ae2d8b27d646ceb9541f6f5e9ce98a9ebeff1` | 人工批准的 20 帧待机循环，640×585，110ms/帧，2.2s/轮 |
| [lumine_idle_compare.gif](lumine_idle_compare.gif) | `638be8b90eb33da4846b261b9565424fd8339d32c89413b47e9296472d0885b1` | 左静态右动画对照，用于评审与后续视觉回归 |
| [lumine_idle_133px_spritesheet.png](lumine_idle_133px_spritesheet.png) | `8a9e8dda24e5678c1e279a3a1c42da357e4e5c87d61137da95c4fa18a89a5090` | 133px 可读性参考（5×4帧），并非千星原生资源 |
| [create_lumine_idle.py](create_lumine_idle.py) | `见当前文件 git blob` | 已验证可按原图确定性重建所有图/逐帧图 |
| [evidence.json](evidence.json) | 生成时记录的位移、足部不变量、尺寸和未验证边界 |
| [native-idle-210.json](native-idle-210.json) | `caa7505c9485ae46555c130088c7d486542865c4ae694090935843d5e0b41af5` | 原7303图元/18横带转换，源自归档 `149e1c156` 的 `docs/evidence/lumine-native-idle-20261111/idle-210-asset.json.gz`；非新生成动画 |

### 复现与换角色的正确方法

```sh
python -m pip install pillow numpy opencv-python-headless
python create_lumine_idle.py lumine_static_approved.png ./rebuild
```

已在当前制作环境从冻结原图重放，**4个派生二进制的 SHA256 与交付版逐字节一致**（两份 GIF、两份 spritesheet）。该脚本涉及的呼吸/飘带空间权重**根据当前荧的姿态调校**，不能不看原图就套用其他角色；其他角色必须重新冻结静态图、调关节/姿势锚点、做1×比较并接受人工评审。

**运动规格**：不重新生成每帧人物外貌，始终固定鞋底；连续低幅身体位移与少量飘带相位滞后；每帧保留原图人物脸、服饰与剑。审查整体感、头/手/剑连接、首尾闭环、真实游戏展示尺寸和原生可迁移性。早期 v1 微动不可见、v2 光学分块割裂均 FAIL，见 [任务 #593](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/593)。

### 千星 / 许可边界

2026-11-12 当前战斗构建采用 `native-idle-210.json`：复用归档原生转换 `149e1c156` 的7303张静态图元、18个运动父容器和2.2秒批准动作场，使用既有20样本参数匹配源GIF每110ms的节奏。源PNG/GIF原字节与许可不变，非重新生成动画；该原生横带形变是动作近似，不是GIF逐帧直放。正式official battle只挂此已批准荧资源，缺失或篡改立即报错，不回退57图元、2739档或未批准雷电。创建预算、原生硬限和打包门槛保持原值，实际设备压力仍待验证。

这批是**审美批准的源媒体**，不是可直接作为自定义纹理导入千星的 GIL。下一步只能沿既有原生图元/模板/SDK路线转换，使用实际原生控件数、首次完整显示与手机帧时判定是否可交付；不承诺57控件或替换现有战斗皮肤。需要逐帧 PNG 时执行脚本重建 `frame_00.png`—`frame_19.png`，避免把20张相似图片都写进长期Git历史。

角色「荧」出自《原神》，相关人物形象及设定权利属于原权利人。此资产为非商业同人项目的创作/技术验证，**不声称拥有官方角色版权，也不把游戏原画或其他社区GIA打包进仓库**。生成和审阅来自本项目对话记录，原素材和失败历史哈希按本文件登记。

复现环境：原生成脚本依赖 Linux 的 `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`。Windows 需提供相同字体环境；字体 fallback 不保证对照 GIF 逐字一致。源 evidence.json 保留原临时路径/预览名，只作历史记录；当前入库身份以实际文件及 docs/legal/assets.json 为准。

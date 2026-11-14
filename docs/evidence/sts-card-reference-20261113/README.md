# StS1 卡牌共享结构：集成前证据点

这是可见共享候选的结构与测量记录，**不是完整材质复刻、最终集成 SDK、官方导入或手机验收通过**。最终 SDK 与成本必须在主线程集成闭包后重新采集到独立目录。

## 已接线

`installStsReferenceCardChrome(face, theme)` 是所有正式卡面同一入口。`stsReferenceBack` 放纸壳/插画底，保留的直系 `art`、`art_*`、`artSamples` 放中间，`stsReferenceChrome` 放插画框、类型凸牌、飘带、费用底，原文字和状态遮罩在上层。手牌、牌组/牌堆、节点选牌与放大卡沿既有共用入口继承。

旧装饰子树清空，仅保留旧 writer 必要顶层句柄及 `nativeCardBody/outerBevel` 骨架；不叠两套完整卡壳。三型框共用固定 142 个原生三角槽，原作轮廓经既有 `nativeShape` 的同一耳切算法构建；能力框保留真实内孔。类型变化才原位写变换，闲置或仅变稀有度不重写几何，不创建/销毁槽。余槽隐藏并复位。

角色材料与稀有度材料分开。Geo 从现有 `theme.color.geo` 派生，common 银灰取已量测的 `stsCardReference.rarity.common`；uncommon 蓝、rare 金从当前共享语义 token 解析到同一表。状态/诅咒保留既有中性纸壳与插画底，复用后可恢复 Geo。职业几何当前明确映射 Geo 旅行者→Ironclad；其他职业、状态/诅咒形状没有逐像素认证。

原生插画保留 144×64 源坐标；holder 在 `[0,37.5]`，依统一 viewport `[120,82]` 做 `min(120/144,82/64)=5/6` 等比适配。没有非等比拉伸项目插画。

## 精确参照与单变量阶梯

| 样卡 | 比较用途 |
| --- | --- |
| Anger，Ironclad/common/attack | 母版外壳、攻击框、锚点 |
| Armaments，Ironclad/common/skill | 同职业/稀有度，只比较牌型 |
| Battle Trance，Ironclad/uncommon/skill | 同职业/牌型，只比较稀有度 |
| Inflame，Ironclad/uncommon/power | 与 Battle Trance 比较能力牌型；不存在普通能力档比较 |
| Deflect，Silent/common/skill | 与 Armaments 比较职业；未将其几何宣称为已实现 |

第一视觉交叉来源是 [Mega Crit 官方 Steam 页面](https://store.steampowered.com/app/646570/Slay_the_Spire/) 的原始截图。Anger 原始截图保存在私有 `F:/New folder/.artifacts/shared-ui-sts-reference-20261112/official-4.jpg`，SHA256 `797f0a9976b1dafc4cd6ef54586eb20480650914ffb25551f062f4a4e8e770c7`；body 裁片 `(318,261,541,574)`，人工配准不确定度约 ±2 截图像素。

部件 alpha 的量测输入来自 SpireSpy 的公开原尺寸资源，属于辅助来源，不冒称官方发布的 sprite 包：`https://maybelatergames.co.uk/spirespy/assets/cards/` 下的 `base/ironclad_attack.png`、`rarity/frame_common_attack.png`、`rarity/frame_common_skill.png`、`rarity/frame_uncommon_power.png`、`rarity/banner_common.png`、`mana/ironclad.png`。具体文件身份以 profile 与 `geometry-checkpoint.json` 的 SHA256 为准。原始图片只留私有 `.artifacts`，没有作为生产贴图或加入本目录。

`reference-ui-lab` 的公开 SVG 是简化替代稿，**不作为这轮精确原型**。轮廓坐标以原部件 source pixel 为单位、左上原点、alpha≥128；150×210 logical 对应 600×840 source，比例 1/4。

## 三牌型实际 SDK 轮廓结果

本次使用独立 SDK 0.5.2 软件渲染，白框/暗插画底诊断，源 alpha≥128，候选 minRGB≥142。攻击与技能的 y<113 source 部分被上层飘带遮挡，比较该可见 ROI；能力比较完整框含内孔。结果见 `geometry-checkpoint.json`。这是**精确 source 轮廓的几何 checkpoint**，不是全图材质得分。

| 类型 | 源轮廓 | mask IoU | 最大边界残差 logical px | P95 |
| --- | --- | --- | --- | --- |
| attack | 26 点 | 94.97% | 0.500 | 0.250 |
| skill | 36 点 | 96.02% | 0.500 | 0.250 |
| power | 外 36 点 / 内 35 点 | 96.37% | 0.559 | 0.250 |

细框面积小，2 source px 的边界差也明显影响 IoU，不以边界绿就宣称材质通过。私有叠图为 `.artifacts/sts-card-reference/three-type-accurate-1-residual.png`。此前手写 line/rounded/ellipse 的低成本框约 79–91% IoU，已被拒绝并从生产替换；不得引用那轮作为本轮通过。

外壳从源 alpha 做六部件拟合，数学边界最大 0.5 logical px；实际 SDK 最大 0.707，超目标的点集中在 7 个右侧角像素，未将其凑写为 0.5。它的半径来自拟合约 3.158 logical px，区别于之前无源依据的统一 r9。内倒角与原画笔材质尚有残差。

## 文字、验证与未达项

8/12 字号仅用于早期原作归一诊断，正式候选显式遵守现有最低 14。正文不再覆盖成旧的 124×92 / y=-50，也不压缩单张卡插画来装字。完整字符串和升级标记保留；卡内长文可能不 fit，已有牌组分页详情与升级预览继续提供全文，不能把“字符串没删”冒称手机可读。

本轮定向 19 项通过：10 项结构/源轮廓/holder 合同，真实生成 Lua 的 Skin/Display 复用，以及原有 8 个场景回归。运行时覆盖 attack→skill→power→attack、固定池余槽复位、闲置不重写、稀有度 frame/banner 实际 RGBA 蓝/金/common 恢复、状态/诅咒中性→Geo 恢复、长文→短文→长文、升级标记、插画锚点。执行入口：

```powershell
node --test tests/sts-card-reference.test.mjs tests/sts-card-reference-runtime.test.mjs tests/v25-battle-scene.test.mjs
```

费用仍为简化亮面，尚未复刻原版不规则火焰；纸面与手绘银框材质尚未完全复刻。蓝/金材料是正确类别的共享语义派生，没有逐一宣称源 RGB 量测。插画/文案仍是项目内容。官方导入、GPU、手机、最终集成页内长文与原生 readyArt 结果由主线程在同一集成候选继续核验。

早期成本 v2/v3 PNG 曾因收集器路径错误被覆盖，其收据不再具备 PNG closure；全部已移私有 `.artifacts/sts-card-reference/cost-history-before-accurate-pool/`，并标失效。旧 224 图元和后来的简化 132 图元轮次均不是最终精确池成本，不能用于宣布完成或性能不变。最终必须同时报告完整树总控件/总图像、含祖先可见性的绘制项，以及同 SDK 的 1/5/10 配对耗时；不将软件 PNG+RPC 时间推成 GPU 或手机性能。

本目录的 `source-checkpoint.json` 只锁本代理最终生产文件与测试输入身份；后续集成 epoch 应另建收据。没有本代理提交或新建 PR。

集成前实际工程门禁曾检出 writer/入口复杂度超限，现按具体职责提取 portrait 尺寸/定位、title metrics、body 布局/定位与 reference 渲染步骤，保持更新顺序。`node scripts/check-engineering.mjs` 已 exit 0：6077/6077 度量、347 模块/1964 架构边通过，Lua 无新诊断，2178 职责度量受管；没有调整阈值。详见 `engineering-checkpoint.json`。同轮 19 项定向回归再次通过。标题 installer 与 Display 首写/复用统一读 reference typography.title（当前 14、沿最低 14），主题改到 18 可同时驱动两边，legacy 保留自身字号路径。

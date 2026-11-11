# 千星列表变量图片绑定：离线结论 NO-GO（暂不采用）

2026-11-11 接续 PR #615 原分支。**现有工具链未证实可运行的原生绑定 B，也没有相对 SetImage 的性能优势证据，停止在能力审计层，不迁移正式 UI。** 平台整体及旧节点图桥接能力为 **UNVERIFIED**，不是“千星永远不支持”。[本轮来源摘要、复现脚本及完整调用响应](pr615-image-binding/evidence.md)。无 GI、沙箱或桌面输入操作。

## 本轮结果

| 路径 | 已证实的事实 | 本轮判断 |
| --- | --- | --- |
| 旧图片控件 | [官方图片指南](https://act.mihoyo.com/ys/ugc/tutorial/detail/mh2oih9jou22) 旧界面章节支持通过自定义变量指定非静态图片标识 | 有变量配置概念；未取得目标“固定列表索引→动态文本域”完整合法样本，不能据此断言已适配 Lua |
| 客户端 Lua 图片 | [官方 API](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhtakr07vej4) 的 ClientUIImageControl：imageId/imageSource 只读，公开换图方法 SetImage；ImageSource 枚举列有 StaticReference/Item/Equipment/Skill/UnitStatus/Faction/Currency/Prefab，未列 DynamicReference | 公开文档未提供直接列表图片绑定入口；枚举名称相近不等于旧动态引用兼容 |
| 变量与通信 | 同一 API 支持读取全局变量、监听变化、ServerSignal 的列表参数，未列 Lua 直接写全局变量接口；变量指南要求组件默认变量才同步本地 | Lua→服务器信号→节点图写默认变量→旧控件绑定是待验证可能路径；不能把“无直接 setter”推导成“无桥接” |
| 现有导入工具 | 本机 scene-save.mjs 的 clientRecords/图片读回处理图片ID、颜色及遮罩，未找到目标列表图片绑定配置链 | 无法用现有客户端图片写入器构建可信 B；不猜字段或新造框架 |
| BeyondSimulator 0.5.2 | 本轮实际调用 tools/list、project_open、studio_play 的 start/serverSet/serverSend/get/stop，执行1图片控件、两已知ID的 API 正控 | 变量监听与 SetImage 有效；没有目标旧控件绑定执行链，不能充当 B 或实机 |

官方事实取自本机安装包的官方离线正文，逐文件 SHA256 见证据。在线页面未返回可读正文，版本新鲜度待核验；不是仅凭类型注解推定。视频网页本轮抓取失败，沿用 PR 描述作为假设，未声称重新观看或确定底层控件数/Draw Call。

API sanity 原始日志：初始化 SetImage→100001；注入列表 [100002]、[100001] 后回调分别读到两值，图片仍为100001；随后显式 SetImage 正控切为100002。直接写 imageId 被拒绝，DynamicReference 枚举及假设的变量直接写入口在模拟器中为 nil。**未配置原生绑定，因此图片不变只证明变量读取本身不会自动换图，不证明平台不支持绑定。** serverSet 是测试端注入，不是客户端 Lua 写变量接口。正控只核对API/图片ID状态，没有像素截图。

未达到“真实绑定可运行”前置条件：不制作绑定样品或 GIL，不跑 70格/100更新/20往返，不生成假的 B、性能百分比或 FPS。变量监听后再 SetImage 仍走相同 setter，不能回答新机制收益；经服务器桥接可能增加通信和同步成本，是否划算需测量。

后续仅在取得目标合法样本或官方绑定配置说明后继续：确认现有工具保留字段，做一格两图、空值/变值/连续触发，必要时复用 ServerSignal→节点图写默认列表变量。B 不调用 SetImage，先构建副本并读回；Owner 另行授权本轮 GUI 窗口后再官方导入、取新 ready 与图片变化证据。样品通过才复用下述工具做等视觉、等输入 A/B，测完整桥接成本并保留不利样本。官方导入、真实 ready、PC/手机性能、容量及视觉均 **UNVERIFIED**。

TASK-94 仅追加此切片计划和记录，不重启背景拟合，不勾选父任务 AC。当前决策：**NO-GO 用于现有 UI 优化；平台桥接能力 UNVERIFIED，实机待后续授权。** 下文保留原查重与执行约束供后续复用。

## 唯一未证实的假设

视频 [BV1xFu26AER3](https://www.bilibili.com/video/BV1xFu26AER3/) 01:45–03:20 展示「固定列表索引 → 动态文本域/图片变化」。**未证明** 7.1 Lua 客户端控件能原样使用、无需节点图桥接、比现有 `SetImage` 快，或减少 Draw Call。不要把视频中的“两个空白图片区域”解释成底层只有两个控件/绘制调用。

官方 [7.1 更新日志](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhiufi00ceh4) 把新客户端控件/脚本与旧界面控件体系分列；[自定义变量说明](https://act.mihoyo.com/ys/ugc/tutorial/detail/mhso1b9wjica) 说明配置在组件里的默认变量才能同步至本地，但**不证明 Lua 可以直接驱动旧控件的列表图片绑定**。先查可用 API/格式；禁止只依据模拟器或 Lua 类型注解推定支持。

## 现有成果：直接复用，不准重跑成“新 A/B”

| 已有证据 / 工具 | 已经解决或测试过什么 | 本次避免什么 |
| --- | --- | --- |
| [TASK-4.21](../backlog-details/TASK-4.21.md) / [abyss_map_ui.lua](../../src/lua/abyss_map_ui.lua) | 地图静止 300 次尺寸提交 15,000→1,200；战斗意图图片/文字 300→0，已有 setter 成功后缓存与生命周期失效 | 不重做 Lua 同值过滤/控件复用 |
| [地图 V25 专项](../evidence/map-v25-20261110/README.md) 及 [summary.json](../evidence/map-v25-20261110/summary.json) | 同视觉差分绘制、浏览器 Pixi/Chrome、真实地图输入；20 次隐藏/滚动及同局地图回访；负控 P95 有改善也有退步，均保留 | 不重跑地图同类负控、泛化 70 格压力和设备性能推断 |
| [TASK-100.1](../backlog-details/TASK-100.1.md) 的 [SDK 最终 A/B](../evidence/task-100-1-sdk-final-comparison-20261109.json) / [#582](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/582) | eager/lazy 同源各 3 新实例×20 往返，控件/冷暖时间/残留；暖态 P95 并未改善 | 不重复通用冷载/20 次切页/生命周期实验 |
| [PR #613](https://github.com/FurinyaWorks/Slay-the-Abyss/pull/613) | 已单独立项 Lua 差分写入和原生 Tween A/B | 不碰 #613 的任务或源码 |
| [map-ab.mjs](../../experiments/art-tech-lab/map-ab.mjs)、[map-measure.mjs](../../experiments/art-tech-lab/map-measure.mjs)、[map-game-measure.mjs](../../experiments/art-tech-lab/map-game-measure.mjs)、[measure-official-battle.mjs](../../scripts/measure-official-battle.mjs)、[replay:outcome](../../scripts/replay-ui-outcome.mjs) | 已有测量、同源记录和输入/对象回归工具 | 不创建新的通用 benchmark、reporter、mock 引擎 |

注意：旧数据属于原候选和原负载，**不能把旧值直接当作新绑定候选的配对性能数据**；只复用测量方法、基线知识与原收据。当前最重要的是验证**新机制能否真实调用**，不是再跑大矩阵。

## 执行：先短路，再做最小探针

1. **阶段 0｜只读能力确认，最高优先级**：核实视频「旧界面控件组/动态文本域/列表变量」机制能否在当前 7.1 客户端 Lua 控件上直接使用，或通过合法的已有客户端 API/现成节点图桥接使用。优先现有官方资料、项目代码/工具以及可合法读取的 GIA/GIL 样本；写明确切 API、数据流和限制。查不到证据就是 **UNVERIFIED**，不能凭模拟器自制方法宣称可用；确证不兼容则 **NO-GO/停止**。
2. **阶段 1｜仅在可行时**：先用**最少控件、两张已知官方图、空值/变值/连续触发**做真正变量绑定的可观察样品。B 不能偷偷回退 `SetImage`。若没有支持原生绑定的运行环境，停止在能力证据层，不为了交“实验”写一个假的 B。
3. **阶段 2｜仅在样品成功且合理可测时**：以**等视觉、等输入、同环境**做一次针对性 A（现有 `SetImage`）/B（原生变量绑定）测量；复用前述工具，只采集**新增机制**的更新时间、调用/控件开销及可见一致性，记录身份/不利样本。**70 格、100 更新、20 往返均不是硬指标**；只有需要证明真实收益、并且已有工具不足以回答时才增加样本。SDK/mock 不能模拟 B 时不做虚假的“性能对比”。
4. **结论**：提交一份短报告：已证实/未证实的平台能力、最小运行截图或调用证据、必要的原始测量、**GO / NO-GO / UNVERIFIED** 及原因。若非显著收益，止于研究，不改生产 UI；若成功，只建议下一步可否用于地图图标/状态槽，不在本 PR 迁移。

## 边界与交接

- Codex 按 `AGENTS.md` 查现有 Backlog/任务负责人及 PR，沿 #615 原分支的独立工作树继续；不要再创建 PR/内部 Issue、手改任务、复制报告或改 #613。
- 不改 Run/Combat、正式 UI、V25/官方美术来源、CI 阈值、原始证据；不用未授权的他人 GIL/贴图，新增文件尽量局限于本研究/实验目录。
- **现在不打开/操作 GI 和用户键鼠**。今晚“可能有空”不是提前授权；如需官方 UI、ready、PC/手机 FPS、容量，暂留 `UNVERIFIED`，等待用户单独提供窗口。完成后仍遵循项目原独审、CI、队列规则；不自动发布或动 master。

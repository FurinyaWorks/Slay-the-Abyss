# TASK-105 璃月参考转场适配

当前为 R2。R1 的“单个岩图标＋两条线、0.86 秒”已被用户实机否定，不作为当前视觉方案或 GO 证据。R1 源码已实际导入并由新日志确认 build/ready，361/361 外部 Lua 与冻结候选匹配；182 条打印记录包含一场战斗胜利，未见错误打印。这只能证明来源和这段运行路径，不能推翻用户对闪现节奏及视觉删减的否定。

## R2 来源与实现

用户提供 `高仿原神转场【存档形式】.gil`，SHA256 `162a0315acb2b9683c9057654b3155cd928f129a5254f1726f2af77de1a326e0`。只读拆取其中的璃月徽记和时间设置，不导入整份存档、其节点图或其他地区。原作者与资产许可未提供，保留来源和未知权利状态，不称作项目原创或另授许可。

参考节点 7 的非循环“过场”计时器接节点 8 的时间点序列 `[1,1.5,2,4,4.5,5,5.5,7,8]`；前七点按火、水、风、雷、草、冰、岩点亮，最后 8 秒结束。标题/文本另有 2 秒循环更新，但参考文案只是重复地区名占位。本项目固定显示“璃月”和批准叙事原句“岩层深处传来了异常的共鸣。”，不引入占位文案或随机换文案。

沿用参考 8 秒总时间轴；0.3 秒覆盖原页面，原构图出现并完整展示，首尾用同一遮罩淡入淡出，7.7 秒起揭示目的页，8 秒解除输入隔离。徽记完全清晰约 6.8 秒。8 秒来自参考作者，并不是行业统一规定；成熟机制是保证最短展示时间，避免快载入导致闪现，可见 [Epic FLoadingScreenAttributes.MinimumLoadingScreenDisplayTime](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/MoviePlayer/FLoadingScreenAttributes)。0.3 秒淡化是项目原有淡入/淡出要求的接入适配，未冒充参考里存在同一数值。

源璃月白徽记模板 `1073742848` 有 116 个原生图元；只剔除完全被遮住的部分，保留 95 个。116/95 两个图形由同一 BeyondSimulator Host 直接渲染比较，实际 PNG 像素一致。没有把徽记替换成岩元素图标。布局保留原徽记、标题说明区和底部七元素。

总计 112 个固定控件，最大直属子控件 48，满足原生每容器 60 上限。95 图元拆成两个静态容器，只创建一次；每帧仅调整一个前景遮罩，七个元素只在时间点跨越时更新颜色，不逐帧遍历/重建徽记。数据和来源在 `data/presentation/liyue_transition_reference.json`；布局、颜色、时间仍在既有主题中。

仍复用 prologuePanel / abyss_prologue、Host OnUpdate、covering/opaque、原 beginRun、页面可见性和取消接口。全黑时才创建新局；菜单、下层 action 与陈旧点击回调被拦截，揭示完成后恢复原开局。核心规则、菜单美术、选角美术、房间背景和其他 PR 的实现没有写入本补丁；测试存档的旧页面不能作为覆盖远端更新的来源。

## 验证与证据边界

- R2 真实 Lua Host 转场 11 项，新增逐个执行七元素阈值、7.4/7.55/7.7/8 秒遮罩边界，并要求总时间保持参考 8 秒，防止再次压成闪现。
- 独立评审实跑相同边界，原生容量与逐帧更新范围通过。工程检查（架构、Luacheck、4 项关键变异、6 项原生合同）通过。
- R2 静态构建及独立读回通过；361 模块，模拟器转换逆向核对 0 差异。
- R2 官方新导入、当前 ready、PC/手机视觉与产品 GO 仍待用户手动实测，R1 的官方记录不代替 R2。

R2 候选 SHA256：`4a73df5ea152a8c84be63390050f8036ca8e5296e411598ec6ce590c6adaefca`。采用仓库既有 official-assets + native-page-lifecycle 测试配置，非发布候选；只供本转场验证，不代表其他尚未合并 PR 的最新页面。

交付路径：`F:\New folder\交付\璃月黑白转场-20261114\R2-参考构图与原时间轴\Slay-the-Abyss-璃月参考转场-R2.gil`。导入为新存档，走“启程 → 确认岩系旅行者 → 8 秒璃月转场 → 七天神像”。本轮没有自动发布或合并。

R1 历史模拟器帧仍保留在 `docs/evidence/liyue-transition/`，不代表 R2；该目录的原 7 控件/0.86 秒效果已被用户否定。

## R2 实际运行画面

![参考构图与七元素点亮](../evidence/liyue-transition/reference-adaptation/element7.png)

![确认角色到开局的完整帧序列](../evidence/liyue-transition/reference-adaptation/transition.gif)

[候选身份、原始截图收据和运行日志](../evidence/liyue-transition/reference-adaptation/capture.json)；[参考图形同条件逐像素比较及原时间轴](../evidence/liyue-transition/reference-adaptation/reference-comparison.json)。GIF 首尾停留为便于查看而延长，中间按实采时间点显示，没有延长游戏自身 8 秒时长。这是实际候选 Lua 的模拟器软件画面，R2 官方导入/设备验收保持待验。

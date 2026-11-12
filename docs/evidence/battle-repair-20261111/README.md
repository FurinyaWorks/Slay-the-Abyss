# 战斗二次否决后的排查与内部修复

最新收尾与同候选原始截图、性能对照见[战斗牌堆与遗物详情收尾](../battle-piles-final-20261111/README.md)。以下保留此前排查和阶段评审历史。

状态：**阶段评审，未验收。** 用户最新明确要求先提交、推送现有成果，并开放 Web Simulator 作阶段评审，取代本页早先“内部验证、不发入口”的交付安排。当前画面、真实浏览器数据和已知缺陷见 [阶段评审包](stage-review/README.md)。用户实际玩过 d98 后否决了卡顿、插画颜色、卡框、持续流光与消耗堆；以下保留排查过程与失败证据。不改核心玩法、数值或无关页面，不启动原神，不操作用户窗口，不重置原会话。

## 保留现场与明确参照

- 用户截图私存 `.artifacts/battle-repair-20261111/user-rejected-before.png`，SHA256 `bf93d85ade4b9e0b00a35c1c4a6870b9ca7a2c65c359c897cbb4d744d6c982e9`。
- 原 64326/battle-performance-ten 仅做轻日志读取，现场保留。日志没有 Lua fault；记录了 play→damage 约290–387ms，不能把无错误当不卡。历史输入长度有限，不伪造完整客户端延迟；已有样本未证实 busy 窗内吞下一次 Down。
- 实际运行原私有 V25 原型，保存10阶段图与连续WebM，来源哈希、真实时间、画布位置见 `.artifacts/battle-repair-20261111/reference-frames/`。它是批准设计原型，**不是 STS 实机**，也没有完整持牌拖动、飞牌或消耗堆实现，缺项不编造。
- 原版 Java 固定源码只用于解释动作/等待顺序，不把源码推算称实机逐帧画面。发生自动滚动的后补参考10号帧不作几何oracle；02号纯mouse.move帧与冻结battle图/CSS/SVG用于材质来源。

## 已定位并保存的修复

本地生产checkpoint `de029d631eb53196f24e3f515eb4e62423b6bd99`，来源层checkpoint `d4f774ea`；旧工作、候选、失败测量均保留。

1. **颜色与卡框回归**：`5489e965` 把skill/power的well改成红色。按最终 `project-card-theme.css` 恢复attack `#551C24` / skill `#1A3042` / power `#252536`；按实际geo-card-zhongli SVG及ref02像素恢复棕金框、深灰正文，不用新的任意红色palette。原生材质仍不等于原图纹理。
2. **持续绘制负担**：旧十牌360常驻Tween，每帧约360个节点upsert。官方模式改批准稿两层静态柔光，保留可用性、选中增强与抬牌，默认不流动。真实SDK源注入诊断的60连续帧glow subtree更新=0，Tween/Sequence=0；不把注入结果冒称新GIL。原Java四波与批准稿静态CSS不是同一实现，显式原始波诊断模式保留。
3. **消耗堆黑块**：原先只按Java圆形尺寸拼成85px黑圆，缺整体视觉检查。复用官方102049，32px视觉/44px点击面，18px计数，移除大黑圆，0新增图元；它是紧凑平台入口，不冒称原版精确glyph。
4. **重复整页刷新**：保留前置失败保护、完整事务快照、失败恢复。仅官方成功命令的严格反馈首帧ack通过后复用该帧，少一次重复render；默认与失败仍原路。
5. **普通攻击等待**：只对源证Strike/Bash/Anger/PommelStrike/Headbutt单体单次命中组，把DamageAction前0.1s与非FAST后0.1s摆到正确位置；不泛改Bludgeon/IronWave/群攻/多段。修复缩短gate后legacy飞牌半程硬跳，归一化匹配本组duration；角色和VFX独立时钟保留。Defend与Offering有不同源顺序，未盲目全部提速。

## 实际内部候选与画面

GIL build `de1b298b-58df-46fe-93d1-c22e744f12b0`，实际save SHA `ad4b1ef122850bbb939602eb1fa2e9fa0045c4e04ba38ae97d4d2e2a1eef90d0`；读回14,052控件、360Lua、inverse faults0。仅内部使用，未替换用户服务。

`.artifacts/battle-repair-20261111/material-verified-de1b/` 的四张实图已查看：whole、Defend hover、真实Offering后耗堆1、点击唯一Offering。实际Defend well像素为(26,48,66)、正文为(46,40,45)；HP74/能量5与唯一耗牌实际发生。旁比文件 `compare-reference.html` 不重绘原图，不把不同hover槽/卡型混作几何一致。

实际内部十牌双敌三命令/回合/各20次切换与root清理通过（`internal-candidate/whole-page.json`，0faults），但当轮有主机并行负载，不能拿它的step统计认定体验通过。定向回归含真实颜色、入口UID、静态无tick写、preflight失败、反馈ack回退、逐帧飞行进度；工程345模块/5935测量无新告警。历史来源23/23、旧归档与漂移负控保留。

## 工具侧问题：不能靠改一个数字冒称解决

实际HTTP bundle确认pointerMove每60ms才发送latest，是拖动发涩的独立因子。私有工具改有界latest move及Down/Up/key顺序屏障，leading首事件不白等16ms。独立QA八次孤立移动到实际Pixi卡根绘制变化为40–49ms（此为绘制提交代理，不是物理屏幕呈现）；连续流仍约24Hz，**未通过**。所有数据、场景hash、时钟与失败版本在 `input-cadence/`。

已否决的分支保留：只改trailing16仍60–100ms；pointer携scene与viewer双采集反而降吞吐；clock-light组合增复杂但收益不稳定；prefetch timer假说被trace否定，实际请求已在paint前启动。没有将spy绿色、ACK或局部均值当实际流畅验收。

## 全图事务解释器成本的有界实验

SDK实际使用Fengari JavaScript Lua解释器。完整Run可达8,276表/31,538条目，data/catalog并集约89%条目；不能删库图来换速度。原owners删除后会清函数强引用，未发现该路径保留整图的证据，不把常驻重动画误称泄漏。

仅私有SDK复制件试验公共C API等价capture，**没有修改生产snapshot/Run/Combat或加入伪GIL平台API**：保留全部可达图、原表身份/表键/别名/循环/typed值、原owners一次性能力和rawrestore。原96图、20k深链、9组Run atomic及typed/coroutine负控均实际通过。第一版proxy过多未稳定改善，保留NoGo；typed版三次handler134/124/127→96/79/71ms，但首伤192–281ms，仍非体验通过。

私有worker只有create后的安装及destroy前卸载两hook，精确源指纹、失败销毁和安装状态、重建/停止均有测试；原SDK缓存、原用户会话和GIL原件未改。它是**明确标记的Simulator backend extension**，不得冒称未修改SDK性能或官方客户端读数。组合浏览器连续操作验证仍待完成，记录在 `snapshot-worker-notes.md` 与 `snapshot-bridge-notes.md`。

## 交付门槛

继续按idle/hover/lift/Down/红箭头/换目标/松手/命中/弃牌或消耗分阶段对照。必须同时核实际可见响应、连续输入、真实命令、时钟、资源与画面；step、注册数归零、局部组件截图都不足以替代整页体验。早先未通过前不发新入口；现按用户最新授权开放明确标记的阶段评审，仍不代表产品验收。

## 三药水真实场景纠错与第二候选

先前主性能夹具没有药水，而用户实际页面有三瓶，这是漏测。三瓶时普通完整刷新进入 `Run.potionView`，重复为全部瓶子准备战斗副本，单次约201–220ms。`bf4dc923` 已保存官方HUD只读小型metadata、真实使用仍按当前单槽验证；拖放省去松手后的重复非busy刷新，同时保留实际落点与mandatory preflight；自动悬停仅现有正文关键词。四项集成定向回归通过，工程5942项测量通过。没有改Run/Combat/Snapshot玩法或回滚实现。

实际写入/读回第二候选 `503fee0c-a841-458a-9695-39b2f6381368`，GIL SHA `1af2b80616976b10a945e45d69cc96b9266ee430d281cfc8b09d3667a0c2a252`；save SHA `79be050e8970a2a60b1e72754ccf429ac853699bc344142ac5e784d9df3ce347`，14,052控件/360Lua/inverse faults0。构建时是4d3fe8ae的脏源，随后原字节保存为bf4dc923，不能把收据改写为干净构建。

`.artifacts/battle-repair-20261111/input-cadence/HUD2-RESULT.md` 与原始时间线使用这份实际读回派生的三药水、十牌、双敌HUD。普通SDK与私有typed worker均通过三次真实Down/Drag/Up普通攻击、取消不扣牌/能量、Bash易伤词框、真实时钟及stop清理。它们的体验仍 **NoGo**：

| 浏览器端实际观测 | 普通SDK+leading16 | 私有typed worker+leading16 |
| --- | --- | --- |
| 孤立拖牌事件至首次绘制提交 | 95–127ms | 62–94ms |
| 松手至飞牌 | 356–480ms | 269–333ms |
| 松手至HP变化 | 433–590ms | 358–467ms |
| 页面导航至真实正帧 | 13.95s | 14.27s |

浏览器绘制提交不是屏幕扫描读数或官方客户端FPS。普通独立启动首次遗漏既有私有服务30s诊断设置，在默认8s处失败/Frame0，失败报告保留；随后两组统一30s仅让诊断运行，实际加载依旧慢，不算性能合格。用户64326未修改；本轮own会话全部显式stop，extension active0。

`hud2-command-boundaries.json` 独立SDK真实拖放分段证明：observer-off原SDK Up365ms、typed194ms；observer-on中原snapshot约235ms、typed36ms，规则Core.play不到9ms，剩余两次完整render约110ms，卡面renderCards占主要部分。边界观察会增加开销，不把nested spans相加冒充主计时，也不把SDK分段当HTTP/GPU验收。下一步针对卡面刷新热点，不能再将全部延迟归于网络或快照。

同一HUD2的 `hud2-candidate/whole-page.json` 已跑完整页功能与资源路径：真实三命令、弃牌UID比对、结束回合、各20次弃牌/牌库/地图往返；控件稳定13,782，根销毁0、Lua faults0。其输入是点选路径，只作功能与生命周期检查；868个step的P95约22.77ms不能代替前述真正拖放NoGo结论。

两种单变量没有纳入生产：exact-fit布局缓存虽40次命中，typed真实Up144→140ms、首伤309→310ms，未见整体改善；去除临时目标姿态写入的三次Up155/134/119→131/137/121ms，也无稳定收益。后者通过1–10张手牌/冷热几何、每次只写一次最终姿态、真实drag/hover检查与工程门槛，三命令同逻辑时钟scene逐次全等，仍不足以算性能修复。两者完整源码、补丁和失败/成功诊断在私有artifacts保留，生产源回到实际503fee候选对应的bf4dc923；不继续叠加无实益cache。

本地来源checkpoint `c523f54c` 新增独立完整六文件Git epoch，25项来源/历史漂移合同通过，旧archive不改。未推送、重开PR、合并或发布；TASK-103继续In Progress，AC不勾选。

## 原版参照的真实边界

`.artifacts/sts1-original-video-reference-20261111/` 保存官方Steam宣传片原流、七个精确PTS帧和MegaCrit九张官方截图；不是V25。可直接观察抬牌/蓝青外晕、关键词及部分出牌/命中。宣传片经过剪辑，缺少完整可辨Down→红瞄准→换目标→Up→消耗落堆链，不能倒推输入延迟。

固定Java可核19个reticleBlock纹理加独立reticleArrow的曲线与锁敌弹性，但当前实心圆/三角头仍是原生图元近似；原PNG的透明可见形状尚未取得，不按128画布宽度猜可见点直径。费用球、卡窗/标题材质和静态光与原版仍有差距，批准Geo稿不得冒称STS材质或逐帧一致。

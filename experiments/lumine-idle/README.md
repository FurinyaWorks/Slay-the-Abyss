# 荧原生待机候选 · TASK-25.2.1

唯一视觉源为 `art/characters/traveler-geo/idle-approved-v1/`。本实验不重新设计人物，不将 PNG/GIF 当作可导入纹理。正式构建继续使用原皮肤；只有 `derive.mjs` 明确添加 `battleApprovedIdle` 的副本启用本候选。

## 复用与限制

- 使用 `scripts/art/build-performance-pack.py` 的既有矩形合并器，把冻结原图采样为静态图元。48色主候选保留透明度；64/96/133/210px 对照及24/16色退化仅用于成本评估。
- 使用现有 portrait controller 的64次创建预算、8ms工作预算、完整隐藏发布、缓存、暂停与释放机制。18个父容器按批准动作的2.2秒周期做一阶横带近似，30Hz采样；不重建图片，不逐帧换脸或服装。二维飘带风场在横带中央采样，不能称逐帧等同批准GIF。
- 攻击、受击由原反馈控制器继续驱动整个人物；非idle时横带归位。暂停、释放、原生setter同步回调中止及根销毁分别验证。
- 官方离线指南/API和实际1590项图库目录未提供经本轮证实可用的自定义原图纹理入口。旧图片变量绑定、预设图片染色和3/9宫格不能证明可导入任意源图。本轮复用现有混合拟合器对批准图做了768个椭圆/矩形/三角形，并用编辑器真实导入Lua、规范PNG导出核对；细节丢失，视觉FAIL，没有将其提升为战斗候选。

## 复现

复用本机已安装的 Python/Pillow12.3.0、项目Node依赖、千星MCP和#621的指纹固定Simulator；不安装或修改SDK。

```powershell
python experiments/lumine-idle/convert.py
node scripts/build-native-candidate.mjs <合法测试底图.gil> build/lumine-baseline --official-assets
node experiments/lumine-idle/derive.mjs <上述candidate.json> .artifacts/lumine-idle/converted/idle-210.json build/lumine-210
node scripts/native-candidate-preview.mjs build/lumine-210/candidate.json .artifacts/lumine-idle/preview
node experiments/lumine-idle/fixtures.mjs .artifacts/lumine-idle/preview
node experiments/lumine-idle/serve.mjs --web-dir <已有snapshot-private-web-v2目录> --scenario-dir .artifacts/lumine-idle/preview --candidate build/lumine-210/candidate.json --output .artifacts/lumine-idle/service --port 0
```

基线派生时把资产参数换成 `-`，133px对照换成 `idle-133.json`。输出目录必须全新，不能覆盖历史候选。标准构建/overlay/Simulator夹具分别保留身份：overlay用独立schema引用父收据，实际所有Lua逐字读回；夹具只包装启动模块形成可直接试玩的十牌/双敌/三药水场景，不改实际GIL的规则或启动流程。冻结fixture来自#621，SHA256 `0c7d3724c9f92b967429c563ff360d6906db88efd317c27e09f0ed3282aca683`。

`benchmark.mjs <hud.save.json> <已有SDK导出> <新报告.json>` 复用#621整页SDK基准；末尾call-census有插桩，纯生产性能只取此前未插桩stage。`browser-benchmark.mjs <scenario目录> <service.json> <新目录>` 复用#621真实拖牌/绘制探针。`capture.mjs <service.json> <新目录> [帧数]` 在独立轮次拍真实1280×720画布，暂停浏览器自动时钟、每样本推进2×.055s；截图耗时不是FPS。

所有GIL仅为副本，`MILIASTRA_ALLOW_LIVE_WRITE=0`。官方导入、当前候选ready、PC与真实手机另行验收，不发布。平台容量不从图元、Lua或GIL字节换算。结论与本轮原始证据见 `docs/evidence/lumine-native-idle-20261111/README.md`。

## PR626 第二轮：预算收敛

旧57、同一7303静态/待机先做消融；`motion='static'` 只关闭band更新，整体攻击/受击反馈继续有效。旧3439/133px及768混合图元证据保留，不重新生成或冒作本轮数据。

`adaptive.py 913 1826 3652` 在固定210×192画布上按脸、头发、轮廓、核心服饰加权，贪心二分矩形直到精确预算；不降低整图尺寸。`--pin-details` 先用原48色转换与矩形合并器保留脸/花饰的484个span，再将剩余预算分配给其他区域。固定ROI与依赖版本在逐档receipt中记录。误差只是诊断，验收依赖真实battle.png。

`--edge-cuts` 在每个源像素边界选择误差增益最大的切分，替代中点限制，保留同一硬预算与冻结ROI。文件名前缀单独为pinned-edge，输出禁止覆盖；复现可用 `--output=.artifacts/<新目录>`。原中点候选全部保留，不用新图冒充旧测量。

候选可显式添加 `samplesPerCycle:20`，采样率为20/2.2Hz，原未设置候选仍30Hz。`simplify-motion.mjs` 把相同rows映射到4个父容器，严格断言图元与颜色不变，脚部独立，空间动作近似更粗。两种模式都复用原缓存、生命周期和整人反馈，不逐帧重建。

```powershell
python experiments/lumine-idle/adaptive.py --pin-details 1369 1826 2283 2739
python experiments/lumine-idle/adaptive.py --pin-details --edge-cuts 1826 2283 2739
node experiments/lumine-idle/simplify-motion.mjs <pinned资产.json> <全新b4资产.json>
node experiments/lumine-idle/converge-run.mjs <全新case名> <资产.json或-> <标准父candidate.json> 21 fixed-drag
node experiments/lumine-idle/convergence-report.mjs
python experiments/lumine-idle/convergence-visuals.py <有21张实际截图的case名>
```

`converge-run` 每档独立构建/读回GIL与夹具、SDK quick消融、新鲜backend、实际输入探针及1280×720截图；每轮结束只停止自己的服务。quick保留创建/ready、稳态120步、实际调用计数和根清理，不重复旧20次牌堆往返，当前真实取消与3次攻击仍由浏览器核实。不要把quick当完整回归。

原连续输入逐次await回执，实际事件时长受主机影响，必须连同wall一起比较；`fixed-drag` 追加48次目标60Hz的可信CDP鼠标移动，记录实际送达跨度、发出抖动、请求耗时及绘制变更。最后观测位置的延迟不证明最终目标已呈现，endpointVerified保持false；输入→绘制主指标仍用8次独立实际输入。所有性能轮不截图；截图另开session，不能当GPU FPS或设备证据。汇总器重新验证GIL/save/资产输入和截图摘要，拒绝同名资产被重写后的错贴结果。

第二轮实际效果、数据、决策与可试玩候选见 `docs/evidence/lumine-convergence-20261111/README.md`。正式旧皮肤保留，PR保持Draft，未经最终验收不合并发布。

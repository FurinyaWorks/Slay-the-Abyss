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

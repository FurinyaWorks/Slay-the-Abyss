---
id: TASK-94
title: 验证自适应混合图元与无感加载
status: In Progress
assignee:
  - Furinya
created_date: '2026-10-31 10:47'
updated_date: '2026-11-13 16:20'
labels:
  - art
  - technical-spike
  - competition-deferred
  - 待验
dependencies: []
references:
  - docs/backlog-details/PLANNING-CONSOLIDATION-20261031.md
  - 'https://github.com/CHNISam/Slay-the-Abyss/pull/410'
  - experiments/art-tech-lab/README.md
priority: medium
type: spike
ordinal: 134000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
保留PR397/410独立实验意图，复用TASK-93及PR390/392/400。当前停止底图优化并准备发行，本实验延期，不占比赛M3/M4，不新增日期；未来另获授权后再评估条件接入，不默认启用图元。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 固定真实背景、荧角色和卡图的同源同画质条件，对比最好矩形compact/budget、三角与成熟混合图元，记录截图、控件、体积和生成成本。
- [ ] #2 核对成熟算法许可和平台表达边界；不同画面节点数及未经证实的椭圆节省比例不能当加速结论。
- [ ] #3 官方GIA、同候选PC和实体安卓分别记录创建、缓存切换、P95/P99、内存及官方负载；模拟器结果不冒充实机。
- [ ] #4 验证1/5/10手牌连续交互不整幅重建，缓存有界、生命周期和回退可复现。
- [ ] #5 交付可运行样品与Go/No-Go；冷载1秒、缓存100ms、60/30FPS仅目标，正式接入需证据及Owner批准并交既有品质任务。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-11-01 用户重新授权：仅重启离线同源基线审计小切片，复用现有 rectangles 与 compact 数据，对真实三张卡输出重建图、误差、数据身份和生成成本。算法研究不阻塞其他 M4；保留完整未来实验范围，正式接入仍另需批准。父级完整 AC 本轮不勾选。

2026-11-13 用户授权岩荧选角背景首次原生拟合，独立分支feat/lumine-native-fit，基线903bf2a31。复用V25 nativeShape与现有GIL/Simulator，400/800/1600/3200分割轮廓实验，23%面部局部预算。静态预制首次选中才实例化，public参数0回原背景；保留头像、按钮及其他角色/战斗。冷5/热10配对取证，独立复审与Draft PR，不合并发布。

Owner进一步要求灵活取舍，图元数不作硬压缩门槛；最终看精细美术、资源与快速实显。附件2用于头发/服装/背景结构，附件1保留五官，原生图元层组合，不生成位图纹理。双源SHA与每档参数写入收据；优先评估1600是否以明显少于3200的成本保留质量，400/800不因低数量自动通过。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
本轮范围不含新拟合引擎、大 benchmark、官方导入、设备性能或生产接入；背景源预览在当前工作树为 LFS 指针，明确拒绝作为图片输入。

离线审计结果见 experiments/art-tech-lab/baseline-audit/README.md、results/comparison.png 与 results/results.json：strike/defend/bash 同源 144×64，918/835/916 矩形，既有 compact 编码逐字节复现；MAE 15.408/12.847/14.077，PSNR 19.927/20.949/20.653dB。已查看实际对照图，compact 明显丢失细节，不称同画质胜出。5项定向测试通过，含确定性、LFS指针/非法输入拒绝与已知误差校验。只是离线生成成本，不是官方加载/FPS。完整仓库CI、官方GIA、设备及混合算法未验证；父级AC保持未勾，待独审。

2026-11-07 看板核对（develop 2c85bc61）：实现类交付已按历史记录保留，剩余 AC 待同候选官方/设备验证；当前无在途 PR，状态由 In Progress 归 To Do（待验）。

本轮源图SHA256 84cc7161fe5312e0f72223d50e8ac6aaa65c4be7d45d558b810a2443db5c1faa。已真实编码/读回并运行Simulator。v2键类型失败、v3错误空画面统计保留但不作性能结论；独立复审r1要求的角色边界、清理隔离、同源校验、可见静态采样与当前portrait ready已修正到v4。官方客户端未运行，不占输入；官方导入/ready/GPU/手机/容量仍UNVERIFIED。完整TASK-94 AC不提前勾选。

Owner最新要求：离线画面、速度、资源成本先打磨到位，不请Owner导入半成品；本轮未获键鼠窗口。首轮蒙版方案25冷/50热（每档5/10）矩阵收齐，缓存/销毁通过但品质与速度均不授PASS。依据实际瓶颈复用PR390单轴原生三角放置，减少大面积半三角蒙版并提高同预算轮廓密度；仍不发布、不自动合并。

原图单轴+共享批预制v7：四档总GIL增量541966字节；现代Chromium/Iris Xe取得真实WebGL elapsed query，3200档P95 GPU绘制约5.10ms（137有效样本，disjoint=false），实际浏览器绘制间隔P95约30.6ms；不是官方客户端/手机证明，也不是角色切换100ms通过。Edge90缺Object.hasOwn的失败保留，复用已安装现代Chromium成功，未下载浏览器。

双源最终参数为30%面部预算（替代前期23%），400/800实际画质淘汰。v9实际截图发现共享预制未序列化enableFill，20冷/50热采样保留为stopped-known-display-defect；未用错误画面作最终结论。v11已修复为原生预制启用填充、全幅SetFillUnused，GIL be81ce01136d9405d973f6f9d0c9d1334c7a686ce0822872e55e72bd4860f541，反向投影0 faults，359原模块保留，7项实际Lua合同通过、销毁0残留；当前重新采集四档25冷/50热。独立复审r4关闭身份P2，r5复核填充语义。官方输入仍未授权、无官方导入或设备验收。

最终v11：同GIL/save完成25冷+50热，1600冷P50 9520.9ms/热完整软件显示P95 1696.9ms，3200热P95 2131.1ms，未达1s/100ms。实际Chromium/Iris Xe有效GPU query：1600 P95 2.460729ms（50样本）、3200 2.815051ms（115样本），不等于官方GPU或切换总延迟。1600整页可见图片1938/常驻20878，对照4653/23635；25次销毁0控件残留，但Node内存较大，不授官方内存/显存释放结论。真实GIL增量540207字节（四档合包），非官方容量。原生可行性GO；画质细节与完整延迟产品NO-GO；官方/手机/多角色切换UNVERIFIED。证据experiments/lumine-native-fit/evidence，父级AC保持未勾，不合并发布。

Draft PR https://github.com/FurinyaWorks/Slay-the-Abyss/pull/647 已建立，源码/证据独审r6通过，产品保持NO-GO。原生实验GIL/25冷50热证据冻结903bf2a31基线；develop收尾前移e805a87d，Draft当前有合并冲突，未把未测的新组合追认为通过，不自动重基/合并/发布。Git常规大包两次连接重置后，经GitHub API逐项验证54个blob与完整source tree并保留原提交fd5e161b上传成功。

2026-11-14 Owner明确认可已查看的1600图元画质，认为3200已属奢侈。画质门槛改为GO（仅绑定当前be81ce01…f541/1600），1600固定为主候选，3200只留历史对照，不再追加美术拟合或强压图元。剩余集中于完整加载/热切换性能与官方客户端验证；本条不代表性能通过，不授予键鼠窗口、官方导入、合并或发布。独立确认记录experiments/lumine-native-fit/owner-acceptance.json。

2026-11-14 Owner追加授权：若无问题，将既有PR647完成准入后挂正常自动合并。此授权针对隔离实验与工具的源码合入，不启用正式背景、不批准发布或官方客户端输入。已将最新develop e805a87d纳入分支，唯一素材清单冲突按保留最新清单+本实验11项记录解决；旧GIL/性能数据仍绑定原903bf2a31实验，当前合并组合另行独审及CI。
<!-- SECTION:NOTES:END -->

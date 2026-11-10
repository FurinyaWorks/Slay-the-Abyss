# 地图增量独立复审

审查人：独立子会话 `/root/map_review`。基线：工作树 HEAD `0020ed8827f04ee69fb68850ee12ba13270a919d`（develop + #582）；审查对象为本轮工作树增量，未审 #582 的整个历史实现。生产源码只读，未启动或操作用户桌面。

## 已发现并修复后复核

1. 节点按压反馈原先可被同节点另一触摸的 Up/Exit/EndDrag 复位，后续 Enter 也可能清除已持有反馈。核心点击事务原先仍拒绝错误提交，但视觉状态不遵守同一所有权。主线程已修为 owner 检查，Enter 仅在没有 drag 时设置 hover。独立探针覆盖 foreign Up/Exit/EndDrag/Enter、matching Exit/EndDrag、matching Up 提交、普通 mouse hover/exit、隐藏清理，全部通过。
2. 地图瓶槽的共享入口原先只隐藏不存在的 border/plate，实际 entryFace 仍形成黑色底块。已修为地图 marker 隔离下隐藏 label/entryFace。容量 3→5→3、真实 slot2 fire_potion、地图位置和 126/210 宽命中区、非地图位置/尺寸/label/entryFace/槽隐藏恢复，独立探针通过。

## 已修复的证据收集器问题

- P2：`experiments/art-tech-lab/map-measure.mjs` 的 finally 原先记录了 faults/sourceStable，却未据此失败。独立仅将夹具 OnUpdate 替换为 error 的负控仍产出 status=passed、exit0、faults=333，且给出误导性的更短样本。见 runtime-fault-report.json / runtime-fault-collector.log。主线程已将 faults 或输入变化提升为 failed/非零；原样负控复跑后 status=failed、faults=333、exit1，见 runtime-fault-fixed-report.json / runtime-fault-fixed.log。此项关闭。

## 审查边界与证据

- 图形变化保留真实边/节点池身份、连通性与输入对象。八段原生矩形使用父边的 stretch anchor，随既有裁剪变换，不写 Map/RNG。静止绘制跳过仍由完整 render 恢复 show/scroll/rebind 的正确状态。未见新的核心玩法变化。
- `probe.lua` 运行实际生产 Run、GameUI view、MapUI 和既有原生控件夹具，不复制选择/药水规则。`probe-expanded.log` 是通过输出。去掉 Up owner 防护的独立受控负例在 FOREIGN_up_CANCELLED_OWNER_PRESS_FEEDBACK 失败，见 negative-control.log。早期探针没有保存 pre-fix RED 日志；foreign-up-green1.log 名称已纠正，不冒充旧失败记录。
- 仅审阅地图相关源码及小型探针；未重复整套测试或替主线程声称 Full、GIL 写入、官方导入、ready、PC/实体手机/官方容量通过。
- 实际图像为 SDK 场景经已安装 Simulator Pixi 在 Chrome 软件 WebGL 绘制，并非 DOM 仿画。当前 map-final-game3 浏览器 120 样本存在 P99 297.1 ms / max 3836.7 ms 长尾，不能只据 P95=13 ms 声称无卡顿。其 firstCompleteMs=293.6 ms 从 renderer 实例创建后的 applyScene 开始，不含 SDK 冷启动/脚本模块下载，必须明确表述为“投影完整绘制”。这些数据是当时样本，不是官方 FPS 或视觉最终验收。

## 最终增量代码结论

本轮审查的地图运行时增量通过；未剩已确认 P1/P2 代码问题。原生触摸事务、药水恢复和测量失败门槛的复核结果如上，具体文件身份见 reviewed-sha256.json。未提交工作树的基线 HEAD 不是最终被推送的 PR HEAD；最终交付须以文件摘要复核本次被审内容，后续若改变上述源码仍需对应补审。

此结论只覆盖当前 V25 候选路径及本轮增量代码，**不是产品美术/流畅度最终验收或合并许可**。当前 #588 的 official-assets-first 候选另走 applyOfficialAssets，未自动调用增强后的 applyV25MapLayout 或继承地图配色；合并地图增量不会自动更换那条候选的地图，需明确 PR 集成边界或后续地图接线。同候选 GIL/官方设备、真实端到端加载、连续游戏全流程与平台验收仍由主线程按实际证据报告。

## 后续 GameUI 回放收集器补审（已关闭）

主线程扩展了正式 seed42 选角/恩赐→地图原生点击进入战斗，再通过原生 runMenu/map/hit 和 previewBack/hit 完成20轮往返的收集器。当前真实报告 sdk-roundtrips.json 为 passed，20轮控件17357稳定，销毁根后为0，日志faults=0。永久回归保留39条并新增4类外来触摸反馈用例，共43条；其源码已在第一次最终摘要中覆盖。

补审另发现 P2：map-game-measure.mjs 原先在销毁前检查faults，销毁后只检查句柄数。独立只在存档副本 abyss_ui.OnDestroy 注入错误，20轮回放及控件销毁仍完成，但collector产出 passed/exit0，日志含 OnDestroy lua-error。见 destroy-fault-report.json / destroy-fault-collector.log。主线程已在销毁后补无fault检查；同一副本负控复跑以 GameUI destruction runtime fault 断言失败并 exit1，见 destroy-fault-fixed.log。此项关闭，新增收集器部分补审通过。

硬件浏览器版本已记录实际 Intel Iris Xe WebGL backend、longtasks、sceneRev增量及原始样本。applyScene+app.render()墙钟主要是CPU侧投影/渲染提交，不能转述为GPU计时器测得的完整GPU帧时；软件WebGL旧长尾仍须保留。

后续极小视觉与容量接线已补核：V25主题的普通/燃烧精英 notice 宽度均820且noticeHeight48，避免仅修改构建树被运行时覆盖；空药水槽20个四态face均隐藏（静态构建检查），不改库存/使用规则。容量helper只查询容量并设置UI位置/命中区：3→5→3对应中心 -250→-208→-250，首瓶世界x始终-292，原生glyph与整体hit左界均在金币文本右界-320以右；非地图恢复旧位置/尺寸/面/label及槽隐藏，独立探针全通过（probe-capacity-final.log）。

map-browser.py 已在重复点击后读取新的final snapshot，并断言最终lua-error及页面errors均为空再写passed。未新增测试框架或放宽原门槛。最终复核无已确认 P1/P2；最终17文件摘要见reviewed-sha256.json，具体运行时与附录脚本范围见review.json。

末次纯图像属性补核：V25专属icon.node.combat改为102039，默认主题仍为102044；styleLegend用同一theme.icon.node[kind]给六类图例显式赋图，和MapUI既有运行时SetImage来源一致。独立断言默认主题未被突变、V25战斗图标值及六类图例一致全部通过；未改变节点类型、连通性、输入对象、Run或RNG。此两文件摘要已再次刷新，无新增P1/P2。

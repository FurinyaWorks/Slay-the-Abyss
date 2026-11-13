# 共享试玩入口：甘雨四房研究模式

沿用现有play.mjs和版本固定适配器，不新增战斗引擎。以下记录甘雨首批接入；最新四角色支持矩阵以PLAY-START.md为准。当前甘雨/魈/钟离支持研究run，刻晴不支持。

准备两个独立干净检出：本共享工具分支feat/ganyu-shared-play-run，以及甘雨模型feat/ganyu-skill-sample。不要切换或改动用户正在工作的目录。使用Node22+，将下面ROOT替换为甘雨检出绝对路径，EXACT_HEAD替换为其`git rev-parse HEAD`，已测试本地模型49b4ddf856ced4aa19077e0480ce3d10355e992a（同树远端5f13156a0502d67743f6ddd43eded817aac7660f）。本地和远端提交号不同，必须传当前检出自己的完整SHA，不能混用。

```
node experiments/character-audit/play.mjs ROOT ganyu EXACT_HEAD 37 run
```

每个状态有revision，命令必须带当前revision，防止重复点击/旧指令：
- `p REV SLOT TARGET`出牌；`e REV`结束回合；`c REV`取消尚未提交的操作（不是撤销出牌）。
- 胜利后的reward状态：`o REV`打开或重开，`s REV`暂关，`k REV 1`领取第一张（1–3），`n REV`进入下一房并使旧奖励失效。
- `show`查看，`catalog`列基础/升级候选卡文，`r REV`同种子重新开始，`q`退出。

奖励未打开时不展示候选；不暴露抽牌序列或RNG。仅调用甘雨已审acquisition及run-console路线，默认10卡+遗物，HP跨房保留；没有正式地图/存档/治疗/升级服务。奖励领取不保证下战马上抽到，不是75候选均自然取得证明。44保持旧值，所有来源/命名/平衡HOLD不变。

验证：共享12测试（包含四个旧快照单战适配器及最新甘雨实际打赢首战→开奖/暂关/重开/领取→下一房），不代表真人完成体验验收。旧四角色pin不冒充其他角色最新完整版本；后续各角色负责人提供新快照再独立验适配。

## 魈三房（已过限定技术独审）

同入口将角色改为`xiao`，模式`run`；当前实际回归模型本地1f8fa6ce389f94cfd9e1883dabbeeb45a0bb22da。固定SHA仍必须是自己的干净检出HEAD。

魈原campaign合同不同：奖励自动展示；`k REV CHOICE`领取后**立即进入下一房**，`n REV`不领取并立即下一房。`o`/`s`拒绝，不伪造暂关/重开。沿用三场固定研究遭遇和跨房HP，不添加恢复或正式地图。此处是魈接入时的范围记录；目前钟离已另接人工run，刻晴仍拒绝，见PLAY-START.md。

本增量测试13/13全实际跑：四个旧单战快照+甘雨新run+魈新run。魈逐动作与直接campaign调用输出相等，首战胜利、无改状态拒绝open/skip、领取与跳过跨房、旧revision拒绝均覆盖；这不是完整自然构筑/设备或真人测试通过。

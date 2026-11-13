# 共享试玩入口：甘雨四房研究模式

沿用现有play.mjs和版本固定适配器，不新增战斗引擎。单战starter/all继续支持四角色，run目前仅甘雨，其他角色会明确拒绝。

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

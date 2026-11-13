# 钟离接入正式 Lua 引擎：第一条可执行切片

本轮实时 GitHub develop 与 `git fetch origin develop` 均核为 `903bf2a31e91f10fb24763ab4cea23d586d0bb83`。Backlog CLI 缺失，未伪造认领。只改钟离目录；不改 CharacterProfiles、OriginalV4Profiles、共享注册、Actor、调度器、数据根或冻结 V4。

## 已经做了什么

- `export.mjs` 从已审75张JS候选母表生成 `catalog.lua` 和覆盖清单，不另造数值表。映射 damage/block/draw 原生操作，weak/vulnerable 映射 applyStatus，counter 映射既有 flame_barrier gainStatus；保留 cost/type/target/exhaust/selfRetain/upgrade。
- `bridge.lua` 显式接收调用者选择的可执行ID列表，深拷贝源data后追加定义。拒绝空列表、重复、已有ID冲突、未知或缺少native operation的牌。混合支持/不支持的批次整体拒绝，原输入不动。不是自动角色注册入口。
- 16张已有通用操作牌：01、02、05、07、09、10、12、13、14、15、34、37、45、59、61、69。全部以真实 `abyss_combat` 的 `new/canPlay/play` 执行基础和升级，共32次。测试独立固定期望断言伤害、格挡、状态、抽牌、付款、弃置/消耗；另核4张保留、16张不足能量、敌目标非法和重复出牌原子拒绝。
- 引擎源未mock、不用JS模拟器代替、不注入替代受伤函数。`run.mjs` 绑定6个主要真实引擎源与精确基线并保存SHA256及实际输出。使用仓库已安装Fengari执行，不需要游戏GUI。

## 尚未完成，不应当做成75张游戏接入宣传

59张缺自定义操作的牌不进入native可出牌表。`coverage.json`逐ID列 missingOps。初始遗物也拒绝“已接入”声明：持久jade的受伤吸收、清理、cap与battle-start hook尚未实现。默认初始牌组含03/04，故本片**不能启动完整钟离角色**。

下一阶段真实共享接点：
1. Actor受伤的临时Block→持久jade→HP，覆盖多段、零伤、反击、死亡、其他受伤来源及跨战清理；不能拿普通Block或Barricade冒充jade。
2. 正式action队列的支付/预检与失败回滚，构建jade/pillar条件和付款，不能在付费后补失败。
3. owner-end柱固定伤害→存活时repair→敌行动，Power移区与拆除保留实例，死亡清队列符合正式合同。
4. 59张映射完成后再接完整角色/初始遗物/奖励/商店池和UI。71普通只是研究池，稀有度不能当正式规则。原作命名/人物/平衡/人审HOLD保持。

本次读取 `abyss_original_v4_profiles` 确认雷电/胡桃经冻结role及其独立op解释器；钟离不能伪装成其中role。通用桥仅作为真实引擎验证步骤，不改该体系。

## 重放

```
node scripts/build-lua-data.mjs
node experiments/characters/zhongli/native/export.mjs
node experiments/characters/zhongli/native/run.mjs
```

需正常安装仓库 `fengari-node-cli`；本环境复用已有受信仓库依赖目录，通过 NODE_PATH 指定，未下载软件。首轮导出误传textFor对象而非ID，在运行前报unknown card；修正后生成。未运行全量CI、官方导入、ready或设备测试。没有PR/合并/发布，也不把此片标为原生75交付。

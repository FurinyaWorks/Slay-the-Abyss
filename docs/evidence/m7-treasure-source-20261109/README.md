# TreasureSource 本轮证据

生产源 SHA-256：`9abc146584d55b7c32afc96fd42862bc2844539e4eda7d6902dc49a7d1e70e92`。基线 develop `1eb288472d7b33b7450eec97a624ca2ffa526f39`。范围、保留顺序及未验事项见 [实施说明](../../backlog-details/M7-TREASURE-SOURCE-20261109.md)。

- `metrics.json` 和 `engineering-before/after.json.gz`：相同工具完整采集。`architecture-before/after.json.gz` 保留逐边原图。
- `behavior.log.gz` / `behavior-receipt.json`：最终16/16、完整11项仓库导入输入的真实前后hash。
- `behavior-first-pass.log.gz` / 对应receipt：较慢首次完整成功保留，原仅9项观察输入明确披露，不倒填缺失的两项传递导入。
- `behavior-first.log.gz` / `behavior-second.log.gz`：原失败及更正，未删除。`complexity.log.gz` 保留首次测试接线失败，`complexity-final.log.gz` 是最终3/3。
- `originals.log.gz` / `originals-results.json`：四原Lua文件两侧通过，真实Run/Nodes/mock UI原断言和128检查点/侧一致。
- `source.log.gz` / `source-receipt.json`：新52-owner11/11。`historical-source*`、`prior-epochs*`：原49和59项；49项早期非串行探索和后续串行执行均保留，不叠计成98项。
- `ci-complete-final.log.gz`、`ci-related*`、`ci-runtime*`：原完整历史合同、当前库存/成本及首次失败/修复。初次失败保持失败，不改写为通过。
- `review-independent.md`、`review-source-routes.json` 与最终审查：独立生产/来源探针和哈希。图流每个检查点完整遍历，定义按增量编码，需前缀可重建。
- `backlog*` / `guidance*`：Backlog CLI和范围检查。doctor既有5组重复ID保持未修，非本切片缺陷。

全部时间为本地实际观测或明确标注的规划估计，不是Hosted Full、游戏加载、同画质FPS或官方设备证明。没有本地Full重跑。任务与AC保持未完成，后续仍受原精确HEAD/BASE、独审、正常CI及Merge Queue门禁约束。

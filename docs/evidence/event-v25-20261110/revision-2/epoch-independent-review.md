# 房间源码 Epoch 独立复审

复审者：Codex 子代理 `/root/event_inventory`。范围：只读代码与冻结档身份复核，未改生产或测试文件。

结论：未发现实际缺陷或阻止集成的问题。

- 新 room 档案的22个 current 绑定逐一与 `git show fbe7051b6e8698e43ba9c179e2307943a96c8491:<path>` 内容比较，LF归一化后精确一致。
- 相对 component UI 冻结档仅 `abyss_game_ui_view.lua`、`abyss_map_ui.lua`、`abyss_node_ui_faces.lua` 三个 owner 改变。
- 历史 `component-ui-source-epoch.json.gz` 与 HEAD 已提交字节逐字相同；旧冻结档保留。
- room档 `committed-owner-slice` / `currentTreeCommitted=true` 有对应提交内容；组合proof明确 `currentTreeCommitted=false`，未冒充完整已提交树。
- 组合层保留全部继承 owner 与 target；LF/CRLF准确投影、暖后每owner漂移/null/抛错缺失、foreign不授权读取负控均存在并通过。

## 本轮定向测试

命令（工作目录 `F:/New folder/.worktrees/event-v25`）：

```powershell
& 'F:/New folder/.artifacts/toolchains/node-v24.18.0.exe' --test tests/room-ui-source-epoch.test.mjs tests/seven-refactor-source-epoch.test.mjs
```

结果：20 tests，20 pass，0 fail，duration 15571.7146ms。实际运行工具返回 exit_code=0。

首轮默认 Node22 在受限沙箱中创建测试worker报 `spawn EPERM`，未执行合同；随后使用已有 Node24.18.0 并允许测试worker创建，以上20条合同全部通过。不把首轮环境失败当作产品失败。

原始输出保存在本次工具会话返回（exec session `20163`，完成 chunk `e42da4`）；此前未重定向为独立磁盘日志，本产物为当轮结果与身份归档，未声称有原始磁盘日志。

## 复审文件 SHA256

下列为写入本证据时读取的磁盘原始字节SHA256（包含实际换行字节）。

| 文件 | SHA256 |
|---|---|
| `tests/helpers/room-ui-source-epoch.mjs` | `ddcb90da9fdaa1b93ccdc903cb348dd99c2ccaeaa2d5350bc2ed586631612500` |
| `tests/helpers/room-ui-source-epoch.json.gz` | `0b3cb34acf85e814bd3e7d82254e9586a6a60c78e20fd95603b2e96e877d7bfc` |
| `tests/helpers/combined-epoch/source-epoch.mjs` | `e43daa8bc34ea6b4ad8d393ca1900313f3170e6ab078245443fa4de4f4480aa1` |
| `tests/seven-refactor-source-epoch.test.mjs` | `3e38344b3e4dd0b5d7949b284d67305ffaefd2a11a7232bb8d47c8b674a8d72e` |
| `tests/room-ui-source-epoch.test.mjs` | `877ab19bf641435284237fd5861ca789d7981b4506aa4dccc220543664ae7c71` |
| `tests/helpers/component-ui-source-epoch.mjs` | `311d47d5fc85c29021a124f53cf836d54121178685e23d2499f1d3e2d79cfba9` |
| `tests/helpers/component-ui-source-epoch.json.gz` | `df2a27ff146ecbee4fb01054eb1071458ffe491ece1bb50fa6fb33d19df74d4a` |

后续只注释复核：`room-ui-source-epoch.mjs` 仅新增 `The 22-owner slice is committed; the composed 345-path historical corpus is not that Git tree.` 解释注释；移除该单行后的原始字节 SHA256 与上轮复审值 `37c15b29aca1c4ef00dff6b9110109c9fcb7b1b70c777c945e00141dd33a6232` 完全一致。语义未变，按主代理要求不重复测试；上表已刷新当前原始字节哈希。

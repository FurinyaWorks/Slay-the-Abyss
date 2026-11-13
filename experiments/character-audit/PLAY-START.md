# 四角色统一试玩入口

这是隔离研究试玩，不是已合入正式游戏。无需现在逐项批准；统一实测时再记录反馈。

## 最短启动

使用Node22+，在本工具分支feat/zhongli-shared-manual-run的独立干净检出中运行：

```
node experiments/character-audit/play-launch.mjs --list
node experiments/character-audit/play-launch.mjs ganyu MODEL_ROOT run 37
```

MODEL_ROOT是对应角色模型的独立检出路径，不是工具目录。启动器只读取内容树身份，不下载、不切分支、不写角色文件；与已核树不符会拒绝，不偷偷使用“最新”。同树的本地/远端不同commit号可以使用；随后原适配器仍检查干净状态、完整HEAD和每次命令前的文件漂移。不要对用户正在编辑的目录运行。

|角色|固定内容树前缀|候选数|可用模式|仍缺失|
|---|---|---:|---|---|
|甘雨|139addcb|75|starter / all / run四房|44支配、正式地图/命名/自然平衡|
|魈|9d184954|75|starter / all / run三房|正式地图/命名/自然平衡|
|刻晴|c411d0e6|75|starter / all / run三房，043/044已支付待选|隔离研究版；无存档/重置，连续战独审待确认|
|钟离|43cf97c1|75|starter / all / run三房|validator 修订定向复核待确认；v37池71暂定common，不是完整稀有度取得|

starter是角色初始牌组；all是各候选一张人工测试，不是自然构筑。没有升级服务、保存、正式美术或设备验收。刻晴模型不能因为工具可下载就声称已远端备份。

## 操作与差别

界面每次给revision；`p REV SLOT TARGET`出牌、`e REV`结束、`show`查看、`catalog`读基升候选、`q`退出。旧revision拒绝，出牌后牌号重新编号。`r REV`从同一种子重开（当前没有已支付待选事务）。

- 甘雨奖励先`o REV`打开，`k REV 1`领取，`s REV`暂关可重开，`n REV`下一房。
- 魈/钟离奖励直接展示；`k REV 1`领取或`n REV`放弃都立即下一房；不支持o/s暂关。
- 刻晴可见实例retain/move/purge用JSON命令，见KEQING-LATEST.md；状态/诅咒显示不是75张角色候选。043/044明确拒绝，不能靠取消付款前预览或自动第一选项掩盖。

反馈请记录角色、内容树、种子、房间、revision、卡ID及操作。重点区分“没抽到”“付不起”“效果不直觉”“同类没取舍”和实际错误。测试/独审通过仅证明限定技术路径，不代替真人审美、来源、B8调值或自然平衡批准。

刻晴新事务版本只允许 play/end/choose。待选用 `j {"type":"choose","revision":1,"token":"choice-1","instance":"界面列出的实例"}`，实际值照界面。取消、重置或旧选择均拒绝；q退出丢弃进程会话，不会保存/退款。旧同步版本限制参见历史文档，不代表新版本已通过正式验收。

刻晴run详情见 KEQING-RUN.md：两个奖励候选，领取/跳过立即下一房；这是新串行研究路线，不能沿用旧反事实实验的平衡结论。

# 魈十二域自然战斗作者见证

Shared精确 `27f2a6512fd9cc906ff70b436f2a3620dbae5258`；脚本预注册于 `239701d86cb2f3f95b1cf0812c433e4c3d780c13`。作者独立workspace archive，src/build-only，唯一256MB单进程，首次运行。未经HP/energy/牌序/offer修改，未按结果改策略重跑。

```
seed=41 first=won offer=xiao_candidate_x08 upgraded=false result=paid hp=66
seed=42 first=won offer=xiao_candidate_x10 upgraded=false result=paid hp=54
seed=43 first=won offer=xiao_candidate_x09 upgraded=false result=paid hp=61
seed=44 first=won offer=xiao_candidate_x03 upgraded=false result=paid hp=60
paid=4 dead=0 unseen=0 incomplete=0
```

每个seed以封闭source starter开始，固定原生cultist_solo遭遇（不是随机地图），当前手牌可见策略通过Run.play/endTurn真实获胜；领取实际首offer，保存deckUid与升级，次战自然抽到该UID并真实paid。未触隐藏牌序，未直接杀敌/填能/移动实例至手。到取得牌首次paid即停，并不证明第二战胜利。生命按当时combat读取。

覆盖仅4/12身份且全部基础，rare、升级和其余8身份未见，不能由4/4外推自然分布/平衡。20回合100步上限预设，死亡/未见/未完成均明确计数；本轮恰为0而非删除失败。命名/来源/平衡/人审与既有Intangible/终局差异HOLD保留。

实际进程exit0，已同时通知owner/主控释放唯一测试窗口。本次未重复owner/独审的受控事务故障测试，不冒称该脚本有所有覆盖。

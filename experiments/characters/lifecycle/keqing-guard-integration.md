# 刻晴035/036/067条件防守真实接线

权威 `mechanics.mjs` commit `89d898c407e35db85b0bd053d92e6dfa9a4b549a`，SHA256 `489cf1d13748337fac61b28d31edf514a19fe782e03f6681ba7d6b7358453bac`。源名称/rarity/准入均HOLD，延续special研究投影。

三张均1费技能、非消耗：035先4/7格挡，再按存活敌人数最多3点格挡；036先5/8格挡，再无楔且无附魔时3格挡；067先4/7格挡，再恰一存活敌人时3格挡。严格保留两次独立Block动作，不把两段合计；035奖励段只一次，不逐敌触发。第二阶段在基础格挡动作后实时检查资源/存活敌人；同步反应与先入TOP动作已生效，原生BOTTOM回调仍按队列顺序执行，不承诺均早于第二阶段。条件使用isActive排除死亡、逃离、halfDead、isDying；不继承旧隔离adapter提前plan的简化。

严格已知ID、source效果/flags、UID/turn/paid上下文绑定；雷楔与附魔均不消费/刷新，也不触发设楔初始遗物。新21张显式研究奖励域继承18域，旧域/正式四色75池不变；closed Starter一次初始化，等权无放回不伪称正式概率。

验证：144基升/资源/敌人数/Dexterity+Frail矩阵、6基础格挡后live gate变化、3presence排除、24非法paid/auto、Corruption/FNP；24seed真实奖励领取/永久UID跨战paid；6wholeRun后段故障回滚重试。胜利999伤害、手牌放置与能量使用夹具，非自然整局、完整平衡或实机验收。完整CI/develop准入/正式入口/设备验收未完成。

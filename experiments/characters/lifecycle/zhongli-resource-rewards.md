# 钟离十四普通牌受限研究获取域（显式实验共享接线）

基线d8a351086f5095127ae8071272cf9c93f8a61ac4。显式域 `zhongli-reviewed-common-fourteen-v1`；只包含已shared普通资源牌03/04/16/19/20/24/26/28/38/39/57/62/66/73。冻结源model SHA256=9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34，原rarity标签全部common，保持不改；不包括基础01/02、Power21/31或其它未接候选。

catalog完整定义包含基升、费用、消耗、保留与source metadata。03/04期望值来自已审starter source，closed factory只向私有输入副本追加另12，并且只调用一次现有Starter.new，由其原样负责01–04及初始化；随后完整validate全部14，不复制初始化或覆盖定义。调用者带starter ID沿原Starter collision拒绝，即使完全相同也不扩准入。其它12固定投影自角色源。66用原生flame_barrier，致死受击不返伤，与JS旧模型不等价HOLD。

provider只对clone cardRng操作，返回ids/rng/原rarityOffset/upgradeBits；正式host负责事务提交。每次等权无放回，需求超过14只给14，不补位/不重抽，零需求明确失败；upgrade在选完全部identity后使用实际act概率。所有source定义全对象漂移、重复catalog identity、未知域、错角色、Prismatic拒绝。未知额外普通catalog牌不进入这个白名单。

这是明确研究分布，不是正式STS rarity roll、75牌完整池或自然构筑平衡批准。closed factory仅注入定义和显式domain，保留真实source starter、虚拟战初jade3与现单敌/动态召唤拒绝；不修改正式注册、Run或Combat；shared仅新增CardPool显式domain路由。

已在owner授予唯一256MB窗口运行provider标准wrapper，首次1/1 PASS（8.122秒）；随后增补14完整资源/尾效果/消耗/保留源断言、Starter仅一次调用及四原版色池各75不变，再串行1/1 PASS（7.485秒）。无首次失败或生产修正；两个进程均已退出。仅provider返回clone RNG而不写run及拒绝时原态验证，该原始provider阶段随后已获限定独审，但原始证据不包括shared dispatch或Run奖励事务。下节为后继shared接线及独立实测范围，不能以手写固定offer代替真实生成。


## Shared Run integration

The explicit `zhongli-reviewed-common-fourteen-v1` marker now routes through
CardPool.prepareRewards to this provider. Formal pools remain unchanged; source
common labels are not a claim of official probability or rarity approval.
Owner coverage includes twelve real generated-offer claim/UID/next-Run.play
chains, settlement failure after actual sampling, zero/Prismatic/drift rejection,
claim failure after actual obtain, repeat claim rejection and explicit abandon.
Victory, next-hand access, energy and jade are controlled fixtures, not natural
combat or complete fourteen-card random acquisition. The first new end-to-end
probe wrongly called nonexistent skipCardReward; it was corrected to the real
claimCardReward(run,0) abandon API and rerun. Runtime behavior was not changed
for that fixture correction. Single-enemy/dynamic encounter gates and native
lethal-no-counter HOLD remain intact.

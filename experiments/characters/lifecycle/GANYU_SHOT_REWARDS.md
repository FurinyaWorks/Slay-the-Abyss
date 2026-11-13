# 甘雨 27/51 隔离奖励承接

基于已审 `26f180a7` 与共享父 `ca7e7381`，新增显式 `abyss_ganyu_shot_family_reward_run.new(data, seed)`。49 定义、47 非 basic 奖励：basic 2 / common 10 / uncommon 35 / rare 2。27、51 严格按来源保持 uncommon；卡面及升级数值未改，HOLD/experimental 标记未解除。

旧 47 定义域不增加 27/51；正式四色各 75 张、reward/shop/colorlessShop 原池不变。新 marker 才启用新域，仍使用有限同稀有度无重复采样及完整定义比对，禁止 Prismatic Shard，失败恢复 Run/RNG 别名图。

验证由真实击杀结算生成奖励，不注入奖励 ID 或升级位；选择自然出现的 27/51，关闭重开奖励、领取持久 UID、再次领取拒绝、进入下战并通过 Run.play 实付。击杀、敌人血量及入手位置是受控夹具，不是实机或自然抽牌体验验收。全量 CI、官方导入、平衡与实机仍未验证。

作者定向：旧 47 域回归 1/1 PASS；新域 1/1 PASS（30.18s），12 次真实生成/领取/跨战支付，覆盖 27 与 51。首次新夹具在 formal-color count 中误插入尚未声明 newPlayed 断言而失败，修正夹具作用域后通过；未放宽运行时或源门禁。独立复审待记录。

// Isolated candidate. Never imported by the production loader.
const attack = (damage, hits = 1, target = 'one') => ({ op: 'damage', damage, hits, target });
const versions = (base, upgraded) => ({ base, upgraded });
export const statusRules = Object.freeze({
  infusion: Object.freeze({ bonusPerHit: 2, spendPerAttackCard: 1, expires: '本回合结束', stacking: '刷新不叠加' }),
  wedge: Object.freeze({ capacity: 1, durationExtraTurns: 1, expires: '下一己方回合结束', stacking: '不叠加' }),
});
export const cards = Object.freeze({
  KQ043: { rarity:'pending',channel:'reward_candidate',candidateName:null,role:'先抽后弃以筛选当前手牌并防守',type:'skill',cost:1,
    effects:versions([{op:'draw',amount:1},{op:'chooseDiscard'},{op:'block',amount:4}],[{op:'draw',amount:1},{op:'chooseDiscard'},{op:'block',amount:7}]) },
  KQ044: { rarity:'pending',channel:'reward_candidate',candidateName:null,role:'有限牌顶窗口定向获取，不洗牌',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'inspect',count:3}],[{op:'inspect',count:4}]) },
  KQ060: { rarity:'pending',channel:'reward_candidate',candidateName:null,role:'仅净化手中状态，不净化诅咒与普通牌',type:'skill',cost:1,
    effects:versions([{op:'purgeStatus',count:2},{op:'block',amount:5}],[{op:'purgeStatus',count:3},{op:'block',amount:8}]) },
  KQ001: { rarity: 'pending', channel: 'starter_candidate', candidateName: '云来剑法', role: '无前置单体伤害', type: 'attack', cost: 1,
    effects: versions([attack(6)], [attack(9)]) },
  KQ002: { rarity: 'pending', channel: 'starter_candidate', candidateName: null, role: '基础防守', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 5 }], [{ op: 'block', amount: 8 }]) },
  KQ003: { rarity: 'pending', channel: 'starter_candidate', candidateName: '星斗归位', role: '来源或换位兑现', type: 'attack', cost: 1,
    effects: versions([{ op: 'wedge', setup: 5, release: 8, attacks: 2 }], [{ op: 'wedge', setup: 7, release: 11, attacks: 2 }]) },
  KQ004: { rarity: 'pending', channel: 'starter_candidate', candidateName: '重击（雷暴连斩分支）', role: '双段单体或雷楔群体兑现', type: 'attack', cost: 1,
    effects: versions([attack(4, 2), { op: 'detonate', damage: 4 }], [attack(5, 2), { op: 'detonate', damage: 6 }]) },
  KQ006: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '消费雷楔换取当前防守，放弃再施放或引爆', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 5 }, { op: 'resourceBlock', resource: 'wedge', amount: 5 }], [{ op: 'block', amount: 8 }, { op: 'resourceBlock', resource: 'wedge', amount: 5 }]) },
  KQ007: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '消费一次当前附魔换取防守，减少后续攻击兑现', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 5 }, { op: 'resourceBlock', resource: 'infusion', amount: 4 }], [{ op: 'block', amount: 8 }, { op: 'resourceBlock', resource: 'infusion', amount: 4 }]) },
  KQ008: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '保持雷楔的单体进攻，不提前消费兑现窗口', type: 'attack', cost: 1,
    effects: versions([{ op: 'wedgeDamage', absent: 5, present: 8 }], [{ op: 'wedgeDamage', absent: 8, present: 11 }]) },
  KQ009: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '低伤单段攻防，保留雷楔但攻击仍消耗一次附魔', type: 'attack', cost: 1,
    effects: versions([attack(3), { op: 'block', amount: 4 }], [attack(5), { op: 'block', amount: 6 }]) },
  KQ010: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '防守启动，不消费或刷新已有雷楔', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 4 }, { op: 'setWedgeIfAbsent' }], [{ op: 'block', amount: 7 }, { op: 'setWedgeIfAbsent' }]) },
  KQ011: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '高费单体击杀兼设置，不消费已有雷楔', type: 'attack', cost: 2,
    effects: versions([attack(12), { op: 'setWedgeIfAbsent' }], [attack(16), { op: 'setWedgeIfAbsent' }]) },
  KQ013: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '低伤群体启动，仅设置一次雷楔', type: 'attack', cost: 1,
    effects: versions([attack(3, 1, 'all'), { op: 'setWedgeIfAbsent' }], [attack(5, 1, 'all'), { op: 'setWedgeIfAbsent' }]) },
  KQ018: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '未附魔时防守保底，附魔时双段兑现', type: 'attack', cost: 1,
    effects: versions([attack(4, 2), { op: 'conditionalBlock', when: 'noInfusion', amount: 3 }], [attack(5, 2), { op: 'conditionalBlock', when: 'noInfusion', amount: 4 }]) },
  KQ019: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '高费集中四段附魔兑现，压缩其他动作', type: 'attack', cost: 2,
    effects: versions([attack(3, 4)], [attack(4, 4)]) },
  KQ025: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '附魔时追加独立第二段的单体攻击', type: 'attack', cost: 2,
    effects: versions([attack(10), { op: 'infusedDamage', damage: 7 }], [attack(13), { op: 'infusedDamage', damage: 9 }]) },
  KQ026: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '消费雷楔单体兑现，与群体引爆争资源', type: 'attack', cost: 1,
    effects: versions([attack(5), { op: 'detonate', damage: 9, target: 'one' }], [attack(8), { op: 'detonate', damage: 9, target: 'one' }]) },
  KQ027: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '群体伤害后消费雷楔获得当前格挡', type: 'attack', cost: 2,
    effects: versions([attack(7, 1, 'all'), { op: 'resourceBlock', resource: 'wedge', amount: 6 }], [attack(10, 1, 'all'), { op: 'resourceBlock', resource: 'wedge', amount: 6 }]) },
  KQ022: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '高费有限非雷楔附魔入口，刷新为1而非叠加', type: 'skill', cost: 2, exhaust: true,
    effects: versions([{ op: 'grantInfusion', attacks: 1 }, { op: 'block', amount: 6 }], [{ op: 'grantInfusion', attacks: 1 }, { op: 'block', amount: 9 }]) },
  KQ028: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '群体多段后雷楔兑现，与再施放争资源', type: 'attack', cost: 2,
    effects: versions([attack(2, 2, 'all'), { op: 'detonate', damage: 10 }], [attack(3, 2, 'all'), { op: 'detonate', damage: 13 }]) },
  KQ055: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '有限早期单体伤害，移出长战洗牌循环', type: 'attack', cost: 1, exhaust: true,
    effects: versions([attack(9)], [attack(12)]) },
  KQ056: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '攻击出牌前无格挡目标的条件双段', type: 'attack', cost: 2,
    effects: versions([attack(10), { op: 'unblockedExtra', damage: 6 }], [attack(13), { op: 'unblockedExtra', damage: 7 }]) },
  KQ062: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'本回合一次易伤入场防护，不清已有状态',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'block',amount:5},{op:'preventVulnerable'}],[{op:'block',amount:8},{op:'preventVulnerable'}])},
  KQ064: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'本回合一次反伤生命损失防护',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'block',amount:6},{op:'preventReflect'}],[{op:'block',amount:9},{op:'preventReflect'}])},
  KQ066: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'高费格挡并移除一层虚弱',type:'skill',cost:2,exhaust:true,
    effects:versions([{op:'block',amount:10},{op:'clearWeak',amount:1}],[{op:'block',amount:13},{op:'clearWeak',amount:1}])},
  KQ021: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'零费清空全部附魔换一次性防守，牺牲当回合后续附魔',type:'skill',cost:0,exhaust:true,
    effects:versions([{op:'cashInfusion',amount:3}],[{op:'cashInfusion',amount:4}])},
  KQ017: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'高费本回合一次消费后重新设置',type:'skill',cost:2,exhaust:true,
    effects:versions([{op:'rearmWedge'}],[{op:'rearmWedge'},{op:'block',amount:4}])},
  KQ033: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'雷楔换本回合下一攻击一次折扣',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'block',amount:3},{op:'wedgeDiscount',amount:1}],[{op:'block',amount:6},{op:'wedgeDiscount',amount:1}])},
  KQ072: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'每回合首次真正消耗牌后抽牌，不以容器冒充事件',type:'power',cost:2,
    effects:versions([{op:'power',id:'exhaustDraw',amount:1}],[{op:'power',id:'exhaustDraw',amount:2}])},
  KQ075: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'最多三回合放弃剩余附魔转未来收益',type:'power',cost:3,
    effects:versions([{op:'power',id:'endInfusion',amount:1}],[{op:'power',id:'endInfusion',amount:3}])},
  KQ070: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'雷楔自然到期转下一回合防守',type:'power',cost:1,
    effects:versions([{op:'power',id:'expiryBlock',amount:3}],[{op:'power',id:'expiryBlock',amount:5}])},
  KQ071: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'每回合首次纯格挡技能后下一攻击首命中增伤',type:'power',cost:2,
    effects:versions([{op:'power',id:'defenseAttack',amount:2}],[{op:'power',id:'defenseAttack',amount:3}])},
  KQ074: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'每回合首次击杀换下一回合抽牌',type:'power',cost:2,
    effects:versions([{op:'power',id:'killDraw',amount:1}],[{op:'power',id:'killDraw',amount:2}])},
  KQ068: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'每回合首次消费楔的持续防守回本',type:'power',cost:2,
    effects:versions([{op:'power',id:'wedgeBlock',amount:2}],[{op:'power',id:'wedgeBlock',amount:3}])},
  KQ069: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'每回合首张攻击有附魔时首次命中加伤',type:'power',cost:2,
    effects:versions([{op:'power',id:'firstInfused',amount:1}],[{op:'power',id:'firstInfused',amount:2}])},
  KQ073: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'本场前三次再施放战技的有限防守',type:'power',cost:1,
    effects:versions([{op:'power',id:'recastBlock',amount:1}],[{op:'power',id:'recastBlock',amount:2}])},
  KQ012: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'本回合结束才设置雷楔的延迟来源',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'block',amount:2},{op:'delayedWedge'}],[{op:'block',amount:5},{op:'delayedWedge'}])},
  KQ038: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'本次敌方阶段每次攻击先减伤，非单个目标控制',type:'skill',cost:2,exhaust:true,
    effects:versions([{op:'block',amount:5},{op:'phaseReduction',amount:2}],[{op:'block',amount:8},{op:'phaseReduction',amount:2}])},
  KQ016: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'将当前战技放至抽牌堆顶留待以后',type:'skill',cost:1,
    effects:versions([{op:'moveCard',from:'hand',to:'top',filter:'wedgeSkill',required:false},{op:'block',amount:4}],[{op:'moveCard',from:'hand',to:'top',filter:'wedgeSkill',required:false},{op:'block',amount:7}])},
  KQ045: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'弃牌非技能回收至顶而非立即入手',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'moveCard',from:'discard',to:'top',filter:'nonSkill',required:false},{op:'block',amount:3}],[{op:'moveCard',from:'discard',to:'top',filter:'nonSkill',required:false},{op:'block',amount:6}])},
  KQ048: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'必须牺牲当前攻击放底换周转',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'moveCard',from:'hand',to:'bottom',filter:'attack',required:true},{op:'draw',amount:2}],[{op:'moveCard',from:'hand',to:'bottom',filter:'attack',required:true},{op:'draw',amount:3}])},
  KQ024: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'防守并保存攻击至下回合，不保留附魔',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'block',amount:5},{op:'retain',filter:'attack',count:1}],[{op:'block',amount:8},{op:'retain',filter:'attack',count:1}])},
  KQ040: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'保存非攻击转换或防守而非通用抽牌',type:'skill',cost:1,
    effects:versions([{op:'block',amount:6},{op:'retain',filter:'nonAttack',count:1}],[{op:'block',amount:9},{op:'retain',filter:'nonAttack',count:1}])},
  KQ050: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'高费保存跨回合组合，当前防守有限',type:'skill',cost:2,exhaust:true,
    effects:versions([{op:'block',amount:6},{op:'retain',filter:'any',count:2}],[{op:'block',amount:6},{op:'retain',filter:'any',count:3}])},
  KQ047: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'第一张牌才抽牌的进攻开手',type:'attack',cost:1,
    effects:versions([attack(5),{op:'draw',amount:1,firstOnly:true}],[attack(8),{op:'draw',amount:1,firstOnly:true}])},
  KQ051: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'弃牌最新一张置底后有限轮转',type:'skill',cost:1,
    effects:versions([{op:'recycleBottom'},{op:'draw',amount:1},{op:'block',amount:2}],[{op:'recycleBottom'},{op:'draw',amount:1},{op:'block',amount:5}])},
  KQ059: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'双段爆发交换下一回合抽牌',type:'attack',cost:2,
    effects:versions([attack(8,2),{op:'drawDebt',amount:1}],[attack(11,2),{op:'drawDebt',amount:1}])},
  KQ031: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'消费雷楔换有限抽牌而非伤害',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'draw',amount:1,wedgeAmount:2}],[{op:'draw',amount:1,wedgeAmount:3}])},
  KQ042: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'正费一次周转',type:'skill',cost:1,exhaust:true,
    effects:versions([{op:'draw',amount:2}],[{op:'draw',amount:3}])},
  KQ046: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'高费抽牌后锁本回合后续抽牌',type:'skill',cost:2,exhaust:true,
    effects:versions([{op:'draw',amount:3},{op:'lockDraw'}],[{op:'draw',amount:4},{op:'lockDraw'}])},
  KQ049: {rarity:'pending',channel:'reward_candidate',candidateName:null,role:'实际抽到技能才防守，不读未来牌',type:'skill',cost:1,
    effects:versions([{op:'draw',amount:1,skillBlock:4}],[{op:'draw',amount:1,skillBlock:7}])},
  KQ015: { rarity:'pending',channel:'reward_candidate',candidateName:null,role:'有限延长雷楔而非新增来源',type:'skill',cost:2,exhaust:true,
    effects:versions([{op:'block',amount:9},{op:'extendWedge',cap:2}],[{op:'block',amount:12},{op:'extendWedge',cap:2}]) },
  KQ057: { rarity:'pending',channel:'reward_candidate',candidateName:null,role:'同目标下一攻击首段有限协同',type:'attack',cost:1,
    effects:versions([attack(7),{op:'markNextHit',amount:2}],[attack(10),{op:'markNextHit',amount:2}]) },
  KQ065: { rarity:'pending',channel:'reward_candidate',candidateName:null,role:'本回合此前攻击过目标的集中火力追加',type:'attack',cost:1,
    effects:versions([attack(6),{op:'previousAttack',damage:3}],[attack(9),{op:'previousAttack',damage:3}]) },
  KQ014: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '设置雷楔并延迟防守，不抵本轮伤害', type: 'skill', cost: 1, exhaust:true,
    effects: versions([{op:'setWedgeIfAbsent'},{op:'nextBlock',amount:3}], [{op:'setWedgeIfAbsent'},{op:'nextBlock',amount:6}]) },
  KQ020: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '消耗最后一次附魔的防守收尾', type: 'attack', cost: 1,
    effects: versions([attack(7),{op:'lastInfusionBlock',amount:4}], [attack(10),{op:'lastInfusionBlock',amount:4}]) },
  KQ030: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '击杀后消耗雷楔向其余敌人转火，未击杀保留', type: 'attack', cost: 1,
    effects: versions([attack(6),{op:'killDetonate',damage:5}], [attack(9),{op:'killDetonate',damage:5}]) },
  KQ039: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '当前和下一己方回合分期防守', type: 'skill', cost: 1,
    effects: versions([{op:'block',amount:4},{op:'nextBlock',amount:4}], [{op:'block',amount:6},{op:'nextBlock',amount:6}]) },
  KQ023: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '附魔时当前敌方阶段的单体攻击减伤', type: 'attack', cost: 1,
    effects: versions([attack(5), {op:'reduceAttack',amount:3,target:'one',condition:'infusion'}], [attack(8), {op:'reduceAttack',amount:3,target:'one',condition:'infusion'}]) },
  KQ029: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '雷楔换当前敌方阶段群体减伤', type: 'skill', cost: 1,
    effects: versions([{op:'block',amount:4},{op:'reduceAttack',amount:2,target:'all',condition:'wedge'}], [{op:'block',amount:7},{op:'reduceAttack',amount:2,target:'all',condition:'wedge'}]) },
  KQ032: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '高费单体伤害以雷楔换当前减伤', type: 'attack', cost: 2,
    effects: versions([attack(14),{op:'reduceAttack',amount:4,target:'one',condition:'wedge'}], [attack(18),{op:'reduceAttack',amount:4,target:'one',condition:'wedge'}]) },
  KQ037: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '有限单体减伤加即时格挡', type: 'skill', cost: 1, exhaust:true,
    effects: versions([{op:'block',amount:6},{op:'reduceAttack',amount:2,target:'one',condition:'always'}], [{op:'block',amount:9},{op:'reduceAttack',amount:2,target:'one',condition:'always'}]) },
  KQ041: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '可见攻击意图条件攻防，非恒定格挡', type: 'attack', cost: 1,
    effects: versions([attack(4), { op: 'attackingBlock', amount: 5 }], [attack(7), { op: 'attackingBlock', amount: 5 }]) },
  KQ058: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '抓公开零伤意图窗口的条件第二段', type: 'attack', cost: 1,
    effects: versions([attack(5), { op: 'idleExtra', damage: 4 }], [attack(8), { op: 'idleExtra', damage: 4 }]) },
  KQ061: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '有限削甲单段，不把削甲当伤害或附魔段', type: 'attack', cost: 1,
    effects: versions([{ op: 'stripBlock', amount: 5 }, attack(6)], [{ op: 'stripBlock', amount: 5 }, attack(9)]) },
  KQ063: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '本牌群体击杀换防守，单Boss未击杀无收益', type: 'attack', cost: 2,
    effects: versions([attack(8, 1, 'all'), { op: 'killBlock', amount: 2, cap: 3 }], [attack(11, 1, 'all'), { op: 'killBlock', amount: 2, cap: 3 }]) },
  KQ034: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '高费即时大伤防守，压缩后续进攻预算', type: 'skill', cost: 2,
    effects: versions([{ op: 'block', amount: 13 }], [{ op: 'block', amount: 17 }]) },
  KQ035: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '存活敌人数量驱动的有限群敌防守', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 4 }, { op: 'blockPerEnemy', amount: 1, cap: 3 }], [{ op: 'block', amount: 7 }, { op: 'blockPerEnemy', amount: 1, cap: 3 }]) },
  KQ036: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '无雷楔也无附魔时的空窗防守', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 5 }, { op: 'conditionalBlock', when: 'noResources', amount: 3 }], [{ op: 'block', amount: 8 }, { op: 'conditionalBlock', when: 'noResources', amount: 3 }]) },
  KQ067: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '单存活敌人防守，与多敌防守反向', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 4 }, { op: 'conditionalBlock', when: 'oneEnemy', amount: 3 }], [{ op: 'block', amount: 7 }, { op: 'conditionalBlock', when: 'oneEnemy', amount: 3 }]) },
  KQ052: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '低费无资源群伤，比KQ005低预算低段数', type: 'attack', cost: 1,
    effects: versions([attack(6, 1, 'all')], [attack(9, 1, 'all')]) },
  KQ053: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '高费单段可靠击杀，放弃多段附魔倍率', type: 'attack', cost: 2,
    effects: versions([attack(16)], [attack(20)]) },
  KQ054: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '低基础三段攻击，强化后才竞争兑现', type: 'attack', cost: 1,
    effects: versions([attack(2, 3)], [attack(3, 3)]) },
  KQ005: { rarity: 'pending', channel: 'reward_candidate', candidateName: '天街巡游', role: '无雷楔前置的群体多段', type: 'attack', cost: 2,
    effects: versions([attack(3, 2, 'all'), attack(5, 1, 'all')], [attack(4, 2, 'all'), attack(7, 1, 'all')]) },
});
export const systemCards=Object.freeze({KQS001:Object.freeze({type:'status',unplayable:true}),KQC001:Object.freeze({type:'curse',unplayable:true})});
export const cardDefinitions=Object.freeze({...cards,...systemCards});
export function describe(id, upgraded = false) {
  const card = cards[id];
  if(card?.unplayable)throw new Error('unplayable system card');
  if (!card) throw new Error('unknown card');
  return [`待命名·${id}`, `${card.cost}能量`, ...card.effects[upgraded ? 'upgraded' : 'base'].map(effect => {
    switch (effect.op) {
      case 'chooseDiscard': return '抽牌结算后，选择手中1张牌弃置（空手跳过）';
      case 'inspect': return `查看抽牌堆顶最多${effect.count}张，选1张加入手牌；其余原序留顶。不洗牌，满手或抽锁时跳过`;
      case 'purgeStatus': return `选择手中至多${effect.count}张状态牌消耗（非诅咒、非普通牌）`;
      case 'preventVulnerable': return '本回合下一次受到易伤施加时阻止整个施加事件，不清除已有易伤，回合结束失效';
      case 'preventReflect': return '本回合下一次反伤造成的生命损失减至0，仅一次，回合结束失效';
      case 'clearWeak': return `清除自身${effect.amount}层虚弱，最低0`;
      case 'cashInfusion': return `清除全部附魔次数；每清除1次获得${effect.amount}格挡（无附魔不获得格挡）`;
      case 'rearmWedge': return '本回合下一次消费雷楔后重新设置1枚，仅一次、不叠加、不递归';
      case 'wedgeDiscount': return `若有雷楔，消费它，使本回合下一张攻击费用降低${effect.amount}，最低0，仅一次，不叠加`;
      case 'power': return `能力：${effect.id==='exhaustDraw'?`每回合首张标记消耗的牌结算进入耗尽区后抽1张${effect.amount===2?'并获得2格挡':''}（能力牌入容器不算消耗事件，抽牌受锁和手限）`:effect.id==='endInfusion'?`本场最多3次，回合结束若附魔仍有次数，下一己方回合获得${effect.amount}格挡并多抽1张（随后照常清除附魔）`:effect.id==='expiryBlock'?`雷楔自然到期时下一己方回合获得${effect.amount}格挡`:effect.id==='defenseAttack'?`每回合首次打出效果全部为直接格挡的技能后，本回合下一攻击首次命中+${effect.amount}`:effect.id==='killDraw'?`每回合首次击杀，下一己方回合多抽1张${effect.amount===2?'且获得2格挡':''}`:effect.id==='wedgeBlock'?`每回合首次消费雷楔后获得${effect.amount}格挡`:effect.id==='firstInfused'?`每回合第一张攻击若出牌时有附魔，首次对存活敌人的命中伤害+${effect.amount}（仅一次，不是每目标）`:`本场累计前3次再次施放KQ003后获得${effect.amount}格挡`}；同名不叠加取较大值，重复施放不重置已用次数；本牌移出抽洗循环（不是消耗触发）`;
      case 'delayedWedge': return '本回合结束先处理旧雷楔到期，再若无雷楔则设置1枚（不叠加、不刷新仍存续者）';
      case 'phaseReduction': return `本次敌方阶段每次攻击先减少${effect.amount}伤害，最低0，同类取较大值，阶段末清除`;
      case 'moveCard': return `${effect.required?'必须':'可'}选择${effect.from==='hand'?'手牌':'弃牌堆'}中1张${effect.filter==='wedgeSkill'?'KQ003战技':effect.filter==='attack'?'攻击':'非技能'}牌放至抽牌堆${effect.to==='top'?'顶':'底'}（不含本牌）`;
      case 'retain': return `可选择手中至多${effect.count}张${effect.filter==='attack'?'攻击牌':effect.filter==='nonAttack'?'非攻击牌':'牌'}保留至下一己方回合（不含本牌，未选择则不保留）`;
      case 'drawDebt': return `下一己方回合常规抽牌减少${effect.amount}张，最低0，仅一次`;
      case 'recycleBottom': return '若弃牌堆非空，将最新弃置1张放至抽牌堆底（不含本牌）';
      case 'draw': return `${effect.firstOnly?'若这是本回合第一张牌，':''}抽${effect.amount}张牌${effect.wedgeAmount?`；若有雷楔，消费它改抽${effect.wedgeAmount}张`:''}${effect.skillBlock?`；若实际抽到技能牌则获得${effect.skillBlock}格挡`:''}（受本回合抽牌锁和10张手牌上限约束）`;
      case 'lockDraw': return '本回合不能再抽牌，下一己方回合抽牌前解除';
      case 'extendWedge': return `若有雷楔，期限延长1回合，但最多至当前回合后${effect.cap}回合；无楔不生成`;
      case 'markNextHit': return `本回合下一张攻击对此目标首次伤害额外+${effect.amount}，不叠加；换目标不消耗，本回合末清除`;
      case 'previousAttack': return `若本回合此前已用攻击牌攻击此目标，再造成${effect.damage}伤害1段`;
      case 'nextBlock': return `下一己方回合开始清除旧格挡后获得${effect.amount}格挡，仅一次`;
      case 'lastInfusionBlock': return `若出牌前附魔恰为1次，结算消费该次并获得${effect.amount}格挡`;
      case 'killDetonate': return `若本牌击杀目标且仍有雷楔，消费雷楔并对其余存活敌人造成${effect.damage}伤害`;
      case 'reduceAttack': return `${effect.condition==='infusion'?'若出牌时有附魔，':effect.condition==='wedge'?'若有雷楔，消费它并':''}使${effect.target==='all'?'所有存活敌人':'目标'}在本次敌方阶段的攻击伤害减少${effect.amount}（最低0，同类取较大值，不叠加；阶段结束失效）`;
      case 'attackingBlock': return `若出牌前目标公开意图伤害大于0，获得${effect.amount}格挡`;
      case 'idleExtra': return `若出牌前目标公开意图伤害为0，再对同一目标造成${effect.damage}伤害1段`;
      case 'stripBlock': return `先移除目标至多${effect.amount}格挡（不是伤害，不享受附魔）`;
      case 'killBlock': return `每有1个敌人被本牌击杀，获得${effect.amount}格挡，最多计入${effect.cap}个`;
      case 'grantInfusion': return `获得附魔${effect.attacks}次，覆盖已有次数（可使2降为1），不叠加`;
      case 'unblockedExtra': return `若出牌前目标没有格挡，额外对同一目标造成${effect.damage}伤害1段`;
      case 'infusedDamage': return `若出牌时有附魔，对同一目标额外造成${effect.damage}伤害1段`;
      case 'damage': return `对${effect.target === 'all' ? '所有存活敌人' : '目标'}造成${effect.damage}伤害，共${effect.hits}段`;
      case 'setWedgeIfAbsent': return '若无雷楔则设置1枚；否则不消费、不刷新雷楔';
      case 'blockPerEnemy': return `每有1个存活敌人，额外获得${effect.amount}格挡，最多计入${effect.cap}个敌人`;
      case 'conditionalBlock': return `若${effect.when === 'noResources' ? '无雷楔且无附魔' : effect.when === 'noInfusion' ? '出牌时无附魔' : '仅1个存活敌人'}，额外获得${effect.amount}格挡`;
      case 'wedgeDamage': return `对目标造成${effect.absent}伤害；若有雷楔则改为${effect.present}伤害，不消费或刷新雷楔`;
      case 'resourceBlock': return `若有${effect.resource === 'wedge' ? '雷楔，消费雷楔' : '附魔，消费1次附魔'}，额外获得${effect.amount}格挡`;
      case 'block': return `获得${effect.amount}格挡`;
      case 'wedge': return `无雷楔：对目标造成${effect.setup}伤害，设置1枚雷楔；有雷楔：消费雷楔，对目标造成${effect.release}伤害，随后获得附魔${effect.attacks}次`;
      case 'detonate': return `若有雷楔，消费它并对${effect.target === 'one' ? '同一目标' : '所有存活敌人'}造成${effect.damage}伤害`;
      default: throw new Error('unknown effect');
    }
  }), ...(card.exhaust ? ['消耗：结算后移入耗尽区，本场不再洗回'] : []), ...(card.effects[upgraded ? 'upgraded' : 'base'].some(e => (e.op === 'draw' && e.wedgeAmount) || ['rearmWedge','wedgeDiscount'].includes(e.op) || (e.op==='power' && ['wedgeBlock','recastBlock','expiryBlock'].includes(e.id)) || e.op === 'delayedWedge' || e.op === 'extendWedge' || e.op === 'killDetonate' || (e.op === 'reduceAttack' && e.condition === 'wedge') || e.op === 'setWedgeIfAbsent' || e.op === 'wedge' || e.op === 'wedgeDamage' || e.op === 'detonate' || (e.op === 'resourceBlock' && e.resource === 'wedge')) ? [describeStatus('wedge')] : []), ...((card.type === 'attack' || card.effects[upgraded ? 'upgraded' : 'base'].some(e => e.op==='cashInfusion' || (e.op==='power' && ['firstInfused','endInfusion'].includes(e.id)) || e.resource === 'infusion' || e.op === 'grantInfusion')) ? [describeStatus('infusion')] : [])].join('；');
}
export function describeStatus(id) {
  if (id === 'wedge') return `雷楔：上限${statusRules.wedge.capacity}枚，${statusRules.wedge.expires}清除，${statusRules.wedge.stacking}`;
  if (id === 'infusion') return `附魔：每段伤害+${statusRules.infusion.bonusPerHit}，每张攻击牌结算后扣${statusRules.infusion.spendPerAttackCard}次，${statusRules.infusion.expires}清除，${statusRules.infusion.stacking}；结算后新获得不追溯`;
  throw new Error('unknown status');
}
export function initial(hand, enemies) {
  if (!Array.isArray(hand) || hand.length > 10 || new Set(hand.map(item => item.instance)).size !== hand.length) throw new Error('invalid hand');
  if (hand.some(item => typeof item.instance !== 'string' || !cardDefinitions[item.id] || typeof item.upgraded !== 'boolean')) throw new Error('invalid card');
  if (!Array.isArray(enemies) || enemies.length === 0 || enemies.some(enemy => !Number.isInteger(enemy.hp) || enemy.hp < 0 || !Number.isInteger(enemy.block) || enemy.block < 0)) throw new Error('invalid enemies');
  return { turn: 1, energy: 3, block: 0, wedgeUntil: null, infusion: 0, hand: structuredClone(hand), discard: [], exhaust: [], enemies: structuredClone(enemies) };
}
// Legacy synchronous API and paid continuation share one effect interpreter.
export function play(input, instance, target, options = {}) {
  if (!options.cancel) {
    const item=input.hand.find(c=>c.instance===instance);
    const effects=cards[item?.id]?.effects[item?.upgraded?'upgraded':'base']??[];
    if(effects.some(e=>e.op==='chooseDiscard'||e.op==='inspect') && typeof options.choose!=='function')throw new Error('choice resolver required');
  }
  const steps=playSteps(input,instance,target,options);
  let step=steps.next();
  while(!step.done)step=steps.next(options.choose(structuredClone(step.value.options)));
  return step.value;
}
export function* playSteps(input, instance, target, { cancel = false, drawCards, retain = [], move = null, purge = [] } = {}) {
  if (cancel) return structuredClone(input);
  const index = input.hand.findIndex(item => item.instance === instance);
  if (index < 0) throw new Error('card not in hand');
  const item = input.hand[index], card = cardDefinitions[item.id];
  if(card?.unplayable)throw new Error('unplayable system card');
  if (!card) throw new Error('unknown card');
  if (typeof item.upgraded !== 'boolean') throw new Error('invalid upgrade flag');
  const cost=Math.max(0,card.cost-(card.type==='attack'?(input.attackDiscount??0):0));
  if (input.energy < cost) throw new Error('insufficient energy');
  const effects = card.effects[item.upgraded ? 'upgraded' : 'base'];
  const single = effects.some(e => (e.op === 'reduceAttack' && e.target === 'one') || ['attackingBlock','idleExtra','stripBlock','unblockedExtra','infusedDamage'].includes(e.op) || (e.op === 'detonate' && e.target === 'one') || e.op === 'wedge' || e.op === 'wedgeDamage' || (e.op === 'damage' && e.target === 'one'));
  if (single && (!Number.isInteger(target) || !input.enemies[target] || input.enemies[target].hp <= 0)) throw new Error('invalid target');
  if (!input.enemies.some(e => e.hp > 0)) throw new Error('battle ended');
  if (effects.some(e => ['attackingBlock','idleExtra'].includes(e.op)) && (!Number.isSafeInteger(input.enemies[target].intent) || input.enemies[target].intent < 0)) throw new Error('invalid visible intent');
  if ((effects.some(e=>e.op==='draw'||e.op==='recycleBottom'||e.op==='moveCard'||e.op==='inspect'||e.op==='purgeStatus') || (card.exhaust && input.powers?.exhaustDraw && !input.exhaustPowerUsed)) && typeof drawCards !== 'function') throw new Error('hidden draw requires battle resolver; visible preview unsupported');
  const purging=effects.find(e=>e.op==='purgeStatus');
  if(!Array.isArray(purge)||new Set(purge).size!==purge.length||purge.length>(purging?.count??0)||purge.some(key=>!input.hand.some(c=>c.instance===key&&cardDefinitions[c.id].type==='status')))throw new Error('invalid status choice');
  const moving=effects.find(e=>e.op==='moveCard'||e.op==='inspect'||e.op==='purgeStatus');
  if (moving) {
    const chosen=input[moving.from]?.find(c=>c.instance===move && c.instance!==instance);
    if ((moving.required && move===null) || (move!==null && (!chosen || (moving.filter==='wedgeSkill' && chosen.id!=='KQ003') || (moving.filter==='attack' && cardDefinitions[chosen.id].type!=='attack') || (moving.filter==='nonSkill' && cardDefinitions[chosen.id].type==='skill')))) throw new Error('invalid move choice');
  } else if(move!==null)throw new Error('unexpected move choice');
  const retaining=effects.find(e=>e.op==='retain');
  if (!Array.isArray(retain) || new Set(retain).size!==retain.length || retain.length>(retaining?.count??0) || retain.some(key=>{const c=input.hand.find(x=>x.instance===key&&x.instance!==instance);return !c || (retaining.filter==='attack'&&cardDefinitions[c.id].type!=='attack') || (retaining.filter==='nonAttack'&&cardDefinitions[c.id].type==='attack');})) throw new Error('invalid retain choice');
  const state = structuredClone(input);
  state.energy -= cost;
  if(card.type==='attack')delete state.attackDiscount;
  const [resolved] = state.hand.splice(index, 1);
  delete resolved.retainOnce;
  const bonus = card.type === 'attack' && state.infusion > 0 ? statusRules.infusion.bonusPerHit : 0;
  let newInfusion = null;
  const touched = new Set();
  let firstPowerBonus=(card.type==='attack'?(input.defenseAttackBonus??0):0)+(card.type==='attack' && !input.attackPlayed && bonus ? (input.powers?.firstInfused??0):0);
  function damage(index, amount) {
    const enemy = state.enemies[index];
    if (enemy.hp <= 0 || state.hp===0) return;
    amount+=firstPowerBonus;firstPowerBonus=0;
    if (!touched.has(index)) { amount += input.enemies[index].nextHitBonus ?? 0; delete enemy.nextHitBonus; touched.add(index); }
    enemy.attackedThisTurn = true;
    if((state.weak??0)>0)amount=Math.floor(amount*0.75);
    const absorbed = Math.min(enemy.block, amount);
    enemy.block -= absorbed;
    enemy.hp = Math.max(0, enemy.hp - (amount - absorbed));
    if((enemy.thorns??0)>0){if(state.preventReflect)delete state.preventReflect;else {if(!Number.isSafeInteger(state.hp))throw new Error('reflection requires battle hp');state.hp=Math.max(0,state.hp-enemy.thorns);}}
  }
  function hit(amount, targets, hits = 1) {
    for (let n = 0; n < hits; n++) for (const index of targets) damage(index, amount + bonus);
  }
  const all = state.enemies.map((_, index) => index);
  for (const effect of effects) {
    switch (effect.op) {
      case 'chooseDiscard': {
        if(!state.hand.length)break;
        const key=yield {kind:'discard',state:structuredClone(state),inUse:structuredClone(resolved),options:structuredClone(state.hand)};
        const i=state.hand.findIndex(c=>c.instance===key);
        if(i<0)throw new Error('invalid revealed choice');
        const [chosen]=state.hand.splice(i,1);delete chosen.retainOnce;state.discard.push(chosen);break;
      }
      case 'inspect': {
        if(state.drawLocked||state.hand.length>=10||!state.draw.length)break;
        const options=state.draw.slice(0,effect.count);
        const key=yield {kind:'inspect',state:structuredClone(state),inUse:structuredClone(resolved),options:structuredClone(options)};
        const i=options.findIndex(c=>c.instance===key);
        if(i<0)throw new Error('invalid revealed choice');
        state.hand.push(state.draw.splice(i,1)[0]);break;
      }
      case 'purgeStatus': {
        for(const key of purge){const i=state.hand.findIndex(c=>c.instance===key);const [c]=state.hand.splice(i,1);delete c.retainOnce;state.exhaust.push(c);}
        if(purge.length&&input.powers?.exhaustDraw&&!state.exhaustPowerUsed){state.exhaustPowerUsed=true;drawCards(state,1);if(input.powers.exhaustDraw===2)state.block+=2;}break;
      }
      case 'preventVulnerable': state.preventVulnerable=true;break;
      case 'preventReflect': state.preventReflect=true;break;
      case 'clearWeak': state.weak=Math.max(0,(state.weak??0)-effect.amount);break;
      case 'cashInfusion': state.block+=state.infusion*effect.amount;state.infusion=0;break;
      case 'rearmWedge': state.rearmWedge=true;break;
      case 'wedgeDiscount': if(state.wedgeUntil!==null){state.wedgeUntil=null;state.attackDiscount=Math.max(state.attackDiscount??0,effect.amount);}break;
      case 'power': state.powers??={};state.powers[effect.id]=Math.max(state.powers[effect.id]??0,effect.amount);break;
      case 'delayedWedge': state.delayedWedge=true;break;
      case 'phaseReduction': state.phaseReduction=Math.max(state.phaseReduction??0,effect.amount);break;
      case 'moveCard': if(move!==null){const zone=state[effect.from];const [chosen]=zone.splice(zone.findIndex(c=>c.instance===move),1);delete chosen.retainOnce;if(effect.to==='top')state.draw.unshift(chosen);else state.draw.push(chosen);}break;
      case 'retain': for(const key of retain)state.hand.find(c=>c.instance===key).retainOnce=true;break;
      case 'drawDebt': state.drawDebt=(state.drawDebt??0)+effect.amount;break;
      case 'recycleBottom': if(state.discard.length)state.draw.push(state.discard.pop());break;
      case 'draw': {
        if(effect.firstOnly && (input.playedThisTurn??0)!==0)break;
        let count=effect.amount;
        if(effect.wedgeAmount && state.wedgeUntil!==null){state.wedgeUntil=null;count=effect.wedgeAmount;}
        const drawn=drawCards(state,count);
        if(effect.skillBlock && drawn.some(c=>cardDefinitions[c.id].type==='skill'))state.block+=effect.skillBlock;
        break;
      }
      case 'lockDraw': state.drawLocked=true;break;
      case 'extendWedge': if (state.wedgeUntil !== null) state.wedgeUntil = Math.min(state.wedgeUntil + 1, state.turn + effect.cap); break;
      case 'markNextHit': if (state.enemies[target].hp > 0) state.enemies[target].nextHitBonus = effect.amount; break;
      case 'previousAttack': if (input.enemies[target].attackedThisTurn === true) hit(effect.damage,[target]); break;
      case 'nextBlock': state.nextBlock = (state.nextBlock ?? 0) + effect.amount; break;
      case 'lastInfusionBlock': if (input.infusion === 1) state.block += effect.amount; break;
      case 'killDetonate': if (state.enemies[target].hp === 0 && state.wedgeUntil !== null) {state.wedgeUntil = null;hit(effect.damage, all.filter(i=>i!==target));} break;
      case 'reduceAttack': {
        const active = effect.condition === 'always' || (effect.condition === 'infusion' && input.infusion > 0) || (effect.condition === 'wedge' && state.wedgeUntil !== null);
        if (active) {
          if (effect.condition === 'wedge') state.wedgeUntil = null;
          for (const i of effect.target === 'all' ? all : [target]) if (state.enemies[i].hp > 0) state.enemies[i].attackReduction = Math.max(state.enemies[i].attackReduction ?? 0, effect.amount);
        }
        break;
      }
      case 'attackingBlock': if (input.enemies[target].intent > 0) state.block += effect.amount; break;
      case 'idleExtra': if (input.enemies[target].intent === 0) hit(effect.damage, [target]); break;
      case 'stripBlock': state.enemies[target].block = Math.max(0, state.enemies[target].block - effect.amount); break;
      case 'killBlock': state.block += effect.amount * Math.min(effect.cap, state.enemies.filter((e,i) => input.enemies[i].hp > 0 && e.hp === 0).length); break;
      case 'grantInfusion': newInfusion = effect.attacks; break;
      case 'unblockedExtra': if (input.enemies[target].block === 0) hit(effect.damage, [target]); break;
      case 'infusedDamage': if (bonus) hit(effect.damage, [target]); break;
      case 'damage': hit(effect.damage, effect.target === 'all' ? all : [target], effect.hits); break;
      case 'setWedgeIfAbsent':
        if (state.wedgeUntil === null) state.wedgeUntil = state.turn + statusRules.wedge.durationExtraTurns;
        break;
      case 'blockPerEnemy': state.block += effect.amount * Math.min(effect.cap, state.enemies.filter(e => e.hp > 0).length); break;
      case 'conditionalBlock':
        if ((effect.when === 'noResources' && state.wedgeUntil === null && state.infusion === 0) || (effect.when === 'noInfusion' && input.infusion === 0) || (effect.when === 'oneEnemy' && state.enemies.filter(e => e.hp > 0).length === 1)) state.block += effect.amount;
        break;
      case 'wedgeDamage': hit(state.wedgeUntil === null ? effect.absent : effect.present, [target]); break;
      case 'resourceBlock':
        if (effect.resource === 'wedge' && state.wedgeUntil !== null) { state.wedgeUntil = null; state.block += effect.amount; }
        if (effect.resource === 'infusion' && state.infusion > 0) { state.infusion--; state.block += effect.amount; }
        break;
      case 'block': state.block += effect.amount; break;
      case 'wedge':
        if (state.wedgeUntil !== null) {
          state.wedgeUntil = null;
          hit(effect.release, [target]);
          newInfusion = effect.attacks;
        } else {
          hit(effect.setup, [target]);
          state.wedgeUntil = state.turn + statusRules.wedge.durationExtraTurns;
        }
        break;
      case 'detonate':
        if (state.wedgeUntil !== null) { state.wedgeUntil = null; hit(effect.damage, effect.target === 'one' ? [target] : all); }
        break;
      default: throw new Error('unknown effect');
    }
  }
  if (bonus) state.infusion -= statusRules.infusion.spendPerAttackCard;
  if (newInfusion !== null) state.infusion = newInfusion;
  if(card.type==='attack')delete state.defenseAttackBonus;
  if(card.type==='skill' && effects.every(e=>e.op==='block') && input.powers?.defenseAttack && !input.defensePowerUsed){state.defensePowerUsed=true;state.defenseAttackBonus=input.powers.defenseAttack;}
  if(input.powers?.killDraw && !input.killPowerUsed && state.enemies.some((e,i)=>input.enemies[i].hp>0&&e.hp===0)) {state.killPowerUsed=true;state.nextDrawBonus=(state.nextDrawBonus??0)+1;if(input.powers.killDraw===2)state.nextBlock=(state.nextBlock??0)+2;}
  const consumedWedge=input.wedgeUntil!==null && state.wedgeUntil===null;
  if(consumedWedge && input.powers?.wedgeBlock && !input.wedgePowerUsed){state.block+=input.powers.wedgeBlock;state.wedgePowerUsed=true;}
  if(consumedWedge && effects.some(e=>e.op==='wedge') && input.powers?.recastBlock && (input.recastPowerUses??0)<3){state.block+=input.powers.recastBlock;state.recastPowerUses=(input.recastPowerUses??0)+1;}
  if(consumedWedge && input.rearmWedge){delete state.rearmWedge;state.wedgeUntil=state.turn+statusRules.wedge.durationExtraTurns;}
  if(card.type==='attack')state.attackPlayed=true;
  state.playedThisTurn=(input.playedThisTurn??0)+1;
  (card.exhaust || card.type==='power' ? state.exhaust : state.discard).push(resolved);
  if(card.exhaust && input.powers?.exhaustDraw && !input.exhaustPowerUsed){state.exhaustPowerUsed=true;drawCards(state,1);if(input.powers.exhaustDraw===2)state.block+=2;}
  return state;
}
export function endTurn(input) {
  const state = structuredClone(input);
  delete state.preventVulnerable;delete state.preventReflect;
  delete state.attackDiscount;delete state.rearmWedge;
  for (const e of state.enemies) { delete e.nextHitBonus; delete e.attackedThisTurn; }
  if(state.infusion>0 && state.powers?.endInfusion && (state.endInfusionUses??0)<3){state.endInfusionUses=(state.endInfusionUses??0)+1;state.nextBlock=(state.nextBlock??0)+state.powers.endInfusion;state.nextDrawBonus=(state.nextDrawBonus??0)+1;}
  state.infusion = 0;
  if (state.wedgeUntil !== null && state.wedgeUntil <= state.turn) {state.wedgeUntil = null;if(state.powers?.expiryBlock)state.nextBlock=(state.nextBlock??0)+state.powers.expiryBlock;}
  if(state.delayedWedge && state.wedgeUntil===null)state.wedgeUntil=state.turn+statusRules.wedge.durationExtraTurns;
  delete state.delayedWedge;
  state.discard.push(...state.hand.filter(c=>!c.retainOnce));
  state.hand = state.hand.filter(c=>c.retainOnce);
  for(const c of [...state.hand,...state.discard,...state.exhaust,...(state.draw??[])])delete c.retainOnce;
  return state;
}
export function nextTurn(input) {
  const state = { ...structuredClone(input), turn: input.turn + 1, energy: 3, block: input.nextBlock ?? 0 };
  delete state.nextBlock;
  delete state.drawLocked;
  delete state.playedThisTurn;
  delete state.attackPlayed;
  delete state.wedgePowerUsed;
  delete state.killPowerUsed;
  delete state.exhaustPowerUsed;
  delete state.defensePowerUsed;
  delete state.defenseAttackBonus;
  return state;
}

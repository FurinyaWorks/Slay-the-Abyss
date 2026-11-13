// Isolated candidate. Never imported by the production loader.
const attack = (damage, hits = 1, target = 'one') => ({ op: 'damage', damage, hits, target });
const versions = (base, upgraded) => ({ base, upgraded });
export const statusRules = Object.freeze({
  infusion: Object.freeze({ bonusPerHit: 2, spendPerAttackCard: 1, expires: '本回合结束', stacking: '刷新不叠加' }),
  wedge: Object.freeze({ capacity: 1, durationExtraTurns: 1, expires: '下一己方回合结束', stacking: '不叠加' }),
});
export const cards = Object.freeze({
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
  KQ052: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '低费无资源群伤，比KQ005低预算低段数', type: 'attack', cost: 1,
    effects: versions([attack(6, 1, 'all')], [attack(9, 1, 'all')]) },
  KQ053: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '高费单段可靠击杀，放弃多段附魔倍率', type: 'attack', cost: 2,
    effects: versions([attack(16)], [attack(20)]) },
  KQ054: { rarity: 'pending', channel: 'reward_candidate', candidateName: null, role: '低基础三段攻击，强化后才竞争兑现', type: 'attack', cost: 1,
    effects: versions([attack(2, 3)], [attack(3, 3)]) },
  KQ005: { rarity: 'pending', channel: 'reward_candidate', candidateName: '天街巡游', role: '无雷楔前置的群体多段', type: 'attack', cost: 2,
    effects: versions([attack(3, 2, 'all'), attack(5, 1, 'all')], [attack(4, 2, 'all'), attack(7, 1, 'all')]) },
});
export function describe(id, upgraded = false) {
  const card = cards[id];
  if (!card) throw new Error('unknown card');
  return [`待命名·${id}`, `${card.cost}能量`, ...card.effects[upgraded ? 'upgraded' : 'base'].map(effect => {
    switch (effect.op) {
      case 'damage': return `对${effect.target === 'all' ? '所有存活敌人' : '目标'}造成${effect.damage}伤害，共${effect.hits}段`;
      case 'wedgeDamage': return `对目标造成${effect.absent}伤害；若有雷楔则改为${effect.present}伤害，不消费或刷新雷楔`;
      case 'resourceBlock': return `若有${effect.resource === 'wedge' ? '雷楔，消费雷楔' : '附魔，消费1次附魔'}，额外获得${effect.amount}格挡`;
      case 'block': return `获得${effect.amount}格挡`;
      case 'wedge': return `无雷楔：对目标造成${effect.setup}伤害，设置1枚雷楔；有雷楔：消费雷楔，对目标造成${effect.release}伤害，随后获得附魔${effect.attacks}次`;
      case 'detonate': return `若有雷楔，消费它并对所有存活敌人造成${effect.damage}伤害`;
      default: throw new Error('unknown effect');
    }
  }), ...(card.effects[upgraded ? 'upgraded' : 'base'].some(e => e.op === 'wedge' || e.op === 'wedgeDamage' || e.op === 'detonate' || (e.op === 'resourceBlock' && e.resource === 'wedge')) ? [describeStatus('wedge')] : []), ...((card.type === 'attack' || card.effects[upgraded ? 'upgraded' : 'base'].some(e => e.resource === 'infusion')) ? [describeStatus('infusion')] : [])].join('；');
}
export function describeStatus(id) {
  if (id === 'wedge') return `雷楔：上限${statusRules.wedge.capacity}枚，${statusRules.wedge.expires}清除，${statusRules.wedge.stacking}`;
  if (id === 'infusion') return `附魔：每段伤害+${statusRules.infusion.bonusPerHit}，每张攻击牌结算后扣${statusRules.infusion.spendPerAttackCard}次，${statusRules.infusion.expires}清除，${statusRules.infusion.stacking}；结算后新获得不追溯`;
  throw new Error('unknown status');
}
export function initial(hand, enemies) {
  if (!Array.isArray(hand) || hand.length > 10 || new Set(hand.map(item => item.instance)).size !== hand.length) throw new Error('invalid hand');
  if (hand.some(item => typeof item.instance !== 'string' || !cards[item.id] || typeof item.upgraded !== 'boolean')) throw new Error('invalid card');
  if (!Array.isArray(enemies) || enemies.length === 0 || enemies.some(enemy => !Number.isInteger(enemy.hp) || enemy.hp < 0 || !Number.isInteger(enemy.block) || enemy.block < 0)) throw new Error('invalid enemies');
  return { turn: 1, energy: 3, block: 0, wedgeUntil: null, infusion: 0, hand: structuredClone(hand), discard: [], enemies: structuredClone(enemies) };
}
export function play(input, instance, target, { cancel = false } = {}) {
  if (cancel) return structuredClone(input);
  const index = input.hand.findIndex(item => item.instance === instance);
  if (index < 0) throw new Error('card not in hand');
  const item = input.hand[index], card = cards[item.id];
  if (!card) throw new Error('unknown card');
  if (typeof item.upgraded !== 'boolean') throw new Error('invalid upgrade flag');
  if (input.energy < card.cost) throw new Error('insufficient energy');
  const effects = card.effects[item.upgraded ? 'upgraded' : 'base'];
  const single = effects.some(e => e.op === 'wedge' || e.op === 'wedgeDamage' || (e.op === 'damage' && e.target === 'one'));
  if (single && (!Number.isInteger(target) || !input.enemies[target] || input.enemies[target].hp <= 0)) throw new Error('invalid target');
  if (!input.enemies.some(e => e.hp > 0)) throw new Error('battle ended');
  const state = structuredClone(input);
  state.energy -= card.cost;
  const [resolved] = state.hand.splice(index, 1);
  const bonus = card.type === 'attack' && state.infusion > 0 ? statusRules.infusion.bonusPerHit : 0;
  let newInfusion = null;
  function damage(index, amount) {
    const enemy = state.enemies[index];
    if (enemy.hp <= 0) return;
    const absorbed = Math.min(enemy.block, amount);
    enemy.block -= absorbed;
    enemy.hp = Math.max(0, enemy.hp - (amount - absorbed));
  }
  function hit(amount, targets, hits = 1) {
    for (let n = 0; n < hits; n++) for (const index of targets) damage(index, amount + bonus);
  }
  const all = state.enemies.map((_, index) => index);
  for (const effect of effects) {
    switch (effect.op) {
      case 'damage': hit(effect.damage, effect.target === 'all' ? all : [target], effect.hits); break;
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
        if (state.wedgeUntil !== null) { state.wedgeUntil = null; hit(effect.damage, all); }
        break;
      default: throw new Error('unknown effect');
    }
  }
  if (bonus) state.infusion -= statusRules.infusion.spendPerAttackCard;
  if (newInfusion !== null) state.infusion = newInfusion;
  state.discard.push(resolved);
  return state;
}
export function endTurn(input) {
  const state = structuredClone(input);
  state.infusion = 0;
  if (state.wedgeUntil !== null && state.wedgeUntil <= state.turn) state.wedgeUntil = null;
  state.discard.push(...state.hand);
  state.hand = [];
  return state;
}
export function nextTurn(input) {
  return { ...structuredClone(input), turn: input.turn + 1, energy: 3, block: 0 };
}

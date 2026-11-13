// Isolated candidate. Never imported by the production loader.
const attack = (damage, hits = 1, target = 'one') => ({ op: 'damage', damage, hits, target });
const versions = (base, upgraded) => ({ base, upgraded });
export const cards = Object.freeze({
  KQ001: { candidateName: '云来剑法', role: '无前置单体伤害', type: 'attack', cost: 1,
    effects: versions([attack(6)], [attack(9)]) },
  KQ002: { candidateName: null, role: '基础防守', type: 'skill', cost: 1,
    effects: versions([{ op: 'block', amount: 5 }], [{ op: 'block', amount: 8 }]) },
  KQ003: { candidateName: '星斗归位', role: '来源或换位兑现', type: 'attack', cost: 1,
    effects: versions([{ op: 'wedge', setup: 5, release: 8, attacks: 2 }], [{ op: 'wedge', setup: 7, release: 11, attacks: 2 }]) },
  KQ004: { candidateName: '重击（雷暴连斩分支）', role: '双段单体或雷楔群体兑现', type: 'attack', cost: 1,
    effects: versions([attack(4, 2), { op: 'detonate', damage: 4 }], [attack(5, 2), { op: 'detonate', damage: 6 }]) },
  KQ005: { candidateName: '天街巡游', role: '无雷楔前置的群体多段', type: 'attack', cost: 2,
    effects: versions([attack(3, 2, 'all'), attack(5, 1, 'all')], [attack(4, 2, 'all'), attack(7, 1, 'all')]) },
});
export function describe(id, upgraded = false) {
  const card = cards[id];
  if (!card) throw new Error('unknown card');
  return [`待命名·${id}`, `${card.cost}能量`, ...card.effects[upgraded ? 'upgraded' : 'base'].map(effect => {
    switch (effect.op) {
      case 'damage': return `对${effect.target === 'all' ? '所有存活敌人' : '目标'}造成${effect.damage}伤害，共${effect.hits}段`;
      case 'block': return `获得${effect.amount}格挡`;
      case 'wedge': return `无雷楔：对目标造成${effect.setup}伤害，设置1枚雷楔；有雷楔：消费雷楔，对目标造成${effect.release}伤害，随后获得附魔${effect.attacks}次`;
      case 'detonate': return `若有雷楔，消费它并对所有存活敌人造成${effect.damage}伤害`;
      default: throw new Error('unknown effect');
    }
  })].join('；');
}
export function initial(hand, enemies) {
  return { turn: 1, energy: 3, block: 0, wedgeUntil: null, infusion: 0, hand: structuredClone(hand), discard: [], enemies: structuredClone(enemies) };
}
export function play(input, instance, target, { cancel = false } = {}) {
  if (cancel) return structuredClone(input);
  const index = input.hand.findIndex(item => item.instance === instance);
  if (index < 0) throw new Error('card not in hand');
  const item = input.hand[index], card = cards[item.id];
  if (!card) throw new Error('unknown card');
  if (input.energy < card.cost) throw new Error('insufficient energy');
  const effects = card.effects[item.upgraded ? 'upgraded' : 'base'];
  const single = effects.some(e => e.op === 'wedge' || (e.op === 'damage' && e.target === 'one'));
  if (single && (!Number.isInteger(target) || !input.enemies[target] || input.enemies[target].hp <= 0)) throw new Error('invalid target');
  if (!input.enemies.some(e => e.hp > 0)) throw new Error('battle ended');
  const state = structuredClone(input);
  state.energy -= card.cost;
  state.hand.splice(index, 1);
  const bonus = card.type === 'attack' && state.infusion > 0 ? 2 : 0;
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
      case 'block': state.block += effect.amount; break;
      case 'wedge':
        if (state.wedgeUntil !== null) {
          state.wedgeUntil = null;
          hit(effect.release, [target]);
          newInfusion = effect.attacks;
        } else {
          hit(effect.setup, [target]);
          state.wedgeUntil = state.turn + 1;
        }
        break;
      case 'detonate':
        if (state.wedgeUntil !== null) { state.wedgeUntil = null; hit(effect.damage, all); }
        break;
      default: throw new Error('unknown effect');
    }
  }
  if (bonus) state.infusion--;
  if (newInfusion !== null) state.infusion = newInfusion;
  state.discard.push(item);
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

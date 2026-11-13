// Isolated candidate model. No production loader or frozen V4 dependency.
import { readFileSync } from 'node:fs';
export const catalogue = JSON.parse(readFileSync(new URL('./cards.json', import.meta.url)));
export const rules = catalogue.environment;
const variants = new Map(catalogue.cards.map(c => [c.id, c]));
const clone = value => structuredClone(value);
function natural(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`invalid ${label}`);
}
export function validateState(s) {
  if (!s || !['player','between','won','lost'].includes(s.phase)) throw new Error('invalid phase');
  for (const key of ['hp','block','energy','charge','turn']) natural(s[key], key, key === 'turn' ? 1 : 0);
  if (s.charge > rules.maxCharge) throw new Error('invalid charge');
  if (['player','between'].includes(s.phase) && s.hp === 0) throw new Error('invalid living player');
  if (!Array.isArray(s.enemies) || !s.enemies.length) throw new Error('invalid enemies');
  for (const e of s.enemies) {
    if (!e) throw new Error('invalid enemy');
    natural(e.hp,'enemy hp'); natural(e.block,'enemy block');
    const hits = Array.isArray(e.intent) ? e.intent : [e.intent];
    if (!hits.length) throw new Error('invalid intent');
    hits.forEach(n => natural(n,'intent'));
  }
  if (s.storm !== null) {
    if (!s.storm || typeof s.storm !== 'object') throw new Error('invalid storm');
    natural(s.storm.amount,'storm amount'); natural(s.storm.turns,'storm turns',1);
  }
  for (const zone of ['hand','draw','discard','exhausted']) {
    if (!Array.isArray(s[zone])) throw new Error(`invalid ${zone}`);
    for (const card of s[zone]) {
      if (!card || !variants.has(card.id)) throw new Error('unknown card');
      if (card.upgraded !== undefined && typeof card.upgraded !== 'boolean') throw new Error('invalid upgrade');
    }
  }
  if (s.hand.length > rules.handLimit) throw new Error('invalid hand size');
}

export function initial(enemies = [{ hp: 30, block: 0, intent: 8 }]) {
  const s = { phase: 'player', hp: rules.initialHp, block: 0, energy: rules.energyPerTurn, charge: 0, storm: null,
    enemies: clone(enemies), hand: [], draw: [], discard: [], exhausted: [], turn: 1 };
  validateState(s); return s;
}
function hit(enemy, damage) {
  if (enemy.hp <= 0) return;
  const blocked = Math.min(enemy.block, damage);
  enemy.block -= blocked;
  enemy.hp = Math.max(0, enemy.hp - damage + blocked);
}
function all(state, amount) { state.enemies.forEach(e => hit(e, amount)); }
function victory(state) {
  if (state.enemies.every(e => e.hp <= 0)) state.phase = 'won';
}
// Pure transaction: invalid input never mutates caller, pays nothing, draws nothing.
export function play(input, handIndex, target = null, cancel = false) {
  validateState(input);
  if (cancel) return clone(input);
  if (input.phase !== 'player') throw new Error('not player phase');
  if (!Number.isInteger(handIndex) || !input.hand[handIndex]) throw new Error('invalid hand');
  const instance = input.hand[handIndex];
  const card = variants.get(instance.id);
  if (!card) throw new Error('unknown card');
  if (instance.upgraded !== undefined && typeof instance.upgraded !== 'boolean') throw new Error('invalid upgrade');
  const spec = instance.upgraded === true ? card.upgrade : card.base;
  if (card.target === 'enemy' && (!Number.isInteger(target) || !input.enemies[target] || input.enemies[target].hp <= 0)) throw new Error('invalid target');
  if (input.energy < spec.cost) throw new Error('unpayable');
  const s = clone(input);
  s.energy -= spec.cost;
  s.hand.splice(handIndex, 1);
  for (const effect of spec.effects) {
    switch (effect.op) {
      case 'damage': hit(s.enemies[target], effect.amount); break;
      case 'block': s.block += effect.amount; break;
      case 'aoe': all(s, effect.amount); break;
      case 'charge': s.charge = Math.min(rules.maxCharge, s.charge + effect.amount); break;
      case 'storm':
        // Single field; refresh duration, keep strongest potency, never stack fields.
        s.storm = { amount: Math.max(s.storm?.amount ?? 0, effect.amount), turns: Math.max(s.storm?.turns ?? 0, effect.turns) };
        break;
      case 'charged_shot': {
        const charged = s.charge === rules.maxCharge;
        if (charged) s.charge = 0;
        hit(s.enemies[target], effect.direct);
        // Bloom is a separate all-living-enemies hit, even if primary died.
        if (charged) all(s, effect.bloom);
        break;
      }
      default: throw new Error('unknown effect');
    }
  }
  s.discard.push(instance);
  victory(s);
  return s;
}
export function endTurn(input) {
  validateState(input);
  if (input.phase !== 'player') throw new Error('not player phase');
  const s = clone(input);
  s.charge = Math.min(rules.maxCharge, s.charge + s.energy); s.energy = 0;
  s.discard.push(...s.hand); s.hand = [];
  if (s.storm) {
    all(s, s.storm.amount);
    s.storm.turns -= 1;
    if (s.storm.turns === 0) s.storm = null;
  }
  victory(s);
  if (s.phase === 'won') return s;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    for (const damage of Array.isArray(e.intent) ? e.intent : [e.intent]) {
      const blocked = Math.min(s.block, damage);
      s.block -= blocked; s.hp = Math.max(0, s.hp - damage + blocked);
      if (s.hp === 0) { s.phase = 'lost'; return s; }
    }
  }
  s.phase = 'between'; return s;
}
// Explicit supplied draw order: no hidden shuffle or claimed natural-run simulation.
export function startTurn(input) {
  validateState(input);
  if (input.phase !== 'between') throw new Error('not between turns');
  const s = clone(input); s.block = 0; s.energy = rules.energyPerTurn; s.turn += 1; s.phase = 'player';
  s.hand.push(...s.draw.splice(0, Math.max(0, Math.min(rules.drawPerTurn, rules.handLimit - s.hand.length))));
  return s;
}
export function cardText(id, upgraded = false) {
  const card = variants.get(id); if (!card) throw new Error('unknown card');
  const v = upgraded ? card.upgrade : card.base;
  const effects = v.effects.map(e => ({damage:`对目标造成${e.amount}点伤害。`,block:`获得${e.amount}点格挡。`,aoe:`对所有存活敌人造成${e.amount}点伤害。`,charge:`获得${e.amount}层蓄力（上限${rules.maxCharge}）。`,storm:`建立冰雨：从本回合起连续${e.turns}个回合结束时，对所有存活敌人造成${e.amount}点伤害；重复施放取较高伤害与剩余次数，不叠加。`,charged_shot:`对目标造成${e.direct}点伤害。若结算前蓄力为${rules.maxCharge}，消耗全部蓄力，随后对所有存活敌人造成${e.bloom}点伤害。`})[e.op]);
  return `${card.name}${upgraded ? '+' : ''}｜${v.cost}能量｜${effects.join('')}`;
}

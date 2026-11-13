// Isolated candidate model. No production loader or frozen V4 dependency.
import { drawCards, validateDrawSeed } from './deck.mjs';
import { readFileSync } from 'node:fs';
export const catalogue = JSON.parse(readFileSync(new URL('./cards.json', import.meta.url)));
export const rules = catalogue.environment;
export const starterRelic = JSON.parse(readFileSync(new URL('./relic.json', import.meta.url)));
export const searchableEffects = {storm:'建立冰雨',block:'直接获得格挡',charge:'主动获得蓄力'};
const variants = new Map(catalogue.cards.map(c => [c.id, c]));
const clone = value => structuredClone(value);
function natural(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`invalid ${label}`);
}
export function validateState(s) {
  if (!s || !['player','between','won','lost'].includes(s.phase)) throw new Error('invalid phase');
  validateDrawSeed(s.drawSeed);
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
  if (['player','between'].includes(s.phase) && !s.enemies.some(e=>e.hp>0)) throw new Error('invalid living enemies');
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
  if (!Array.isArray(s.relics) || s.relics.some(id => id !== starterRelic.id) || new Set(s.relics).size !== s.relics.length) throw new Error('invalid relics');
  if (s.hand.length > rules.handLimit) throw new Error('invalid hand size');
}

export function initial(enemies = [{ hp: 30, block: 0, intent: 8 }]) {
  const s = { phase: 'player', hp: rules.initialHp, block: 0, energy: rules.energyPerTurn, charge: 0, storm: null,
    enemies: clone(enemies), hand: [], draw: [], discard: [], exhausted: [], drawSeed: 37, relics: [starterRelic.id], turn: 1 };
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
  const [resolved] = s.hand.splice(handIndex, 1);
  for (const effect of spec.effects) {
    switch (effect.op) {
      case 'seek_effect': {
        const index=s.draw.findIndex(instance=>variants.get(instance.id)[instance.upgraded===true?'upgrade':'base'].effects.some(e=>e.op===effect.effect_op));
        if(index>=0 && s.hand.length<rules.handLimit)s.hand.push(s.draw.splice(index,1)[0]);
        break;
      }
      case 'seek_card': {
        const pile = s[effect.zone ?? 'draw'];
        const index = pile.findIndex(card=>card.id===effect.card_id);
        if (index>=0 && s.hand.length<rules.handLimit) s.hand.push(pile.splice(index,1)[0]);
        break;
      }
      case 'draw': drawCards(s, effect.amount, rules.handLimit); break;
      case 'damage': hit(s.enemies[target], effect.amount); break;
      case 'block': s.block += effect.amount; break;
      case 'aoe': all(s, effect.amount); break;
      case 'charge': s.charge = Math.min(rules.maxCharge, s.charge + effect.amount); break;
      case 'storm':
        // Single field; refresh duration, keep strongest potency, never stack fields.
        s.storm = { amount: Math.max(s.storm?.amount ?? 0, effect.amount), turns: Math.max(s.storm?.turns ?? 0, effect.turns) };
        break;
      case 'full_charge_damage': hit(s.enemies[target], effect.amount + (s.charge === rules.maxCharge ? effect.bonus : 0)); break;
      case 'full_charge_block': s.block += effect.amount + (s.charge === rules.maxCharge ? effect.bonus : 0); break;
      case 'spend_one_damage':
      case 'spend_one_block':
      case 'spend_one_draw': {
        const available = s.charge >= 1;
        if (available) s.charge -= 1;
        const amount = effect.amount + (available ? effect.bonus : 0);
        if (effect.op === 'spend_one_damage') hit(s.enemies[target], amount);
        else if (effect.op === 'spend_one_block') s.block += amount;
        else drawCards(s, amount, rules.handLimit);
        break;
      }
      case 'charged_aoe': {
        const charged = s.charge === rules.maxCharge;
        if (charged) s.charge = 0;
        all(s, effect.amount + (charged ? effect.bonus : 0));
        break;
      }
      case 'storm_focus': {
        const damage = effect.amount + (s.storm ? s.storm.amount * s.storm.turns : 0);
        natural(damage, 'focused storm damage');
        s.storm = null;
        hit(s.enemies[target], damage);
        break;
      }
      case 'storm_block': s.block += effect.amount + (s.storm ? effect.bonus : 0); break;
      case 'storm_draw': drawCards(s, effect.amount + (s.storm ? effect.bonus : 0), rules.handLimit); break;
      case 'storm_release': {
        if (s.storm) {
          all(s, s.storm.amount);
          s.storm.turns -= 1;
          if (s.storm.turns === 0) s.storm = null;
        }
        break;
      }
      case 'charged_draw': {
        const charged = s.charge === rules.maxCharge;
        if (charged) s.charge = 0;
        drawCards(s, effect.amount + (charged ? effect.bonus : 0), rules.handLimit);
        break;
      }
      case 'charged_block': {
        const charged = s.charge === rules.maxCharge;
        if (charged) s.charge = 0;
        s.block += effect.amount + (charged ? effect.bonus : 0);
        break;
      }
      case 'charged_direct': {
        const charged = s.charge === rules.maxCharge;
        if (charged) s.charge = 0;
        hit(s.enemies[target], effect.direct + (charged ? effect.bonus : 0));
        break;
      }
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
  (card.exhaust === true ? s.exhausted : s.discard).push(resolved);
  victory(s);
  // Commit only a valid aggregate result; cloned transaction rejects overflow atomically.
  validateState(s);
  return s;
}
export function endTurn(input) {
  validateState(input);
  if (input.phase !== 'player') throw new Error('not player phase');
  const s = clone(input);
  if (s.relics.includes(starterRelic.id)) {
    s.charge = Math.min(rules.maxCharge, s.charge + Math.floor(s.energy / starterRelic.effect.energy_per_charge));
  }
  s.energy = 0;
  s.discard.push(...s.hand.filter(c => variants.get(c.id).retain !== true));
  s.hand = s.hand.filter(c => variants.get(c.id).retain === true);
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
  if (typeof upgraded !== 'boolean') throw new Error('invalid upgrade');
  const card = variants.get(id); if (!card) throw new Error('unknown card');
  const v = upgraded ? card.upgrade : card.base;
  const effects = v.effects.map(e => ({seek_effect:`从抽牌堆将第一张具有${searchableEffects[e.effect_op]}效果的牌加入手牌。只检索抽牌堆；没有目标时无效果，不退款。`,seek_card:`从${e.zone === 'discard' ? '弃牌堆' : '抽牌堆'}将1张${variants.get(e.card_id)?.name ?? e.card_id}加入手牌。只检索指定牌堆；没有目标时无效果，不退款。`,draw:`抽${e.amount}张牌（手牌上限${rules.handLimit}）。`,full_charge_damage:`对目标造成${e.amount}点伤害；若结算时蓄力为${rules.maxCharge}，增加${e.bonus}点伤害，不消耗蓄力。`,full_charge_block:`获得${e.amount}点格挡；若结算时蓄力为${rules.maxCharge}，额外获得${e.bonus}点格挡，不消耗蓄力。`,spend_one_damage:`对目标造成${e.amount}点伤害；若有至少1层蓄力，消耗1层，本次伤害增加${e.bonus}。`,spend_one_block:`获得${e.amount}点格挡；若有至少1层蓄力，消耗1层，额外获得${e.bonus}点格挡。`,spend_one_draw:`抽${e.amount}张牌；若有至少1层蓄力，消耗1层，额外抽${e.bonus}张（手牌上限${rules.handLimit}）。`,charged_aoe:`对所有存活敌人造成${e.amount}点伤害；若结算前蓄力为${rules.maxCharge}，消耗全部蓄力，本次伤害增加${e.bonus}。`,storm_focus:`对目标造成${e.amount}点伤害；若有冰雨，将其每次伤害乘剩余次数加入本次单体伤害，并移除冰雨。`,storm_block:`获得${e.amount}点格挡；若结算时有冰雨，额外获得${e.bonus}点格挡（不消耗冰雨）。`,storm_draw:`抽${e.amount}张牌；若结算时有冰雨，额外抽${e.bonus}张（手牌上限${rules.handLimit}，不消耗冰雨）。`,storm_release:`若有冰雨，立即对所有存活敌人造成一次当前冰雨伤害，并消耗一次剩余触发；无冰雨时无效果，不退款。`,charged_draw:`抽${e.amount}张牌（手牌上限${rules.handLimit}）。若结算前蓄力为${rules.maxCharge}，消耗全部蓄力，额外抽${e.bonus}张。`,charged_block:`获得${e.amount}点格挡。若结算前蓄力为${rules.maxCharge}，消耗全部蓄力，额外获得${e.bonus}点格挡。`,charged_direct:`对目标造成${e.direct}点伤害。若结算前蓄力为${rules.maxCharge}，消耗全部蓄力，本次伤害增加${e.bonus}（合为单次命中，不绽放）。`,damage:`对目标造成${e.amount}点伤害。`,block:`获得${e.amount}点格挡。`,aoe:`对所有存活敌人造成${e.amount}点伤害。`,charge:`获得${e.amount}层蓄力（上限${rules.maxCharge}）。`,storm:`建立冰雨：从本回合起连续${e.turns}个回合结束时，对所有存活敌人造成${e.amount}点伤害；重复施放取较高伤害与剩余次数，不叠加。`,charged_shot:`对目标造成${e.direct}点伤害。若结算前蓄力为${rules.maxCharge}，消耗全部蓄力，随后对所有存活敌人造成${e.bloom}点伤害。`})[e.op]);
  return `${card.name}${upgraded ? '+' : ''}｜${v.cost}能量｜${effects.join('')}${card.exhaust === true ? '消耗：本场战斗不再进入抽牌循环。' : ''}${card.retain === true ? '保留：回合结束不弃置，仍占手牌上限。' : ''}`;
}

export function relicText() {
  return `${starterRelic.name}：回合结束时，每${starterRelic.effect.energy_per_charge}点未用能量转为1层蓄力（上限${rules.maxCharge}，溢出丢弃）。不额外产生能量。`;
}

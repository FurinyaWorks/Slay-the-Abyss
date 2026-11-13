// Isolated mechanism laboratory, not the production combat engine.
import catalog from './cards.json' with { type: 'json' };
import { drawCards } from './deck.mjs';
export { catalog };
const byId = new Map(catalog.cards.map(card => [card.id, card]));
export function state({ hp = catalog.maxHp, energy = catalog.energyPerTurn, enemies = [{ hp: 30, block: 0 }], hand = [], draw = [], startingRelic = false } = {}) {
  return { hp, energy, enemies: structuredClone(enemies), hand: [...hand], draw: [...draw], discard: [], exhaust: [], block: 0, mask: 0, maskGuard: 0, powers: [], turn: 1, phase: 'player', deckMode: 'fixed', startingRelic, relicUsed: false };
}
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
export function validState(s) {
  if (!s || typeof s !== 'object') return false;
  if (![s.hp, s.energy, s.block, s.mask, s.maskGuard].every(nonnegative)) return false;
  if (!['fixed', 'shuffle'].includes(s.deckMode)) return false;
  if (s.deckMode === 'shuffle' && (!Number.isInteger(s.rng) || s.rng < 0 || s.rng > 0xffffffff)) return false;
  if (s.hp > catalog.maxHp || s.mask > catalog.maskRules.maxDuration) return false;
  if (!Number.isSafeInteger(s.turn) || s.turn < 1 || !['player','enemy'].includes(s.phase)) return false;
  if (typeof s.startingRelic !== 'boolean' || typeof s.relicUsed !== 'boolean') return false;
  if (!['hand','draw','discard','exhaust','powers'].every(key => Array.isArray(s[key]) && s[key].every(id => typeof id === 'string'))) return false;
  if (s.hand.length > 10 || !Array.isArray(s.enemies) || !s.enemies.length) return false;
  return s.enemies.every(e => e && nonnegative(e.hp) && nonnegative(e.block));
}
function damage(enemy, amount) {
  if (enemy.hp <= 0) return;
  const absorbed = Math.min(enemy.block, amount);
  enemy.block -= absorbed;
  enemy.hp = Math.max(0, enemy.hp - amount + absorbed);
}
function apply(s, effect, target) {
  const { op, value } = effect;
  if (op === 'loseHp') s.hp -= value;
  else if (op === 'mask') {
    const entered = s.mask === 0 && value > 0;
    s.mask = value === 0 ? 0 : Math.min(catalog.maskRules.maxDuration, Math.max(s.mask, value));
    if (entered && s.startingRelic && !s.relicUsed) {
      s.relicUsed = true;
      for (const bonus of catalog.startingRelic.effects) apply(s, bonus, target);
    }
  }
  else if (op === 'energy') s.energy += value;
  else if (op === 'breakBlock') s.enemies[target].block = 0;
  else if (op === 'recoverExit') {
    for(let n=0;n<value && s.hand.length<10;n++){
      const i=s.discard.findIndex(id=>byId.get(id)?.base.some(e=>e.op==='mask'&&e.value===0));
      if(i<0)break;
      s.hand.push(s.discard.splice(i,1)[0]);
    }
  }
  else if (op === 'maskGuard') s.maskGuard += value;
  else if (op === 'maskBlock') s.block += s.mask > 0 ? value : value / 2;
  else if (op === 'block') s.block += value;
  else if (op === 'draw') {
    drawCards(s, value);
  } else if (op === 'damage' || op === 'plunge' || op === 'damageAll') {
    const targets = (op === 'damageAll' || op === 'plunge' && s.mask > 0) ? s.enemies : [s.enemies[target]];
    for (const enemy of targets) damage(enemy, value + (s.mask > 0 ? catalog.maskRules.attackBonus : 0));
  } else throw new Error(`Unknown effect: ${op}`);
}
export function play(input, { index, target = 0, upgraded = false, cancel = false }) {
  // A caller always receives a fresh result; rejection cannot spend cards/resources.
  const reject = reason => ({ ok: false, reason, state: structuredClone(input) });
  if (!validState(input)) return reject('state');
  if (cancel) return reject('cancelled');
  if (input.phase !== 'player') return reject('phase');
  if (!Number.isInteger(index) || index < 0 || index >= input.hand.length) return reject('card');
  if (typeof upgraded !== 'boolean') return reject('upgrade');
  const card = byId.get(input.hand[index]);
  if (!card) return reject('unknown-card');
  if (input.hp <= 0 || !input.enemies.some(e => e.hp > 0)) return reject('combat-ended');
  if (input.energy < card.cost) return reject('energy');
  const effects = upgraded ? card.upgrade : card.base;
  const lifeCost = effects.filter(e => e.op === 'loseHp').reduce((n, e) => n + e.value, 0);
  if (input.hp <= lifeCost) return reject('life');
  const needsTarget = effects.some(e => e.op === 'breakBlock' || e.op === 'damage' || e.op === 'plunge' && input.mask === 0);
  if (needsTarget && (!Number.isInteger(target) || !input.enemies[target] || input.enemies[target].hp <= 0)) return reject('target');
  const s = structuredClone(input);
  s.energy -= card.cost;
  s.hand.splice(index, 1); // resolving card no longer occupies the hand
  try { for (const effect of effects) apply(s, effect, target); }
  catch { return reject('effect'); }
  (card.kind === 'power' ? s.powers : card.exhaust ? s.exhaust : s.discard).push(card.id);
  if (!validState(s)) return reject('effect');
  return { ok: true, state: s };
}
export function endTurn(input) {
  const s = structuredClone(input);
  if (!validState(input)) return s;
  if (s.phase !== 'player' || s.hp <= 0 || !s.enemies.some(e => e.hp > 0)) return s;
  s.phase = 'enemy';
  // Before enemy action; block does not prevent HP loss. This adaptation can kill.
  if (s.mask > 0) { s.hp = Math.max(0, s.hp - catalog.maskRules.endTurnHpLoss); if(s.hp > 0) s.block += s.maskGuard; s.mask--; }
  s.discard.push(...s.hand);
  s.hand = [];
  return validState(s) ? s : structuredClone(input);
}
export function startTurn(input) {
  const s = structuredClone(input);
  if (!validState(input)) return s;
  if (s.phase !== 'enemy' || s.hp <= 0 || !s.enemies.some(e => e.hp > 0)) return s;
  s.phase = 'player';
  s.turn++; s.block = 0; s.energy = catalog.energyPerTurn;
  apply(s, { op: 'draw', value: catalog.drawPerTurn });
  return s;
}
export function cardText(card, upgraded = false) {
  const text = ({op, value}) => ({
    energy: `获得${value}点能量（仅本回合）。`,
    breakBlock: '移除目标所有格挡。',
    recoverExit: `从弃牌堆按顺序取回至多${value}张含退出面具效果的牌；手牌上限10，没有则不取。`,
    damageAll: `对所有敌人造成${value}点伤害（面具期间+${catalog.maskRules.attackBonus}）。`,
    maskBlock: `获得${value / 2}点格挡；面具期间改为${value}点。`,
    maskGuard: `本场战斗每个面具回合末，先支付生命；若存活，获得${value}点格挡。可叠加。`,
    damage: `造成${value}点伤害（面具期间+${catalog.maskRules.attackBonus}）。`,
    block: `获得${value}点格挡。`,
    loseHp: `失去${value}点生命（须保留至少1点）。`,
    mask: value ? `进入面具状态${value}回合（取更长，不相加）；攻击+${catalog.maskRules.attackBonus}；每回合结束先失去${catalog.maskRules.endTurnHpLoss}生命再减少1回合，可致死。` : '退出面具状态。',
    plunge: `造成${value}点伤害；面具期间改为对所有敌人造成${value + catalog.maskRules.attackBonus}点伤害。`,
    draw: `抽${value}张牌（手牌上限10）。`,
  })[op];
  return `${card.cost}费。` + (upgraded ? card.upgrade : card.base).map(text).join('') + (card.kind === 'power' ? '能力：离开牌堆，本场生效。' : card.exhaust ? '消耗。' : '');
}

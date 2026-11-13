/** Isolated Zhongli G2/G4 candidate. Not a production loader. */
export const VERSION = 'zhongli-mechanics-0.6.0';
const card = (id, role, rarity, cost, base, upgraded, target = 'self') => ({
  id, name: `待命名·${id}`, role, rarity, cost, target, base, upgraded,
  approval: 'HOLD', sourceVerified: false,
});
export const cards = [
  card('zl01', '基础单体攻击', 'basic', 1, [['damage', 6]], [['damage', 9]], 'enemy'),
  card('zl02', '基础当回合防御', 'basic', 1, [['block', 5]], [['block', 8]]),
  card('zl03', '投入两能量建立跨回合防线', 'common', 2, [['jade', 12]], [['jade', 16]]),
  card('zl04', '牺牲跨回合防线换取即时击杀', 'common', 1, [['spendJade', 6], ['damage', 14]], [['spendJade', 6], ['damage', 18]], 'enemy'),
  card('zl05', '不依赖护盾资源的高费终结', 'rare', 3, [['damage', 24]], [['damage', 32]], 'enemy'),
  card('zl06', '小额当前防守并为下回合留下余量', 'common', 1, [['block', 4], ['jade', 3]], [['block', 6], ['jade', 4]]),
  card('zl07', '高压回合仍推进击杀的攻守兼顾', 'common', 1, [['damage', 5], ['block', 5]], [['damage', 7], ['block', 7]], 'enemy'),
  card('zl08', '低压回合输出并蓄小额跨回合防线', 'common', 1, [['damage', 4], ['jade', 3]], [['damage', 6], ['jade', 4]], 'enemy'),
  card('zl09', '压制普通攻击以保存跨回合防线', 'common', 1, [['damage', 5], ['weak', 1]], [['damage', 7], ['weak', 2]], 'enemy'),
  {...card('zl10', '一次性应对大伤而非建立永久防线', 'uncommon', 2, [['block', 20]], [['block', 26]]), exhaust: true},
  card('zl11', '保住防线后获得攻击回报而非消耗防线', 'common', 1, [['damage', 5], ['guardedDamage', 6]], [['damage', 7], ['guardedDamage', 8]], 'enemy'),
  card('zl12', '付费寻找防线或收益牌而非凭空增加能量', 'common', 1, [['block', 3], ['draw', 1]], [['block', 4], ['draw', 2]]),
];
export const JADE_CAP = 20;
export const GUARD_THRESHOLD = 6;
export const WEAK_PERCENT = 75;
export function incomingAttack(hit, weak = 0) { return weak > 0 ? Math.floor(hit / 100) * WEAK_PERCENT + Math.floor((hit % 100) * WEAK_PERCENT / 100) : hit; }
export function textFor(id, upgraded = false) {
  const c = cards.find(c => c.id === id);
  if (!c) throw new Error('unknown card');
  const terms = { draw: n => `抽${n}张牌（手牌上限10，结算中的本牌不参与洗牌）`, guardedDamage: n => `若当前玉璋至少${GUARD_THRESHOLD}，额外造成${n}点伤害（不消耗玉璋）`, weak: n => `施加${n}回合虚弱（普通攻击伤害为${WEAK_PERCENT}%，逐段向下取整；持续回合相加，轮末减1）`, damage: n => `造成${n}点伤害`, block: n => `获得${n}点格挡`, jade: n => `获得${n}点玉璋（上限${JADE_CAP}）`, spendJade: n => `消耗${n}点玉璋` };
  return `${c.cost}能量；${(upgraded ? c.upgraded : c.base).map(([op, n]) => terms[op](n)).join('；')}${c.exhaust ? '；消耗（本战不再抽到）' : ''}。`;
}
export function initialState(hand = ['a','b','c','d','e','f']) {
  return { hp: 60, energy: 3, block: 0, jade: 0, enemy: { hp: 40, block: 0, weak: 0 }, hand: [...hand], discard: [], exhaust: [], pendingDraw: 0, inUse: null, instances: Object.fromEntries(hand.map((key, i) => [key, {id: cards[i % cards.length].id, upgraded: false}])), turn: 1 };
}
function validate(s) {
  for (const n of [s.hp, s.energy, s.block, s.jade, s.enemy.hp, s.enemy.block, s.enemy.weak ?? 0, s.pendingDraw ?? 0, s.turn])
    if (!Number.isSafeInteger(n) || n < 0) throw new Error('invalid state');
  if ((s.pendingDraw ?? 0)>10 || Boolean(s.inUse)!==Boolean(s.pendingDraw))throw new Error('invalid pending draw');
  if (s.jade > JADE_CAP || !Array.isArray(s.hand) || !Array.isArray(s.discard) || !Array.isArray(s.exhaust ?? []) || new Set([...s.hand, ...s.discard, ...(s.exhaust ?? []), ...(s.inUse ? [s.inUse] : [])]).size !== s.hand.length + s.discard.length + (s.exhaust ?? []).length + (s.inUse ? 1 : 0))
    throw new Error('invalid state');
}
/** Pure transaction: caller retains identical state for cancel/error; no pre-granted resources. */
export function play(state, { id, instance, upgraded = false, target, cancel = false }) {
  validate(state);
  if (cancel) return { ok: false, reason: 'cancelled', state };
  if(state.pendingDraw)return {ok:false,reason:'unresolved draw',state};
  const c = cards.find(c => c.id === id);
  if (!c || !state.hand.includes(instance) || state.instances?.[instance]?.id !== id) return { ok: false, reason: 'missing card', state };
  if (!state.hp || !state.enemy.hp) return { ok: false, reason: 'battle ended', state };
  if (c.target === 'enemy' && target !== 'enemy') return { ok: false, reason: 'invalid target', state };
  if (typeof upgraded !== 'boolean' || upgraded !== state.instances[instance].upgraded) return { ok: false, reason: 'invalid upgrade', state };
  const effects = upgraded ? c.upgraded : c.base;
  if (effects.some(([op,n]) => !['block','jade','spendJade','damage','weak','guardedDamage','draw'].includes(op) || !Number.isSafeInteger(n) || n < 0)) return { ok: false, reason: 'invalid effect', state };
  if(effects.some(([op],i)=>op==='draw'&&i!==effects.length-1))return {ok:false,reason:'invalid effect',state};
  const draws=effects.filter(([op])=>op==='draw').reduce((n,[,v])=>n+v,0);
  if(draws>10)return {ok:false,reason:'invalid effect',state};
  const weakAdded = effects.filter(([op])=>op==='weak').reduce((n,[,v])=>n+v,0);
  if(!Number.isSafeInteger((state.enemy.weak ?? 0)+weakAdded))return {ok:false,reason:'invalid effect',state};
  const required = effects.filter(([op]) => op === 'spendJade').reduce((n, [,v]) => n + v, 0);
  if (state.energy < c.cost || state.jade < required) return { ok: false, reason: 'cannot pay', state };
  const next = structuredClone(state);
  next.energy -= c.cost;
  next.hand.splice(next.hand.indexOf(instance), 1);
  for (const [op, n] of effects) {
    if (op === 'draw')next.pendingDraw=(next.pendingDraw ?? 0)+n;
    if (op === 'weak' && next.enemy.hp > 0) next.enemy.weak = (next.enemy.weak ?? 0) + n;
    if (op === 'block') next.block += n;
    if (op === 'jade') next.jade = Math.min(JADE_CAP, next.jade + n);
    if (op === 'spendJade') next.jade -= n;
    if (op === 'damage' || op === 'guardedDamage' && next.jade >= GUARD_THRESHOLD) {
      const absorbed = Math.min(next.enemy.block, n);
      next.enemy.block -= absorbed;
      next.enemy.hp = Math.max(0, next.enemy.hp - n + absorbed);
    }
  }
  if(next.pendingDraw){next.inUse=instance;}else if(c.exhaust){next.exhaust ??= [];next.exhaust.push(instance);}else next.discard.push(instance);
  validate(next);
  return { ok: true, state: next };
}
/** Incoming hits resolve block -> jade -> HP. Block expires AFTER enemy action, jade persists. */
export function endTurn(state, hits) {
  validate(state);
  if(state.pendingDraw)throw new Error('unresolved draw');
  if (!Array.isArray(hits) || hits.some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('invalid hits');
  if (!state.hp || !state.enemy.hp) return structuredClone(state);
  const next = structuredClone(state);
  for (const hit of hits) {
    if (!next.hp) break;
    let remaining = incomingAttack(hit,next.enemy.weak ?? 0);
    for (const pool of ['block','jade','hp']) {
      const n = Math.min(next[pool], remaining);
      next[pool] -= n;
      remaining -= n;
    }
  }
  next.enemy.weak = Math.max(0,(next.enemy.weak ?? 0)-1);
  next.discard.push(...next.hand);
  next.hand = [];
  next.block = 0;
  if (next.hp) { next.energy = 3; next.turn += 1; }
  return next;
}

// Deterministic battle adapter: synthetic encounters, not production enemy AI.
import { catalog, state, play, endTurn, startTurn, validState } from './model.mjs';
export const encounters = Object.freeze({
  duel: { label: '单体连续攻击（实验）', enemies: [{ hp: 48, block: 0, intent: [8, 10, 12] }] },
  swarm: { label: '双目标（实验）', enemies: [{ hp: 25, block: 0, intent: [5, 7] }, { hp: 25, block: 0, intent: [7, 5] }] },
  armor: { label: '护甲与爆发（实验）', enemies: [{ hp: 60, block: 12, intent: [4, 16, 6] }] },
});
export function validBattleState(s) {
  return validState(s) && Number.isInteger(s.rng) && s.rng >= 0 && s.rng <= 0xffffffff
    && s.enemies.every(e => Array.isArray(e.intent) && e.intent.length > 0
      && e.intent.every(n => Number.isSafeInteger(n) && n >= 0));
}
function random(s) {
  let t = s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function shuffle(s, cards) {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1)); [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function draw(s, count) {
  for (let i = 0; i < count && s.hand.length < 10; i++) {
    if (!s.draw.length) { s.draw = shuffle(s, s.discard); s.discard = []; }
    if (!s.draw.length) break;
    s.hand.push(s.draw.shift());
  }
}
export function newBattle({ seed = 1, encounter = 'duel', relic = true, hp = catalog.maxHp, deck = catalog.starter } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !encounters[encounter] || typeof relic !== 'boolean') throw Error('invalid battle setup');
  if (!Number.isInteger(hp) || hp < 1 || hp > catalog.maxHp || !Array.isArray(deck) || !deck.length || deck.length > 100 || deck.some(id => !catalog.cards.some(c => c.id === id) || id === 'x08')) throw Error('invalid deck or life');
  const s = state({ hp, enemies: encounters[encounter].enemies, startingRelic: relic });
  s.rng = seed; s.encounter = encounter;
  s.draw = shuffle(s, deck); draw(s, catalog.drawPerTurn);
  return s;
}
export function intent(s, enemy) { return enemy.intent[(s.turn - 1) % enemy.intent.length]; }
export function outcome(s) { return s.hp <= 0 ? 'defeat' : s.enemies.every(e => e.hp <= 0) ? 'victory' : 'playing'; }
export function battlePlay(input, options) {
  // Core draw deliberately does not reshuffle. Refill its deck before each draw effect
  // by preparing only the current discard (the resolving card is not yet there).
  // This slice supports starter cards only: its only draw source is relic on x04.
  if (!validBattleState(input)) return { ok: false, reason: 'state', state: structuredClone(input) };
  const s = structuredClone(input);
  const card = catalog.cards.find(c => c.id === s.hand[options.index]);
  if (card?.id === 'x08') return { ok: false, reason: 'reward-not-supported', state: structuredClone(input) };
  const needsRelicDraw = card?.id === 'x04' && !s.mask && s.startingRelic && !s.relicUsed;
  if (needsRelicDraw && !s.draw.length && s.discard.length) { s.draw = shuffle(s, s.discard); s.discard = []; }
  const result = play(s, options);
  return result.ok ? result : { ...result, state: structuredClone(input) };
}
export function advance(input) {
  if (!validBattleState(input)) return structuredClone(input);
  if (input.phase !== 'player' || outcome(input) !== 'playing') return structuredClone(input);
  let s = endTurn(input);
  if (outcome(s) !== 'playing') return s;
  for (const enemy of s.enemies) {
    if (enemy.hp <= 0) continue;
    const damage = intent(s, enemy), absorbed = Math.min(s.block, damage);
    s.block -= absorbed; s.hp = Math.max(0, s.hp - damage + absorbed);
    if (s.hp === 0) return s;
  }
  // Prevent core startTurn drawing separately: adapter owns reshuffling semantics.
  const pile = s.draw; s.draw = []; s = startTurn(s); s.draw = pile;
  draw(s, catalog.drawPerTurn); return s;
}

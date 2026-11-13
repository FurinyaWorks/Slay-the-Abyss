// Deterministic battle adapter: synthetic encounters, not production enemy AI.
import { currentIntent, validIntent } from './intent.mjs';
import { shuffle, drawCards } from './deck.mjs';
import { catalog, state, play, endTurn, startTurn, validState } from './model.mjs';
export const encounters = Object.freeze({
  respite: { label: '整备与重击交替（实验）', enemies: [{ hp: 70, block: 0, intent: [0, 16, 0] }] },
  duel: { label: '单体连续攻击（实验）', enemies: [{ hp: 48, block: 0, intent: [8, 10, 12] }] },
  swarm: { label: '双目标（实验）', enemies: [{ hp: 25, block: 0, intent: [5, 7] }, { hp: 25, block: 0, intent: [7, 5] }] },
  armor: { label: '护甲与爆发（实验）', enemies: [{ hp: 60, block: 12, intent: [4, 16, 6] }] },
});
export function validBattleState(s) {
  return validState(s) && s.deckMode === 'shuffle' && Number.isInteger(s.rng) && s.rng >= 0 && s.rng <= 0xffffffff
    && s.enemies.every(validIntent);
}
export function newBattle({ seed = 1, encounter = 'duel', relic = true, hp = catalog.maxHp, deck = catalog.starter } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !encounters[encounter] || typeof relic !== 'boolean') throw Error('invalid battle setup');
  if (!Number.isInteger(hp) || hp < 1 || hp > catalog.maxHp || !Array.isArray(deck) || !deck.length || deck.length > 100 || deck.some(id => !catalog.cards.some(c => c.id === id))) throw Error('invalid deck or life');
  const s = state({ hp, enemies: encounters[encounter].enemies, startingRelic: relic });
  s.rng = seed; s.deckMode = 'shuffle'; s.encounter = encounter;
  s.draw = shuffle(s, deck); drawCards(s, catalog.drawPerTurn);
  return s;
}
export function intent(s, enemy) { return currentIntent(s,enemy); }
export function outcome(s) { return s.hp <= 0 ? 'defeat' : s.enemies.every(e => e.hp <= 0) ? 'victory' : 'playing'; }
export function battlePlay(input, options) {
  if (!validBattleState(input)) return { ok: false, reason: 'state', state: structuredClone(input) };
  return play(input, options);
}

export function advance(input) {
  if (!validBattleState(input)) return structuredClone(input);
  if (input.phase !== 'player' || outcome(input) !== 'playing') return structuredClone(input);
  let s = endTurn(input);
  if(s.phase !== 'enemy') return structuredClone(input);
  if (outcome(s) !== 'playing') return s;
  for (const enemy of s.enemies) {
    if (enemy.hp <= 0) continue;
    const damage = intent(s, enemy), absorbed = Math.min(s.block, damage);
    s.block -= absorbed; s.hp = Math.max(0, s.hp - damage + absorbed);
    if (s.hp === 0) return s;
  }
  const next=startTurn(s);
  return next.phase==='player'?next:structuredClone(input);
}

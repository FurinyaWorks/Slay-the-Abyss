import { initial, play, endTurn, nextTurn } from './mechanics.mjs';

export const starterRelic = Object.freeze({
  id: 'KQR001', name: '待命名·KQR001', status: 'HOLD',
  effect: Object.freeze({ trigger: 'first_wedge_setup_per_combat', op: 'block', amount: 4 }),
});
export function describeRelic() {
  return `${starterRelic.name}：每场战斗首次设置雷楔后，获得${starterRelic.effect.amount}格挡。`;
}
export const starterIds = Object.freeze(['KQ001','KQ001','KQ001','KQ002','KQ002','KQ002','KQ002','KQ003','KQ003','KQ004']);
function shuffle(cards, seed) {
  const result = [...cards];
  let rng = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    const j = rng % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { cards: result, seed: rng };
}
function draw(state, count) {
  for (let i = 0; i < count && state.hand.length < 10; i++) {
    if (!state.draw.length && state.discard.length) {
      const shuffled = shuffle(state.discard, state.rng);
      state.draw = shuffled.cards;
      state.rng = shuffled.seed;
      state.discard = [];
    }
    if (!state.draw.length) break;
    state.hand.push(state.draw.shift());
  }
}
export function createBattle({ seed = 1, enemies = [{ hp: 50, block: 0, intent: 8 }], relic = true, order = null } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('invalid seed');
  if (typeof relic !== 'boolean') throw new Error('invalid relic flag');
  if (enemies.some(e => !Number.isInteger(e.intent) || e.intent < 0)) throw new Error('invalid intent');
  const deck = starterIds.map((id, i) => ({ instance: `starter-${i}`, id, upgraded: false }));
  if (order && (order.length !== 10 || new Set(order).size !== 10 || order.some(n => !Number.isInteger(n) || n < 0 || n > 9))) throw new Error('invalid order');
  const shuffled = shuffle(deck, seed);
  const state = { ...initial([], enemies), hp: 60, maxHp: 60, phase: 'player', draw: order ? order.map(i => deck[i]) : shuffled.cards, rng: shuffled.seed, relicEnabled: relic, relicUsed: false, log: [] };
  draw(state, 5);
  return state;
}
export function useCard(input, instance, target, options = {}) {
  if (input.phase !== 'player') throw new Error('not player phase');
  const card = input.hand.find(c => c.instance === instance);
  const state = play(input, instance, target, options);
  if (options.cancel) return state;
  const setup = card?.id === 'KQ003' && input.wedgeUntil === null;
  if (setup && state.relicEnabled && !state.relicUsed) {
    state.block += starterRelic.effect.amount;
    state.relicUsed = true;
    state.log.push({ event: starterRelic.effect.trigger, block: starterRelic.effect.amount });
  }
  if (state.enemies.every(e => e.hp === 0)) state.phase = 'won';
  return state;
}
export function finishTurn(input) {
  if (input.phase !== 'player') throw new Error('not player phase');
  let state = endTurn(input);
  for (const enemy of state.enemies) {
    if (!enemy.hp) continue;
    const absorbed = Math.min(state.block, enemy.intent);
    state.block -= absorbed;
    const loss = Math.min(state.hp, enemy.intent - absorbed);
    state.hp -= loss;
    state.log.push({ event: 'enemy_attack', loss });
    if (!state.hp) { state.phase = 'lost'; return state; }
  }
  state = nextTurn(state);
  draw(state, 5);
  return state;
}
// Policies may only inspect this view: never expose draw order or future RNG.
export function playerView(state) {
  return structuredClone({ turn: state.turn, hp: state.hp, energy: state.energy, block: state.block, hand: state.hand, enemies: state.enemies, wedgeUntil: state.wedgeUntil, infusion: state.infusion, phase: state.phase, drawCount: state.draw.length, discardCount: state.discard.length });
}

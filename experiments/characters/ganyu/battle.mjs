// Reproducible, isolated single-encounter harness, not production RNG or a run simulator.
import { initial, validateState, catalogue, rules, startTurn } from './engine.mjs';
function checkSeed(seed) {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) throw new Error('invalid draw seed');
}
function next(state) {
  let x = state.drawSeed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.drawSeed = x >>> 0; return state.drawSeed / 0x100000000;
}
function shuffle(state, cards) {
  for(let i=cards.length-1;i>0;i--) { const j=Math.floor(next(state)*(i+1)); [cards[i],cards[j]]=[cards[j],cards[i]]; }
  return cards;
}
function refill(state, count) {
  for(let i=0;i<count && state.hand.length<rules.handLimit;i++) {
    if (!state.draw.length) {
      if (!state.discard.length) break;
      state.draw = shuffle(state, state.discard.splice(0));
    }
    state.hand.push(state.draw.shift());
  }
}
export function createBattle(enemies, seed=37, deck=catalogue.starting_deck.map(id=>({id})), ordered=false) {
  checkSeed(seed);
  const s=initial(enemies);s.draw=structuredClone(deck);s.drawSeed=seed;
  validateState(s);
  if(!ordered) shuffle(s,s.draw);
  refill(s,rules.drawPerTurn); return s;
}
export function nextBattleTurn(input) {
  checkSeed(input.drawSeed);validateState(input);
  // startTurn supplies phase/energy/block transition; defer draw to this harness.
  const s=structuredClone(input), pile=s.draw;s.draw=[];
  const out=startTurn(s);out.draw=pile;
  refill(out,rules.drawPerTurn);return out;
}

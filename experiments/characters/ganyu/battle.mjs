// Reproducible, isolated single-encounter harness, not production RNG or a run simulator.
import { initial, validateState, catalogue, rules, startTurn } from './engine.mjs';
import { validateDrawSeed,shufflePile,drawCards } from './deck.mjs';
export function createBattle(enemies, seed=37, deck=catalogue.starting_deck.map(id=>({id})), ordered=false) {
  validateDrawSeed(seed);
  const s=initial(enemies);s.draw=structuredClone(deck);s.drawSeed=seed;
  validateState(s);
  if(!ordered) shufflePile(s,s.draw);
  drawCards(s,rules.drawPerTurn,rules.handLimit); return s;
}
export function nextBattleTurn(input) {
  validateDrawSeed(input.drawSeed);validateState(input);
  // startTurn supplies phase/energy/block transition; defer draw to this harness.
  const s=structuredClone(input), pile=s.draw;s.draw=[];
  const out=startTurn(s);out.draw=pile;
  drawCards(out,rules.drawPerTurn,rules.handLimit);return out;
}

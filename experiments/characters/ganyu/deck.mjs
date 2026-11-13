// One draw-only RNG shared by turn draw and card draw. Never used for enemies/rewards.
export function validateDrawSeed(seed) {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) throw new Error('invalid draw seed');
}
function next(state) {
  let x=state.drawSeed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.drawSeed=x>>>0; return state.drawSeed/0x100000000;
}
export function shufflePile(state,cards) {
  validateDrawSeed(state.drawSeed);
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(next(state)*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards;
}
export function drawCards(state,count,handLimit) {
  validateDrawSeed(state.drawSeed);
  for(let i=0;i<count && state.hand.length<handLimit;i++) {
    if(!state.draw.length){if(!state.discard.length)break;state.draw=shufflePile(state,state.discard.splice(0));}
    state.hand.push(state.draw.shift());
  }
}

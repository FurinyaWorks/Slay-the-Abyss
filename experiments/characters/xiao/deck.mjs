// Shared deterministic deck mechanics; the caller owns transactional state cloning.
export function random(s) {
  let t = s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
export function shuffle(s, cards) {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1)); [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function drawCards(s, count) {
  for (let i = 0; i < count && s.hand.length < 10; i++) {
    if (!s.draw.length && s.deckMode === 'shuffle' && s.discard.length) {
      s.draw = shuffle(s, s.discard); s.discard = [];
    }
    if (!s.draw.length) break;
    s.hand.push(s.draw.shift());
  }
}

// Same visible current intention for card conditions, UI and enemy execution.
export function validIntent(enemy) {
  return Array.isArray(enemy.intent) && enemy.intent.length > 0 && Array.from(enemy.intent).every(n=>Number.isSafeInteger(n)&&n>=0);
}
export function currentIntent(s,enemy) {
  if(!validIntent(enemy))throw new TypeError('missing or invalid current intention');
  const reduction=enemy.suppression??0;
  if(!Number.isSafeInteger(reduction)||reduction<0)throw new TypeError('invalid suppression');
  return Math.max(0,enemy.intent[(s.turn-1)%enemy.intent.length]-reduction);
}
